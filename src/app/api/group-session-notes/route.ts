import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getGroupSessionNotesForUser,
  saveGroupSessionNotesForTeacher,
} from '@/lib/services/live-session-service'
import { jsonError, jsonOk } from '@/lib/request/responses'
import { parseNotes, parseResourceId } from '@/lib/request/validation'

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

    const result = await getGroupSessionNotesForUser(auth.supabase, sessionId.value)
    if (!result.ok) return jsonError(result.error, result.status)

    return jsonOk({ notes: result.data.notes })
  } catch {
    return jsonError('Unable to load notes right now.', 500)
  }
}

async function saveGroupSessionNotes(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { sessionId?: unknown; notes?: unknown }
      | null
    const sessionId = parseResourceId(body?.sessionId, 'session ID')
    if (!sessionId.ok) return jsonError(sessionId.error, 400)

    const notes = parseNotes(body?.notes)
    if (!notes.ok) return jsonError(notes.error, 400)

    const auth = await requireRequestUser()
    if (!auth.ok) return auth.response

    const result = await saveGroupSessionNotesForTeacher(auth.supabase, {
      sessionId: sessionId.value,
      notes: notes.value,
    })
    if (!result.ok) return jsonError(result.error, result.status)

    return jsonOk({ notes: result.data.notes })
  } catch {
    return jsonError('Unable to save notes right now.', 500)
  }
}

export async function POST(request: Request) {
  return saveGroupSessionNotes(request)
}

export async function PUT(request: Request) {
  return saveGroupSessionNotes(request)
}

export async function PATCH(request: Request) {
  return saveGroupSessionNotes(request)
}
