import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getBookingNotesForUser,
  saveBookingNotesForTeacher,
} from '@/lib/services/live-session-service'
import { jsonError, jsonOk } from '@/lib/request/responses'
import { parseNotes, parseResourceId } from '@/lib/request/validation'

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

    const result = await getBookingNotesForUser(auth.supabase, auth.user, bookingId.value)
    if (!result.ok) return jsonError(result.error, result.status)

    return jsonOk({ notes: result.data.notes })
  } catch {
    return jsonError('Unable to load notes right now.', 500)
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { bookingId?: unknown; notes?: unknown }
      | null
    const bookingId = parseResourceId(body?.bookingId, 'booking ID')
    if (!bookingId.ok) return jsonError(bookingId.error, 400)

    const notes = parseNotes(body?.notes)
    if (!notes.ok) return jsonError(notes.error, 400)

    const auth = await requireRequestUser()
    if (!auth.ok) return auth.response

    const result = await saveBookingNotesForTeacher(auth.supabase, auth.user, {
      bookingId: bookingId.value,
      notes: notes.value,
    })
    if (!result.ok) return jsonError(result.error, result.status)

    return jsonOk({ notes: result.data.notes })
  } catch {
    return jsonError('Unable to save notes right now.', 500)
  }
}
