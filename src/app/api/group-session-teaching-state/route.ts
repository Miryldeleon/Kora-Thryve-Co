import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type LessonState = {
  surface: 'materials' | 'whiteboard'
  moduleId: string | null
  page: number
  zoom: number
  scrollTopRatio: number
  scrollLeftRatio: number
}

type GroupSessionAccessRow = {
  session_id: string
  status: 'scheduled' | 'completed' | 'cancelled' | string
  access_role: 'teacher' | 'student' | string
}

type TeachingStateRow = {
  lesson: LessonState | null
  whiteboard_snapshot: string | null
}

function isLessonState(value: unknown): value is LessonState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LessonState>
  return (
    (candidate.surface === 'materials' || candidate.surface === 'whiteboard') &&
    (typeof candidate.moduleId === 'string' || candidate.moduleId === null) &&
    typeof candidate.page === 'number' &&
    typeof candidate.zoom === 'number' &&
    typeof candidate.scrollTopRatio === 'number' &&
    typeof candidate.scrollLeftRatio === 'number'
  )
}

async function loadAuthorizedGroupSession(sessionId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  const { data: sessionData, error: sessionError } = await supabase
    .rpc('get_group_session_room_access', { target_session_id: sessionId })
    .maybeSingle()

  if (sessionError || !sessionData) {
    return { error: NextResponse.json({ error: 'Group session not found.' }, { status: 404 }) }
  }

  const session = sessionData as GroupSessionAccessRow
  if (session.access_role !== 'teacher' && session.access_role !== 'student') {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }

  return {
    supabase,
    session,
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')?.trim() ?? ''

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID.' }, { status: 400 })
    }

    const access = await loadAuthorizedGroupSession(sessionId)
    if ('error' in access) return access.error

    const { supabase } = access
    const { data: stateData, error: stateError } = await supabase
      .rpc('get_group_session_teaching_state', { target_session_id: sessionId })
      .maybeSingle()

    if (stateError) {
      return NextResponse.json({ error: stateError.message }, { status: 400 })
    }

    const state = stateData as TeachingStateRow | null
    return NextResponse.json({
      lesson: state?.lesson ?? null,
      whiteboardSnapshot: state?.whiteboard_snapshot ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Unable to load teaching state right now.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: string
      lesson?: unknown
      whiteboardSnapshot?: string | null
    }
    const sessionId = String(body.sessionId ?? '').trim()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID.' }, { status: 400 })
    }

    if (!isLessonState(body.lesson)) {
      return NextResponse.json({ error: 'Invalid teaching state.' }, { status: 400 })
    }

    const access = await loadAuthorizedGroupSession(sessionId)
    if ('error' in access) return access.error

    const { supabase, session } = access
    if (session.access_role !== 'teacher') {
      return NextResponse.json({ error: 'Only the teacher can control teaching tools.' }, { status: 403 })
    }

    if (session.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Teaching tools can only be controlled for scheduled group sessions.' },
        { status: 400 }
      )
    }

    const { error: saveError } = await supabase.rpc('save_group_session_teaching_state', {
      target_session_id: sessionId,
      next_lesson: body.lesson,
      next_whiteboard_snapshot: body.whiteboardSnapshot ?? null,
    })

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unable to save teaching state right now.' }, { status: 500 })
  }
}
