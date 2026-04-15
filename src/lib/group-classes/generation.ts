import type { SupabaseClient } from '@supabase/supabase-js'
import { addDaysToIsoDate, getTodayIsoDateForTimezone } from './date'

type GroupClassTemplateRow = {
  id: string
  teacher_id: string
  timezone: string
}

type GroupClassRecurrenceRuleRow = {
  id: string
  template_id: string
  weekday: number
  week_of_month: number
  start_time_local: string
  end_time_local: string
  effective_from: string
  effective_to: string | null
}

type GroupClassEnrollmentRow = {
  id: string
  template_id: string
  student_id: string
}

type GroupClassSessionRow = {
  id: string
  template_id: string
}

type SupabaseLike = SupabaseClient

export type GroupClassGenerationResult = {
  generatedDateCount: number
  sessionsInserted: number
  participantSnapshotsInserted: number
}

function fromIsoDate(isoDate: string) {
  return new Date(isoDate + 'T12:00:00.000Z')
}

function nthWeekOfMonth(date: Date) {
  return Math.floor((date.getUTCDate() - 1) / 7) + 1
}

function dateMatchesRule(isoDate: string, rule: GroupClassRecurrenceRuleRow) {
  if (isoDate < rule.effective_from) return false
  if (rule.effective_to && isoDate > rule.effective_to) return false

  const date = fromIsoDate(isoDate)
  const weekday = date.getUTCDay()
  const weekOfMonth = nthWeekOfMonth(date)
  return weekday === rule.weekday && weekOfMonth === rule.week_of_month
}

function roomSegment(id: string) {
  return id.replace(/-/g, '').slice(0, 8)
}

function timeSegment(time: string) {
  return time.replace(/:/g, '')
}

function buildMeetingRoomName(templateId: string, recurrenceRuleId: string, sessionDate: string, startTimeLocal: string) {
  return [
    'kora-group',
    roomSegment(templateId),
    roomSegment(recurrenceRuleId),
    sessionDate.replace(/-/g, ''),
    timeSegment(startTimeLocal),
  ].join('-')
}

export async function generateUpcomingGroupClassSessions(
  supabase: SupabaseLike,
  options?: { daysAhead?: number; templateIds?: string[] }
): Promise<GroupClassGenerationResult> {
  const daysAhead = options?.daysAhead ?? 60
  const filterTemplateIds =
    options?.templateIds && options.templateIds.length > 0
      ? Array.from(new Set(options.templateIds))
      : null
  let templateQuery = supabase
    .from('group_class_templates')
    .select('id, teacher_id, timezone')
    .eq('is_active', true)

  if (filterTemplateIds) {
    templateQuery = templateQuery.in('id', filterTemplateIds)
  }

  const { data: templateData, error: templateError } = await templateQuery

  if (templateError) {
    throw new Error(templateError.message)
  }

  const templates = (templateData ?? []) as GroupClassTemplateRow[]
  const filteredTemplates = filterTemplateIds
    ? templates.filter((template) => filterTemplateIds.includes(template.id))
    : templates
  if (filteredTemplates.length === 0) {
    return {
      generatedDateCount: 0,
      sessionsInserted: 0,
      participantSnapshotsInserted: 0,
    }
  }

  const templateIds = filteredTemplates.map((row) => row.id)
  const templateWindowById = new Map<
    string,
    {
      startIso: string
      endIso: string
    }
  >()
  let globalStartIso: string | null = null
  let globalEndIso: string | null = null

  for (const template of filteredTemplates) {
    const startIso = getTodayIsoDateForTimezone(template.timezone || 'UTC')
    const endIso = addDaysToIsoDate(startIso, daysAhead)
    templateWindowById.set(template.id, { startIso, endIso })

    if (!globalStartIso || startIso < globalStartIso) {
      globalStartIso = startIso
    }
    if (!globalEndIso || endIso > globalEndIso) {
      globalEndIso = endIso
    }
  }

  const { data: recurrenceData, error: recurrenceError } = await supabase
    .from('group_class_recurrence_rules')
    .select('id, template_id, weekday, week_of_month, start_time_local, end_time_local, effective_from, effective_to')
    .eq('is_active', true)
    .in('template_id', templateIds)

  if (recurrenceError) {
    throw new Error(recurrenceError.message)
  }

  const rules = (recurrenceData ?? []) as GroupClassRecurrenceRuleRow[]
  if (rules.length === 0) {
    return {
      generatedDateCount: 0,
      sessionsInserted: 0,
      participantSnapshotsInserted: 0,
    }
  }

  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from('group_class_enrollments')
    .select('id, template_id, student_id')
    .eq('is_active', true)
    .eq('status', 'active')
    .in('template_id', templateIds)

  if (enrollmentError) {
    throw new Error(enrollmentError.message)
  }

  const enrollments = (enrollmentData ?? []) as GroupClassEnrollmentRow[]

  const rulesByTemplate = new Map<string, GroupClassRecurrenceRuleRow[]>()
  const enrollmentsByTemplate = new Map<string, GroupClassEnrollmentRow[]>()

  for (const rule of rules) {
    const list = rulesByTemplate.get(rule.template_id) ?? []
    list.push(rule)
    rulesByTemplate.set(rule.template_id, list)
  }

  for (const enrollment of enrollments) {
    const list = enrollmentsByTemplate.get(enrollment.template_id) ?? []
    list.push(enrollment)
    enrollmentsByTemplate.set(enrollment.template_id, list)
  }

  const sessionRows: Array<Record<string, unknown>> = []
  const seenSessionKey = new Set<string>()
  let generatedDateCount = 0

  for (const template of filteredTemplates) {
    const templateRules = rulesByTemplate.get(template.id) ?? []
    const window = templateWindowById.get(template.id)
    if (templateRules.length === 0) continue
    if (!window) continue

    for (let sessionDate = window.startIso; sessionDate <= window.endIso; sessionDate = addDaysToIsoDate(sessionDate, 1)) {
      for (const rule of templateRules) {
        if (!dateMatchesRule(sessionDate, rule)) continue

        const sessionKey = [template.id, rule.id, sessionDate, rule.start_time_local].join('|')
        if (seenSessionKey.has(sessionKey)) continue
        seenSessionKey.add(sessionKey)
        generatedDateCount += 1

        sessionRows.push({
          template_id: template.id,
          recurrence_rule_id: rule.id,
          teacher_id: template.teacher_id,
          session_date: sessionDate,
          start_time_local: rule.start_time_local,
          end_time_local: rule.end_time_local,
          timezone: template.timezone,
          status: 'scheduled',
          meeting_room_name: buildMeetingRoomName(
            template.id,
            rule.id,
            sessionDate,
            rule.start_time_local
          ),
          is_active: true,
        })
      }
    }
  }

  if (sessionRows.length === 0) {
    return {
      generatedDateCount,
      sessionsInserted: 0,
      participantSnapshotsInserted: 0,
    }
  }

  const { data: insertedSessions, error: sessionInsertError } = await supabase
    .from('group_class_sessions')
    .upsert(sessionRows, {
      onConflict: 'template_id,recurrence_rule_id,session_date,start_time_local',
      ignoreDuplicates: true,
    })
    .select('id')

  if (sessionInsertError) {
    throw new Error(sessionInsertError.message)
  }

  const sessionsInserted = (insertedSessions ?? []).length

  const { data: sessionData, error: sessionLoadError } = await supabase
    .from('group_class_sessions')
    .select('id, template_id')
    .eq('is_active', true)
    .in('template_id', templateIds)
    .gte('session_date', globalStartIso ?? '0001-01-01')
    .lte('session_date', globalEndIso ?? '9999-12-31')

  if (sessionLoadError) {
    throw new Error(sessionLoadError.message)
  }

  const sessions = (sessionData ?? []) as GroupClassSessionRow[]
  if (sessions.length === 0) {
    return {
      generatedDateCount,
      sessionsInserted,
      participantSnapshotsInserted: 0,
    }
  }

  const participantRows: Array<Record<string, unknown>> = []
  const seenParticipantKey = new Set<string>()

  for (const session of sessions) {
    const activeEnrollments = enrollmentsByTemplate.get(session.template_id) ?? []
    for (const enrollment of activeEnrollments) {
      const participantKey = session.id + '|' + enrollment.student_id
      if (seenParticipantKey.has(participantKey)) continue
      seenParticipantKey.add(participantKey)
      participantRows.push({
        session_id: session.id,
        student_profile_id: enrollment.student_id,
        enrollment_id: enrollment.id,
        is_active: true,
      })
    }
  }

  if (participantRows.length === 0) {
    return {
      generatedDateCount,
      sessionsInserted,
      participantSnapshotsInserted: 0,
    }
  }

  const { data: insertedParticipants, error: participantError } = await supabase
    .from('group_class_session_participants')
    .upsert(participantRows, {
      onConflict: 'session_id,student_profile_id',
      ignoreDuplicates: true,
    })
    .select('id')

  if (participantError) {
    throw new Error(participantError.message)
  }

  return {
    generatedDateCount,
    sessionsInserted,
    participantSnapshotsInserted: (insertedParticipants ?? []).length,
  }
}
