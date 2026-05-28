import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getBookingTeacherPresenceForUser, recordBookingJoin } from '@/lib/services/attendance-service'
import { jsonError, jsonOk } from '@/lib/request/responses'
import { parseResourceId } from '@/lib/request/validation'

async function requireRequestUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false as const, response: jsonError('Unauthorized.', 401) }
  return { ok: true as const, supabase, user }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const bookingId = parseResourceId(url.searchParams.get('bookingId'), 'booking ID')
    if (!bookingId.ok) return jsonError(bookingId.error, 400)

    const auth = await requireRequestUser()
    if (!auth.ok) return auth.response

    const result = await getBookingTeacherPresenceForUser(auth.supabase, auth.user, bookingId.value)
    if (!result.ok) return jsonError(result.error, result.status)

    return jsonOk(result.data)
  } catch {
    return jsonError('Unable to load session attendance right now.', 500)
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { bookingId?: unknown } | null
    const bookingId = parseResourceId(body?.bookingId, 'booking ID')
    if (!bookingId.ok) return jsonError(bookingId.error, 400)

    const auth = await requireRequestUser()
    if (!auth.ok) return auth.response

    const result = await recordBookingJoin(auth.supabase, auth.user, bookingId.value)
    if (!result.ok) return jsonError(result.error, result.status)

    return jsonOk()
  } catch {
    return jsonError('Unable to record attendance right now.', 500)
  }
}
