'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireApprovedTeacher } from '@/lib/auth/teacher'

function toAvailabilityUrl(kind: 'success' | 'error', message: string) {
  const params = new URLSearchParams({ [kind]: message })
  return `/teacher/availability?${params.toString()}`
}

function parseIsoDateTime(input: string) {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export async function createAvailabilitySlot(formData: FormData) {
  const { supabase, user } = await requireApprovedTeacher()
  const startsAtInput = String(formData.get('starts_at') ?? '').trim()
  const endsAtInput = String(formData.get('ends_at') ?? '').trim()

  const startsAt = parseIsoDateTime(startsAtInput)
  const endsAt = parseIsoDateTime(endsAtInput)

  if (!startsAt || !endsAt) {
    redirect(toAvailabilityUrl('error', 'Start and end time are required'))
  }

  if (new Date(endsAt) <= new Date(startsAt)) {
    redirect(toAvailabilityUrl('error', 'End time must be after start time'))
  }

  if (new Date(startsAt) <= new Date()) {
    redirect(toAvailabilityUrl('error', 'Slot must be in the future'))
  }

  const { data: teacherProfile, error: teacherError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (teacherError) {
    redirect(toAvailabilityUrl('error', teacherError.message))
  }

  const { error: insertError } = await supabase
    .from('teacher_availability_slots')
    .insert({
      id: crypto.randomUUID(),
      teacher_id: user.id,
      teacher_name: teacherProfile.full_name?.trim() || null,
      starts_at: startsAt,
      ends_at: endsAt,
    })

  if (insertError) {
    redirect(toAvailabilityUrl('error', insertError.message))
  }

  revalidatePath('/teacher/availability')
  revalidatePath('/student/booking')
  redirect(toAvailabilityUrl('success', 'Availability slot created'))
}

export async function deleteAvailabilitySlot(formData: FormData) {
  const { supabase, user } = await requireApprovedTeacher()
  const slotId = String(formData.get('slot_id') ?? '').trim()

  if (!slotId) {
    redirect(toAvailabilityUrl('error', 'Slot id is required'))
  }

  const { error } = await supabase
    .from('teacher_availability_slots')
    .delete()
    .eq('id', slotId)
    .eq('teacher_id', user.id)
    .eq('is_booked', false)

  if (error) {
    redirect(toAvailabilityUrl('error', error.message))
  }

  revalidatePath('/teacher/availability')
  revalidatePath('/student/booking')
  redirect(toAvailabilityUrl('success', 'Availability slot removed'))
}
