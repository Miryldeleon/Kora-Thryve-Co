'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireApprovedStudent } from '@/lib/auth/student'

function toBookingUrl(kind: 'success' | 'error', message: string, teacher?: string) {
  const params = new URLSearchParams({ [kind]: message })
  if (teacher) {
    params.set('teacher', teacher)
  }
  return `/student/booking?${params.toString()}`
}

export async function createBooking(formData: FormData) {
  const { supabase, user } = await requireApprovedStudent()
  const slotId = String(formData.get('slot_id') ?? '').trim()
  const teacherFilter = String(formData.get('teacher_filter') ?? '').trim()

  if (!slotId) {
    redirect(toBookingUrl('error', 'Slot id is required'))
  }

  const { data: slot, error: slotError } = await supabase
    .from('teacher_availability_slots')
    .select('id, teacher_id, teacher_name, starts_at, ends_at, is_booked')
    .eq('id', slotId)
    .single()

  if (slotError || !slot) {
    redirect(toBookingUrl('error', slotError?.message ?? 'Slot not found', teacherFilter))
  }

  if (slot.is_booked) {
    redirect(toBookingUrl('error', 'Slot is already booked', teacherFilter))
  }

  const { data: studentProfile, error: studentError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (studentError) {
    redirect(toBookingUrl('error', studentError.message, teacherFilter))
  }

  const { error: insertError } = await supabase.from('bookings').insert({
    id: crypto.randomUUID(),
    slot_id: slot.id,
    teacher_id: slot.teacher_id,
    teacher_name: slot.teacher_name,
    student_id: user.id,
    student_name: studentProfile.full_name?.trim() || null,
    student_email: user.email || null,
    starts_at: slot.starts_at,
    ends_at: slot.ends_at,
    status: 'confirmed',
  })

  if (insertError) {
    const message =
      insertError.code === '23505'
        ? 'This slot was just booked by someone else.'
        : insertError.message
    redirect(toBookingUrl('error', message, teacherFilter))
  }

  revalidatePath('/student/booking')
  revalidatePath('/teacher/bookings')
  revalidatePath('/teacher/availability')
  redirect(toBookingUrl('success', 'Booking confirmed', teacherFilter))
}
