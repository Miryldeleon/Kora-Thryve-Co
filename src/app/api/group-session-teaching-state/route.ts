import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  getGroupSessionTeachingStateForUser,
  saveGroupSessionTeachingStateForTeacher,
} from '@/lib/services/live-session-service'
import { jsonError, jsonOk } from '@/lib/request/responses'
import { parseResourceId, sanitizeText } from '@/lib/request/validation'
import { isLessonState, isTeachingAnnotations } from '@/lib/session/teaching-state'

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

    const result = await getGroupSessionTeachingStateForUser(auth.supabase, sessionId.value)
    if (!result.ok) return jsonError(result.error, result.status)

    return jsonOk(result.data)
  } catch {
    return jsonError('Unable to load teaching state right now.', 500)
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          sessionId?: unknown
          lesson?: unknown
          whiteboardSnapshot?: unknown
          annotations?: unknown
        }
      | null
    const sessionId = parseResourceId(body?.sessionId, 'session ID')
    if (!sessionId.ok) return jsonError(sessionId.error, 400)

    if (!isLessonState(body?.lesson)) {
      return jsonError('Invalid teaching state.', 400)
    }

    if (body?.annotations !== undefined && !isTeachingAnnotations(body.annotations)) {
      return jsonError('Invalid annotation state.', 400)
    }

    const whiteboardSnapshot =
      typeof body?.whiteboardSnapshot === 'string'
        ? sanitizeText(body.whiteboardSnapshot, { maxLength: 750000, trim: false })
        : null

    const auth = await requireRequestUser()
    if (!auth.ok) return auth.response

    const result = await saveGroupSessionTeachingStateForTeacher(auth.supabase, {
      sessionId: sessionId.value,
      lesson: body.lesson,
      whiteboardSnapshot,
      annotations: body.annotations,
    })
    if (!result.ok) return jsonError(result.error, result.status)

    return jsonOk()
  } catch {
    return jsonError('Unable to save teaching state right now.', 500)
  }
}
