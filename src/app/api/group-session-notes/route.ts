import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type GroupSessionAccessRow = {
  session_id: string
  status: 'scheduled' | 'completed' | 'cancelled' | string
  access_role: 'teacher' | 'student' | string
}

type GroupSessionNotesRow = {
  notes: string
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
    user,
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
    const { data: notesData, error: notesError } = await supabase
      .rpc('get_group_session_notes', { target_session_id: sessionId })
      .maybeSingle()

    if (notesError) {
      return NextResponse.json({ error: notesError.message }, { status: 400 })
    }

    const noteRow = notesData as GroupSessionNotesRow | null

    return NextResponse.json({ notes: noteRow?.notes ?? '' })
  } catch {
    return NextResponse.json({ error: 'Unable to load notes right now.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string; notes?: string }
    const sessionId = String(body.sessionId ?? '').trim()
    const notes = String(body.notes ?? '')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID.' }, { status: 400 })
    }

    if (notes.length > 20000) {
      return NextResponse.json({ error: 'Notes are too long' }, { status: 400 })
    }

    const access = await loadAuthorizedGroupSession(sessionId)
    if ('error' in access) return access.error

    const { supabase, session } = access

    if (session.access_role !== 'teacher') {
      return NextResponse.json({ error: 'Only the teacher can edit notes' }, { status: 403 })
    }

    if (session.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Notes can only be edited for scheduled group sessions' },
        { status: 400 }
      )
    }

    const { error: upsertError } = await supabase.rpc('save_group_session_notes', {
      target_session_id: sessionId,
      next_notes: notes,
    })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, notes })
  } catch {
    return NextResponse.json({ error: 'Unable to save notes right now.' }, { status: 500 })
  }
}
