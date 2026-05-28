import type { SupabaseClient } from '@supabase/supabase-js'
import {
  EMPTY_TEACHING_ANNOTATIONS,
  type LessonState,
  type TeachingAnnotations,
} from '@/lib/session/teaching-state'

export type GroupSessionRoomAccessRow = {
  session_id: string
  template_id: string
  teacher_id: string | null
  session_date: string
  start_time_local: string
  end_time_local: string
  status: 'scheduled' | 'completed' | 'cancelled' | string
  meeting_room_name: string
  is_active: boolean
  template_title: string
  template_description: string | null
  access_role: 'teacher' | 'student' | string
}

export type GroupAttendanceRow = {
  session_id: string
  user_id: string
  role: 'teacher' | 'student'
  joined_at: string
}

export type GroupSessionTeacherPresenceRow = {
  teacher_has_joined: boolean
  teacher_joined_at: string | null
}

export type GroupSessionParticipantRow = {
  id: string
  student_profile_id: string
}

export type GroupSessionTeachingStateRow = {
  lesson: LessonState | null
  whiteboard_snapshot: string | null
  annotations: TeachingAnnotations | null
}

export type StudentClassesPageGroupSessionRow = {
  template_id: string
  template_title: string
  template_timezone: string | null
  session_id: string | null
  session_date: string | null
  start_time_local: string | null
  end_time_local: string | null
  status: string | null
}

export async function listStudentClassesPageGroupSessions(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc('get_student_classes_page_group_sessions')
  return { sessions: (data ?? []) as StudentClassesPageGroupSessionRow[], error }
}

export async function getGroupSessionRoomAccess(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .rpc('get_group_session_room_access', { target_session_id: sessionId })
    .maybeSingle()

  return { access: (data ?? null) as GroupSessionRoomAccessRow | null, error }
}

export async function listGroupSessionAttendance(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase.rpc('get_group_session_attendance_snapshot', {
    target_session_id: sessionId,
  })

  return {
    attendance: ((data ?? []) as GroupAttendanceRow[]).sort((a, b) => {
      if (a.role === b.role) {
        return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
      }
      return a.role === 'teacher' ? -1 : 1
    }),
    error,
  }
}

export async function getGroupSessionTeacherPresence(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .rpc('get_group_session_teacher_presence', { target_session_id: sessionId })
    .maybeSingle()

  const presence = data as GroupSessionTeacherPresenceRow | null
  return {
    teacherHasJoined: Boolean(presence?.teacher_has_joined),
    teacherJoinedAt: presence?.teacher_joined_at ?? null,
    error,
  }
}

export async function recordGroupSessionAttendance(supabase: SupabaseClient, sessionId: string) {
  const { error } = await supabase.rpc('record_group_session_attendance', {
    target_session_id: sessionId,
  })

  return { error }
}

export async function getGroupSessionNotes(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .rpc('get_group_session_notes', { target_session_id: sessionId })
    .maybeSingle()

  return { notes: ((data as { notes?: string } | null)?.notes ?? '') as string, error }
}

export async function saveGroupSessionNotes(
  supabase: SupabaseClient,
  input: { sessionId: string; notes: string }
) {
  const { error } = await supabase.rpc('save_group_session_notes', {
    target_session_id: input.sessionId,
    next_notes: input.notes,
  })

  return { error }
}

export async function listGroupSessionParticipants(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from('group_class_session_participants')
    .select('id, student_profile_id')
    .eq('session_id', sessionId)
    .eq('is_active', true)

  return { participants: (data ?? []) as GroupSessionParticipantRow[], error }
}

export async function getGroupSessionTeachingState(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .rpc('get_group_session_teaching_state', { target_session_id: sessionId })
    .maybeSingle()

  const state = data as GroupSessionTeachingStateRow | null
  return {
    state: {
      lesson: state?.lesson ?? null,
      whiteboardSnapshot: state?.whiteboard_snapshot ?? null,
      annotations: state?.annotations ?? EMPTY_TEACHING_ANNOTATIONS,
    },
    error,
  }
}

export async function saveGroupSessionTeachingState(
  supabase: SupabaseClient,
  input: {
    sessionId: string
    lesson: LessonState
    whiteboardSnapshot: string | null
    annotations: TeachingAnnotations
  }
) {
  const { error } = await supabase.rpc('save_group_session_teaching_state', {
    target_session_id: input.sessionId,
    next_lesson: input.lesson,
    next_whiteboard_snapshot: input.whiteboardSnapshot,
    next_annotations: input.annotations,
  })

  return { error }
}
