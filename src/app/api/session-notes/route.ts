import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const bookingId = url.searchParams.get('bookingId')?.trim() ?? ''

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, teacher_id, student_id')
      .eq('id', bookingId)
      .maybeSingle()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    const canAccess = user.id === booking.teacher_id || user.id === booking.student_id
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const { data: notesData, error: notesError } = await supabase
      .from('session_notes')
      .select('notes')
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (notesError) {
      return NextResponse.json({ error: notesError.message }, { status: 400 })
    }

    return NextResponse.json({ notes: notesData?.notes ?? '' })
  } catch {
    return NextResponse.json({ error: 'Unable to load notes right now.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { bookingId?: string; notes?: string }
    const bookingId = String(body.bookingId ?? '').trim()
    const notes = String(body.notes ?? '')

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID.' }, { status: 400 })
    }

    if (notes.length > 20000) {
      return NextResponse.json({ error: 'Notes are too long' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, teacher_id, status')
      .eq('id', bookingId)
      .maybeSingle()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    if (booking.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Only the teacher can edit notes' }, { status: 403 })
    }

    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Notes can only be edited for confirmed sessions' },
        { status: 400 }
      )
    }

    const { error: upsertError } = await supabase.from('session_notes').upsert(
      {
        booking_id: bookingId,
        notes,
        updated_by: user.id,
      },
      { onConflict: 'booking_id' }
    )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, notes })
  } catch {
    return NextResponse.json({ error: 'Unable to save notes right now.' }, { status: 500 })
  }
}
