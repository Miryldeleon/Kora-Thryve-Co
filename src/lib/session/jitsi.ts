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
  return {
    // Keep public embed config in NEXT_PUBLIC_* vars.
    // Fallback keeps current MVP behavior working without extra setup.
    domain: (process.env.NEXT_PUBLIC_JITSI_DOMAIN ?? '').trim() || 'meet.jit.si',
    appId: (process.env.NEXT_PUBLIC_JITSI_APP_ID ?? '').trim() || null,
    roomPrefix: (process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX ?? '').trim() || null,
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
