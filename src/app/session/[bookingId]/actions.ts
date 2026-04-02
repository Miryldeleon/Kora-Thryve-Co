'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function toSessionUrl(bookingId: string, kind: 'notes' | 'notesError', message: string) {
  const params = new URLSearchParams({ [kind]: message })
  return `/session/${bookingId}?${params.toString()}`
}

export async function saveSessionNotes(formData: FormData) {
  const bookingId = String(formData.get('booking_id') ?? '').trim()
  const notes = String(formData.get('notes') ?? '')

  if (!bookingId) {
    redirect('/teacher/bookings')
  }

  if (notes.length > 20000) {
    redirect(toSessionUrl(bookingId, 'notesError', 'Notes are too long'))
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, teacher_id, status')
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingError || !booking) {
    redirect('/teacher/bookings')
  }

  if (booking.teacher_id !== user.id) {
    redirect(toSessionUrl(bookingId, 'notesError', 'Only the teacher can edit notes'))
  }

  if (booking.status !== 'confirmed') {
    redirect(toSessionUrl(bookingId, 'notesError', 'Notes can only be edited for confirmed sessions'))
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
    redirect(toSessionUrl(bookingId, 'notesError', upsertError.message))
  }

  revalidatePath(`/session/${bookingId}`)
  redirect(toSessionUrl(bookingId, 'notes', 'saved'))
}
