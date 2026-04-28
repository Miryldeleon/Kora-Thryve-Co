import { NextResponse } from 'next/server'
import {
  EMPTY_TEACHING_ANNOTATIONS,
  type LessonState,
  type TeachingAnnotations,
  isLessonState,
  isTeachingAnnotations,
} from '@/lib/session/teaching-state'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type BookingAccessRow = {
  id: string
  teacher_id: string
  student_id: string
  status: string
}

type TeachingStateRow = {
  lesson: LessonState | null
  whiteboard_snapshot: string | null
  annotations: TeachingAnnotations | null
}

async function loadAuthorizedBooking(bookingId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  const { data: bookingData, error: bookingError } = await supabase
    .from('bookings')
    .select('id, teacher_id, student_id, status')
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingError || !bookingData) {
    return { error: NextResponse.json({ error: 'Booking not found.' }, { status: 404 }) }
  }

  const booking = bookingData as BookingAccessRow
  const isTeacher = booking.teacher_id === user.id
  const isStudent = booking.student_id === user.id

  if (!isTeacher && !isStudent) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }

  return {
    supabase,
    booking,
    user,
    role: isTeacher ? ('teacher' as const) : ('student' as const),
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const bookingId = url.searchParams.get('bookingId')?.trim() ?? ''

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID.' }, { status: 400 })
    }

    const access = await loadAuthorizedBooking(bookingId)
    if ('error' in access) return access.error

    const { supabase } = access
    const { data: stateData, error: stateError } = await supabase
      .from('session_teaching_state')
      .select('lesson, whiteboard_snapshot, annotations')
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (stateError) {
      return NextResponse.json({ error: stateError.message }, { status: 400 })
    }

    const state = stateData as TeachingStateRow | null
    return NextResponse.json({
      lesson: state?.lesson ?? null,
      whiteboardSnapshot: state?.whiteboard_snapshot ?? null,
      annotations: state?.annotations ?? EMPTY_TEACHING_ANNOTATIONS,
    })
  } catch {
    return NextResponse.json({ error: 'Unable to load teaching state right now.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      bookingId?: string
      lesson?: unknown
      whiteboardSnapshot?: string | null
      annotations?: unknown
    }
    const bookingId = String(body.bookingId ?? '').trim()

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID.' }, { status: 400 })
    }

    if (!isLessonState(body.lesson)) {
      return NextResponse.json({ error: 'Invalid teaching state.' }, { status: 400 })
    }

    if (body.annotations !== undefined && !isTeachingAnnotations(body.annotations)) {
      return NextResponse.json({ error: 'Invalid annotation state.' }, { status: 400 })
    }

    const access = await loadAuthorizedBooking(bookingId)
    if ('error' in access) return access.error

    const { supabase, booking, role, user } = access
    if (role !== 'teacher') {
      return NextResponse.json({ error: 'Only the teacher can control teaching tools.' }, { status: 403 })
    }

    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Teaching tools can only be controlled for confirmed sessions.' },
        { status: 400 }
      )
    }

    const { error: saveError } = await supabase.from('session_teaching_state').upsert(
      {
        booking_id: bookingId,
        lesson: body.lesson,
        whiteboard_snapshot: body.whiteboardSnapshot ?? null,
        annotations: body.annotations ?? EMPTY_TEACHING_ANNOTATIONS,
        updated_by: user.id,
      },
      { onConflict: 'booking_id' }
    )

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unable to save teaching state right now.' }, { status: 500 })
  }
}
