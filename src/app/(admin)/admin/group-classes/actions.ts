'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'node:crypto'
import { requireAdminAccess } from '@/lib/auth/admin'
import { getTodayIsoDateForTimezone } from '@/lib/group-classes/date'
import { generateUpcomingGroupClassSessions } from '@/lib/group-classes/generation'

function resolveGroupClassesReturnPath(formData: FormData) {
  const raw = String(formData.get('return_to') ?? '').trim()
  if (raw.length === 0) return '/admin/group-classes'
  if (raw.startsWith('/admin/group-classes') === false) return '/admin/group-classes'
  return raw
}

function toResultUrl(returnPath: string, kind: 'success' | 'error', message: string) {
  const separator = returnPath.includes('?') ? '&' : '?'
  return returnPath + separator + new URLSearchParams({ [kind]: message }).toString()
}

function parseInteger(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (Number.isFinite(parsed) === false) return null
  return parsed
}

function parseTimeToMinutes(value: string) {
  const [hourRaw, minuteRaw] = value.split(':')
  const hour = Number.parseInt(hourRaw ?? '', 10)
  const minute = Number.parseInt(minuteRaw ?? '', 10)

  if (Number.isFinite(hour) === false || Number.isFinite(minute) === false) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

  return hour * 60 + minute
}

function parseId(value: FormDataEntryValue | null) {
  return String(value ?? '').trim()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function createRecurringClass(formData: FormData) {
  const { supabase, user } = await requireAdminAccess()
  const returnPath = resolveGroupClassesReturnPath(formData)

  const title = String(formData.get('title') ?? '').trim()
  const teacherId = String(formData.get('teacher_id') ?? '').trim()
  const descriptionRaw = String(formData.get('description') ?? '').trim()
  const weekday = parseInteger(formData.get('weekday'))
  const selectedWeeks = Array.from(
    new Set(
      formData
        .getAll('week_of_months')
        .map((value) => parseInteger(value))
        .filter((value): value is number => value !== null && value >= 1 && value <= 5)
    )
  ).sort((a, b) => a - b)
  const startTimeLocal = String(formData.get('start_time_local') ?? '').trim()
  const endTimeLocal = String(formData.get('end_time_local') ?? '').trim()
  const effectiveFrom = String(formData.get('effective_from') ?? '').trim()
  const effectiveToRaw = String(formData.get('effective_to') ?? '').trim()
  const timezone = String(formData.get('timezone') ?? '').trim() || 'Asia/Manila'

  const selectedStudentIds = Array.from(
    new Set(
      formData
        .getAll('student_ids')
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0 && isUuid(value))
    )
  )

  if (title.length === 0) {
    redirect(toResultUrl(returnPath, 'error', 'Class name is required'))
  }

  if (teacherId.length === 0) {
    redirect(toResultUrl(returnPath, 'error', 'Assigned teacher is required'))
  }

  if (weekday === null || weekday < 0 || weekday > 6) {
    redirect(toResultUrl(returnPath, 'error', 'Weekday must be between 0 (Sunday) and 6 (Saturday)'))
  }

  if (selectedWeeks.length === 0) {
    redirect(toResultUrl(returnPath, 'error', 'Select at least one week of month'))
  }

  if (startTimeLocal.length === 0 || endTimeLocal.length === 0) {
    redirect(toResultUrl(returnPath, 'error', 'Start and end time are required'))
  }

  const startMinutes = parseTimeToMinutes(startTimeLocal)
  const endMinutes = parseTimeToMinutes(endTimeLocal)

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    redirect(toResultUrl(returnPath, 'error', 'End time must be later than start time'))
  }

  if (effectiveFrom.length === 0) {
    redirect(toResultUrl(returnPath, 'error', 'Effective from date is required'))
  }

  if (effectiveToRaw.length > 0 && effectiveToRaw < effectiveFrom) {
    redirect(toResultUrl(returnPath, 'error', 'Effective to date cannot be earlier than effective from'))
  }

  const durationMinutes = endMinutes - startMinutes

  const { data: templateRow, error: templateError } = await supabase
    .from('group_class_templates')
    .insert({
      title,
      teacher_id: teacherId,
      description: descriptionRaw || null,
      duration_minutes: durationMinutes,
      timezone,
      created_by_admin: user.id,
      is_active: true,
    })
    .select('id')
    .single()

  if (templateError || templateRow === null) {
    redirect(toResultUrl(returnPath, 'error', templateError?.message ?? 'Unable to create recurring class'))
  }

  const templateId = templateRow.id

  const recurrenceRows = selectedWeeks.map((weekOfMonth) => ({
    template_id: templateId,
    rule_type: 'monthly_nth_weekday',
    weekday,
    week_of_month: weekOfMonth,
    start_time_local: startTimeLocal,
    end_time_local: endTimeLocal,
    effective_from: effectiveFrom,
    effective_to: effectiveToRaw || null,
    is_active: true,
  }))

  const { error: ruleError } = await supabase
    .from('group_class_recurrence_rules')
    .insert(recurrenceRows)

  if (ruleError) {
    redirect(toResultUrl(returnPath, 'error', ruleError.message))
  }

  let enrollmentWarning: string | null = null
  if (selectedStudentIds.length > 0) {
    const createdAt = new Date().toISOString()
    const rows = selectedStudentIds.map((studentId) => ({
      id: randomUUID(),
      template_id: templateId,
      student_id: studentId,
      status: 'active',
      is_active: true,
      created_at: createdAt,
      assigned_by_admin: user.id,
    }))

    const { error: enrollmentError } = await supabase
      .from('group_class_enrollments')
      .upsert(rows, { onConflict: 'template_id,student_id' })

    if (enrollmentError) {
      console.error('[createRecurringClass] enrollment upsert failed', {
        templateId,
        selectedStudentCount: selectedStudentIds.length,
        message: enrollmentError.message,
      })
      enrollmentWarning =
        ' Class was created, but student enrollment could not be completed automatically.'
    }
  }

  let generationResult
  try {
    generationResult = await generateUpcomingGroupClassSessions(supabase, {
      daysAhead: 60,
      templateIds: [templateId],
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown generator error.'
    const message = 'Recurring class created, but session generation failed: ' + detail
    redirect(toResultUrl(returnPath, 'error', message))
  }

  const successMessage =
    'Recurring class created successfully. Upcoming sessions were prepared automatically (' +
    String(generationResult.sessionsInserted) +
    ' session(s), ' +
    String(generationResult.participantSnapshotsInserted) +
    ' participant snapshot(s)).' +
    (enrollmentWarning ?? '')

  revalidatePath('/admin/group-classes')
  redirect(toResultUrl(returnPath, 'success', successMessage))
}

export async function deleteRecurringClass(formData: FormData) {
  const { supabase } = await requireAdminAccess()
  const returnPath = resolveGroupClassesReturnPath(formData)
  const classId = parseId(formData.get('class_id'))

  if (classId.length === 0) {
    redirect(toResultUrl(returnPath, 'error', 'Class id is required'))
  }

  const { data: templateRow, error: templateError } = await supabase
    .from('group_class_templates')
    .select('id, timezone')
    .eq('id', classId)
    .maybeSingle()

  if (templateError || !templateRow) {
    redirect(toResultUrl(returnPath, 'error', templateError?.message ?? 'Recurring class not found'))
  }

  const todayIso = getTodayIsoDateForTimezone(templateRow.timezone || 'UTC')

  const { error: classError } = await supabase
    .from('group_class_templates')
    .update({ is_active: false })
    .eq('id', classId)

  if (classError) {
    redirect(toResultUrl(returnPath, 'error', classError.message))
  }

  const { error: scheduleError } = await supabase
    .from('group_class_recurrence_rules')
    .update({ is_active: false })
    .eq('template_id', classId)

  if (scheduleError) {
    redirect(toResultUrl(returnPath, 'error', scheduleError.message))
  }

  const { data: futureSessionRows, error: futureSessionLoadError } = await supabase
    .from('group_class_sessions')
    .select('id')
    .eq('template_id', classId)
    .eq('is_active', true)
    .gte('session_date', todayIso)

  if (futureSessionLoadError) {
    redirect(toResultUrl(returnPath, 'error', futureSessionLoadError.message))
  }

  const futureSessionIds = (futureSessionRows ?? []).map((row) => row.id)
  if (futureSessionIds.length > 0) {
    const { error: deactivateSessionsError } = await supabase
      .from('group_class_sessions')
      .update({ is_active: false })
      .in('id', futureSessionIds)

    if (deactivateSessionsError) {
      redirect(toResultUrl(returnPath, 'error', deactivateSessionsError.message))
    }

    const { error: deactivateParticipantsError } = await supabase
      .from('group_class_session_participants')
      .update({ is_active: false })
      .eq('is_active', true)
      .in('session_id', futureSessionIds)

    if (deactivateParticipantsError) {
      redirect(toResultUrl(returnPath, 'error', deactivateParticipantsError.message))
    }
  }

  revalidatePath('/admin/group-classes')
  revalidatePath('/teacher/classes')
  revalidatePath('/teacher/group-sessions')
  redirect(toResultUrl(returnPath, 'success', 'Recurring class deleted'))
}

export async function unenrollStudent(formData: FormData) {
  const { supabase } = await requireAdminAccess()
  const returnPath = resolveGroupClassesReturnPath(formData)
  const enrollmentId = parseId(formData.get('enrollment_id'))

  if (enrollmentId.length === 0) {
    redirect(toResultUrl(returnPath, 'error', 'Enrollment id is required'))
  }

  const { data: enrollmentRow, error: enrollmentLoadError } = await supabase
    .from('group_class_enrollments')
    .select('id, template_id, student_id')
    .eq('id', enrollmentId)
    .maybeSingle()

  if (enrollmentLoadError || !enrollmentRow) {
    redirect(toResultUrl(returnPath, 'error', enrollmentLoadError?.message ?? 'Enrollment not found'))
  }

  const { data: templateRow, error: templateError } = await supabase
    .from('group_class_templates')
    .select('timezone')
    .eq('id', enrollmentRow.template_id)
    .maybeSingle()

  if (templateError || !templateRow) {
    redirect(toResultUrl(returnPath, 'error', templateError?.message ?? 'Recurring class not found'))
  }

  const todayIso = getTodayIsoDateForTimezone(templateRow.timezone || 'UTC')

  const { error } = await supabase
    .from('group_class_enrollments')
    .update({ status: 'removed', is_active: false })
    .eq('id', enrollmentId)

  if (error) {
    redirect(toResultUrl(returnPath, 'error', error.message))
  }

  const { data: futureSessionRows, error: futureSessionLoadError } = await supabase
    .from('group_class_sessions')
    .select('id')
    .eq('template_id', enrollmentRow.template_id)
    .eq('is_active', true)
    .eq('status', 'scheduled')
    .gte('session_date', todayIso)

  if (futureSessionLoadError) {
    redirect(toResultUrl(returnPath, 'error', futureSessionLoadError.message))
  }

  const futureSessionIds = (futureSessionRows ?? []).map((row) => row.id)
  if (futureSessionIds.length > 0) {
    const { error: deactivateParticipantsError } = await supabase
      .from('group_class_session_participants')
      .update({ is_active: false })
      .eq('student_profile_id', enrollmentRow.student_id)
      .eq('is_active', true)
      .in('session_id', futureSessionIds)

    if (deactivateParticipantsError) {
      redirect(toResultUrl(returnPath, 'error', deactivateParticipantsError.message))
    }
  }

  revalidatePath('/admin/group-classes')
  revalidatePath('/teacher/classes')
  revalidatePath('/teacher/group-sessions')
  redirect(toResultUrl(returnPath, 'success', 'Student unenrolled'))
}

export async function generateUpcomingSessions(formData: FormData) {
  const { supabase } = await requireAdminAccess()
  const returnPath = resolveGroupClassesReturnPath(formData)
  let result
  try {
    result = await generateUpcomingGroupClassSessions(supabase, { daysAhead: 60 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate sessions.'
    redirect(toResultUrl(returnPath, 'error', message))
  }

  revalidatePath('/admin/group-classes')
  redirect(
    toResultUrl(
      returnPath,
      'success',
      'Session generation complete. Added ' +
        String(result.sessionsInserted) +
        ' session(s) and ' +
        String(result.participantSnapshotsInserted) +
        ' participant snapshot(s).'
    )
  )
}
