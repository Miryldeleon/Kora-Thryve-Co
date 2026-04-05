import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type BookingAccessRow = {
  id: string
  teacher_id: string
  student_id: string
  status: string
  starts_at: string
}

const EARLY_JOIN_WINDOW_MS = 12 * 60 * 60 * 1000

function hasValidTeacherJoin(teacherJoinedAt: string | null, bookingStartsAt: string) {
  if (!teacherJoinedAt) return false

  const joinedAtMs = new Date(teacherJoinedAt).getTime()
  const startsAtMs = new Date(bookingStartsAt).getTime()

  if (!Number.isFinite(joinedAtMs) || !Number.isFinite(startsAtMs)) return false
  return joinedAtMs >= startsAtMs - EARLY_JOIN_WINDOW_MS
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
    .select('id, teacher_id, student_id, status, starts_at')
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
    user,
    booking,
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
    const { data: teacherAttendance, error: attendanceError } = await supabase
      .from('session_attendance')
      .select('joined_at')
      .eq('booking_id', bookingId)
      .eq('role', 'teacher')
      .order('joined_at', { ascending: false })
      .limit(1)

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message }, { status: 400 })
    }

    const teacherJoinedAt = teacherAttendance?.[0]?.joined_at ?? null
    const teacherHasJoined = hasValidTeacherJoin(teacherJoinedAt, access.booking.starts_at)

    if (process.env.NODE_ENV !== 'production') {
      console.log('[session-attendance][GET]', {
        bookingId,
        requesterRole: access.role,
        teacherJoinedAt,
        bookingStartsAt: access.booking.starts_at,
        teacherHasJoined,
      })
    }

    return NextResponse.json({
      teacherHasJoined,
      teacherJoinedAt,
    })
  } catch {
    return NextResponse.json(
      { error: 'Unable to load session attendance right now.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { bookingId?: string }
    const bookingId = String(body.bookingId ?? '').trim()

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID.' }, { status: 400 })
    }

    const access = await loadAuthorizedBooking(bookingId)
    if ('error' in access) return access.error

    const { supabase, user, role, booking } = access

    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This booking was cancelled. Live session access is unavailable.' },
        { status: 400 }
      )
    }

    if (booking.status === 'completed') {
      return NextResponse.json(
        { error: 'This booking has already been completed.' },
        { status: 400 }
      )
    }

    const joinedAtIso = new Date().toISOString()
    const { error: upsertError } = await supabase.from('session_attendance').upsert(
      {
        booking_id: bookingId,
        user_id: user.id,
        role,
        joined_at: joinedAtIso,
      },
      { onConflict: 'booking_id,user_id' }
    )

    if (upsertError) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[session-attendance][POST] failed', {
          bookingId,
          userId: user.id,
          role,
          joinedAt: joinedAtIso,
          message: upsertError.message,
        })
      }
      return NextResponse.json({ error: upsertError.message }, { status: 400 })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[session-attendance][POST]', {
        bookingId,
        userId: user.id,
        role,
        joinedAt: joinedAtIso,
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Unable to record attendance right now.' },
      { status: 500 }
    )
  }
}
