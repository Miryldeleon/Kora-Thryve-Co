import 'server-only'
import crypto from 'node:crypto'

type JitsiTokenContext = {
  bookingId: string
  userId: string
  role: 'teacher' | 'student'
  displayName: string
  roomName: string
  roomPrefix?: string | null
}

export type JitsiPublicConfig = {
  domain: string
  appId: string | null
  roomPrefix: string | null
}

export function getJitsiPublicConfig(): JitsiPublicConfig {
  const configuredDomain = (process.env.NEXT_PUBLIC_JITSI_DOMAIN ?? '').trim()
  const configuredAppId = (process.env.NEXT_PUBLIC_JITSI_APP_ID ?? '').trim()
  const configuredRoomPrefix = (process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX ?? '').trim()

  return {
    // Keep public embed config in NEXT_PUBLIC_* vars.
    // `8x8.vc` + `NEXT_PUBLIC_JITSI_APP_ID` enables JaaS mode.
    // Fallback `meet.jit.si` remains available for pure public mode.
    domain: configuredDomain || 'meet.jit.si',
    appId: configuredAppId || null,
    roomPrefix: configuredRoomPrefix || null,
  }
}

function normalizeRoomName(roomName: string) {
  return roomName
    .replace(/[^a-zA-Z0-9/_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160)
}

function normalizeDisplayName(displayName: string) {
  const clean = displayName.replace(/\s+/g, ' ').trim()
  if (!clean) return 'Kora Thryve Participant'
  return clean.slice(0, 60)
}

function buildRoomWithPrefix(roomName: string, roomPrefix?: string | null) {
  const safeRoom = normalizeRoomName(roomName)
  if (!roomPrefix) return safeRoom
  return `${normalizeRoomName(roomPrefix)}-${safeRoom}`.slice(0, 160)
}

function base64Url(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8')
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function normalizePrivateKey(privateKeyRaw: string) {
  return privateKeyRaw
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
}

function privateKeyDiagnostics(privateKey: string) {
  return {
    startsWithBegin: privateKey.startsWith('-----BEGIN PRIVATE KEY-----'),
    endsWithEnd: privateKey.endsWith('-----END PRIVATE KEY-----'),
    length: privateKey.length,
  }
}

function signJwtRs256(payload: Record<string, unknown>, kid: string, privateKey: string) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid,
  }

  const encodedHeader = base64Url(JSON.stringify(header))
  const encodedPayload = base64Url(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsignedToken)
  signer.end()

  const keyObject = crypto.createPrivateKey({ key: privateKey, format: 'pem' })
  const signature = signer.sign(keyObject)
  return `${unsignedToken}.${base64Url(signature)}`
}

export async function getFutureJitsiAuthToken(
  context: JitsiTokenContext
): Promise<string | null> {
  const publicConfig = getJitsiPublicConfig()
  const isHostedMode = publicConfig.domain === '8x8.vc' || Boolean(publicConfig.appId)

  if (!isHostedMode) {
    return null
  }

  const appId = publicConfig.appId
  if (!appId) {
    throw new Error('Missing NEXT_PUBLIC_JITSI_APP_ID for 8x8/JaaS mode.')
  }

  const keyId = (process.env.JITSI_KEY_ID ?? '').trim()
  const privateKeyRaw = process.env.JITSI_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? ''
  const privateKey = normalizePrivateKey(privateKeyRaw)
  const audience = 'jitsi'
  const issuer = 'chat'
  const ttlSeconds = Number(process.env.JITSI_TOKEN_TTL_SECONDS ?? '7200')

  if (!keyId) {
    throw new Error('Missing JITSI_KEY_ID for 8x8/JaaS token generation.')
  }
  if (!privateKey) {
    throw new Error('Missing JITSI_PRIVATE_KEY for 8x8/JaaS token generation.')
  }
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('Invalid JITSI_TOKEN_TTL_SECONDS; expected a positive number.')
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const jwtRoom = buildRoomWithPrefix(context.roomName, context.roomPrefix)
  const moderator = context.role === 'teacher' ? 'true' : 'false'
  const jwtPayload = {
    aud: audience,
    iss: issuer,
    sub: appId,
    room: jwtRoom,
    nbf: nowSeconds - 10,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
    context: {
      user: {
        id: context.userId,
        name: normalizeDisplayName(context.displayName),
        moderator,
      },
      room: {
        regex: false,
      },
      features: {
        livestreaming: 'false',
        recording: 'false',
        transcription: 'false',
        'sip-inbound-call': 'false',
        'sip-outbound-call': 'false',
        'inbound-call': 'false',
        'outbound-call': 'false',
        'file-upload': 'false',
        'list-visitors': 'false',
      },
    },
  }

  if (process.env.NODE_ENV !== 'production') {
    const keyDiagnostics = privateKeyDiagnostics(privateKey)
    console.log('[jitsi-token] token request', {
      bookingId: context.bookingId,
      userId: context.userId,
      role: context.role,
      domain: publicConfig.domain,
      appId,
      kid: keyId,
      sub: appId,
      room: jwtRoom,
      moderator,
      keyDiagnostics,
    })
  }

  try {
    const token = signJwtRs256(jwtPayload, keyId, privateKey)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[jitsi-token] token generation success', {
        bookingId: context.bookingId,
        role: context.role,
        kid: keyId,
        sub: appId,
        room: jwtRoom,
        moderator,
        tokenPresent: Boolean(token),
      })
    }
    return token
  } catch (error) {
    const keyDiagnostics = privateKeyDiagnostics(privateKey)
    console.log('[jitsi-token] token generation failed', {
      bookingId: context.bookingId,
      role: context.role,
      message: error instanceof Error ? error.message : 'Unknown token signing error',
      keyDiagnostics,
    })
    throw error
  }
}
