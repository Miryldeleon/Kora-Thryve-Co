'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireApprovedTeacher } from '@/lib/auth/teacher'

function toFeedbackUrl(
  returnTo: string,
  kind: 'success' | 'error',
  message: string
) {
  const params = new URLSearchParams({ [kind]: message })
  return `${returnTo}?${params.toString()}`
}

async function updateBookingStatus(formData: FormData, nextStatus: 'completed' | 'cancelled') {
  const { supabase, user } = await requireApprovedTeacher()
  const bookingId = String(formData.get('booking_id') ?? '').trim()
  const returnToRaw = String(formData.get('return_to') ?? '/teacher/bookings').trim()
  const returnTo = returnToRaw.startsWith('/teacher/') ? returnToRaw : '/teacher/bookings'

  if (!bookingId) {
    redirect(toFeedbackUrl(returnTo, 'error', 'Booking id is required'))
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, teacher_id, status')
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingError || !booking) {
    redirect(toFeedbackUrl(returnTo, 'error', bookingError?.message || 'Booking not found'))
  }

  if (booking.teacher_id !== user.id) {
    redirect(toFeedbackUrl(returnTo, 'error', 'Only the assigned teacher can update this booking'))
  }

  if (booking.status !== 'confirmed') {
    redirect(toFeedbackUrl(returnTo, 'error', 'Only confirmed bookings can be updated'))
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: nextStatus })
    .eq('id', bookingId)

  if (error) {
    redirect(toFeedbackUrl(returnTo, 'error', error.message))
  }

  revalidatePath('/teacher/bookings')
  revalidatePath('/teacher/sessions')
  revalidatePath('/teacher/availability')
  revalidatePath('/teacher/dashboard')
  revalidatePath('/student/booking')
  revalidatePath('/student/sessions')
  revalidatePath('/student/dashboard')
  revalidatePath(`/session/${bookingId}`)
  redirect(toFeedbackUrl(returnTo, 'success', `Booking marked as ${nextStatus}`))
}

export async function markBookingCompleted(formData: FormData) {
  await updateBookingStatus(formData, 'completed')
}

export async function cancelBooking(formData: FormData) {
  await updateBookingStatus(formData, 'cancelled')
}
