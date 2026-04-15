import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

type GroupSessionAccessRow = {
  id: string
  template_id: string
  teacher_id: string
  status: 'scheduled' | 'completed' | 'cancelled' | string
  is_active: boolean
}

type GroupSessionAttendanceRow = {
  joined_at: string
}

function createAdminClientOrNull() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function loadAuthorizedGroupSession(sessionId: string) {
  const supabase = await createServerSupabaseClient()
  const adminClient = createAdminClientOrNull()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  const sessionQuery = adminClient ?? supabase
  const { data: sessionData, error: sessionError } = await sessionQuery
    .from('group_class_sessions')
    .select('id, template_id, teacher_id, status, is_active')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError || !sessionData) {
    return { error: NextResponse.json({ error: 'Group session not found.' }, { status: 404 }) }
  }

  const session = sessionData as GroupSessionAccessRow
  if (!session.is_active) {
    return {
      error: NextResponse.json(
        { error: 'This group session is inactive and cannot be opened.' },
        { status: 400 }
      ),
    }
  }

  const isTeacher = session.teacher_id === user.id
  if (isTeacher) {
    return {
      supabase,
      user,
      session,
      role: 'teacher' as const,
    }
  }

  const enrollmentQuery = adminClient ?? supabase
  const { data: enrollmentData, error: enrollmentError } = await enrollmentQuery
    .from('group_class_enrollments')
    .select('id')
    .eq('template_id', session.template_id)
    .eq('student_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (enrollmentError || !enrollmentData) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }

  return {
    supabase,
    user,
    session,
    role: 'student' as const,
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
    const { data: teacherAttendance, error: attendanceError } = await supabase
      .from('group_class_session_attendance')
      .select('joined_at')
      .eq('session_id', sessionId)
      .eq('role', 'teacher')
      .order('joined_at', { ascending: false })
      .limit(1)

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message }, { status: 400 })
    }

    const teacherJoinedAt = (teacherAttendance as GroupSessionAttendanceRow[] | null)?.[0]?.joined_at ?? null
    const teacherHasJoined = Boolean(teacherJoinedAt)

    return NextResponse.json({
      teacherHasJoined,
      teacherJoinedAt,
    })
  } catch {
    return NextResponse.json(
      { error: 'Unable to load group session attendance right now.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string }
    const sessionId = String(body.sessionId ?? '').trim()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID.' }, { status: 400 })
    }

    const access = await loadAuthorizedGroupSession(sessionId)
    if ('error' in access) return access.error

    const { supabase, user, role, session } = access

    if (session.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This group session was cancelled. Live access is unavailable.' },
        { status: 400 }
      )
    }

    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'This group session has already been completed.' },
        { status: 400 }
      )
    }

    const joinedAtIso = new Date().toISOString()
    const { error: upsertError } = await supabase.from('group_class_session_attendance').upsert(
      {
        session_id: sessionId,
        user_id: user.id,
        role,
        joined_at: joinedAtIso,
      },
      { onConflict: 'session_id,user_id' }
    )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Unable to record group attendance right now.' },
      { status: 500 }
    )
  }
}
