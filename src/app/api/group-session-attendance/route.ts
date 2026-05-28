import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getGroupSessionTeacherPresenceForUser,
  recordGroupSessionJoin,
} from '@/lib/services/attendance-service'
import { jsonError, jsonOk } from '@/lib/request/responses'
import { parseResourceId } from '@/lib/request/validation'

async function requireRequestUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false as const, response: jsonError('Unauthorized.', 401) }
  return { ok: true as const, supabase }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const sessionId = parseResourceId(url.searchParams.get('sessionId'), 'session ID')
    if (!sessionId.ok) return jsonError(sessionId.error, 400)

    const auth = await requireRequestUser()
    if (!auth.ok) return auth.response

    const result = await getGroupSessionTeacherPresenceForUser(auth.supabase, sessionId.value)
    if (!result.ok) return jsonError(result.error, result.status)

    return jsonOk(result.data)
  } catch {
    return jsonError('Unable to load group session attendance right now.', 500)
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { sessionId?: unknown } | null
    const sessionId = parseResourceId(body?.sessionId, 'session ID')
    if (!sessionId.ok) return jsonError(sessionId.error, 400)

    const auth = await requireRequestUser()
    if (!auth.ok) return auth.response

    const result = await recordGroupSessionJoin(auth.supabase, sessionId.value)
    if (!result.ok) return jsonError(result.error, result.status)

    return jsonOk()
  } catch {
    return jsonError('Unable to record group attendance right now.', 500)
  }
}
