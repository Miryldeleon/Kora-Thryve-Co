type JitsiTokenContext = {
  bookingId: string
  userId: string
  role: 'teacher' | 'student'
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

  // MVP public mode safeguard:
  // If the config points to hosted/JaaS mode (8x8.vc + appId) but no JWT issuer
  // is implemented yet, force plain meet.jit.si so hosts aren't redirected into
  // Jitsi's login/moderator flow.
  const shouldForcePublicMode =
    (configuredDomain === '8x8.vc' || configuredAppId.length > 0) &&
    process.env.NEXT_PUBLIC_JITSI_ALLOW_HOSTED_AUTH !== 'true'

  if (shouldForcePublicMode) {
    return {
      domain: 'meet.jit.si',
      appId: null,
      roomPrefix: configuredRoomPrefix || null,
    }
  }

  return {
    // Keep public embed config in NEXT_PUBLIC_* vars.
    // Fallback keeps current MVP behavior working without extra setup.
    domain: configuredDomain || 'meet.jit.si',
    appId: configuredAppId || null,
    roomPrefix: configuredRoomPrefix || null,
  }
}

export async function getFutureJitsiAuthToken(
  context: JitsiTokenContext
): Promise<string | null> {
  void context
  // MVP mode: no hosted/JaaS token is issued yet.
  // Future secure path:
  // 1) Validate booking/participant server-side (already done by session page guards).
  // 2) Call your private signing service or provider SDK with server-side credentials.
  // 3) Return short-lived JWT here and pass it to the client embed.
  return null
}
