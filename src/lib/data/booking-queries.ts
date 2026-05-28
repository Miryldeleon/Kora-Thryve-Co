import type { SupabaseClient } from '@supabase/supabase-js'
import {
  EMPTY_TEACHING_ANNOTATIONS,
  type LessonState,
  type TeachingAnnotations,
} from '@/lib/session/teaching-state'

export type BookingAccessRow = {
  id: string
  teacher_id: string
  teacher_name?: string | null
  student_id: string
  student_name?: string | null
  starts_at: string
  ends_at: string
  status: string
}

export type OneOnOneAttendanceRow = {
  booking_id: string
  user_id: string
  role: 'teacher' | 'student'
  joined_at: string
}

export type OneOnOneTeachingStateRow = {
  lesson: LessonState | null
  whiteboard_snapshot: string | null
  annotations: TeachingAnnotations | null
}

export type StudentUpcomingBookingRow = {
  id: string
  teacher_name: string | null
  starts_at: string
  ends_at: string
}

export type TeacherUpcomingBookingRow = {
  id: string
  student_name: string | null
  starts_at: string
  ends_at: string
  status: string
}

export async function listStudentUpcomingBookings(
  supabase: SupabaseClient,
  input: { studentId: string; nowIso: string; limit: number }
) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, teacher_name, starts_at, ends_at')
    .eq('student_id', input.studentId)
    .eq('status', 'confirmed')
    .gte('starts_at', input.nowIso)
    .order('starts_at', { ascending: true })
    .limit(input.limit)

  return { bookings: (data ?? []) as StudentUpcomingBookingRow[], error }
}

export async function listTeacherUpcomingBookings(
  supabase: SupabaseClient,
  input: { teacherId: string; nowIso: string; limit: number }
) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, student_name, starts_at, ends_at, status')
    .eq('teacher_id', input.teacherId)
    .eq('status', 'confirmed')
    .gte('starts_at', input.nowIso)
    .order('starts_at', { ascending: true })
    .limit(input.limit)

  return { bookings: (data ?? []) as TeacherUpcomingBookingRow[], error }
}

export async function countTeacherBookingsByStatus(
  supabase: SupabaseClient,
  input: { teacherId: string; status: string }
) {
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', input.teacherId)
    .eq('status', input.status)

  return { count: count ?? 0, error }
}

export async function getBookingAccessById(supabase: SupabaseClient, bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, teacher_id, teacher_name, student_id, student_name, starts_at, ends_at, status')
    .eq('id', bookingId)
    .maybeSingle()

  return { booking: (data ?? null) as BookingAccessRow | null, error }
}

export async function listBookingAttendance(supabase: SupabaseClient, bookingId: string) {
  const { data, error } = await supabase
    .from('session_attendance')
    .select('booking_id, user_id, role, joined_at')
    .eq('booking_id', bookingId)
    .order('joined_at', { ascending: false })

  return {
    attendance: ((data ?? []) as OneOnOneAttendanceRow[]).sort((a, b) => {
      if (a.role === b.role) {
        return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
      }
      return a.role === 'teacher' ? -1 : 1
    }),
    error,
  }
}

export async function getLatestTeacherBookingAttendance(supabase: SupabaseClient, bookingId: string) {
  const { data, error } = await supabase
    .from('session_attendance')
    .select('joined_at')
    .eq('booking_id', bookingId)
    .eq('role', 'teacher')
    .order('joined_at', { ascending: false })
    .limit(1)

  const joinedAt = data?.[0]?.joined_at ?? null
  return {
    teacherHasJoined: Boolean(joinedAt),
    teacherJoinedAt: joinedAt as string | null,
    error,
  }
}

export async function recordBookingAttendance(
  supabase: SupabaseClient,
  input: { bookingId: string; userId: string; role: 'teacher' | 'student' }
) {
  const { error } = await supabase.from('session_attendance').upsert(
    {
      booking_id: input.bookingId,
      user_id: input.userId,
      role: input.role,
      joined_at: new Date().toISOString(),
    },
    { onConflict: 'booking_id,user_id' }
  )

  return { error }
}

export async function getBookingNotes(supabase: SupabaseClient, bookingId: string) {
  const { data, error } = await supabase
    .from('session_notes')
    .select('notes')
    .eq('booking_id', bookingId)
    .maybeSingle()

  return { notes: (data?.notes ?? '') as string, error }
}

export async function saveBookingNotes(
  supabase: SupabaseClient,
  input: { bookingId: string; notes: string; updatedBy: string }
) {
  const { error } = await supabase.from('session_notes').upsert(
    {
      booking_id: input.bookingId,
      notes: input.notes,
      updated_by: input.updatedBy,
    },
    { onConflict: 'booking_id' }
  )

  return { error }
}

export async function getBookingTeachingState(supabase: SupabaseClient, bookingId: string) {
  const { data, error } = await supabase
    .from('session_teaching_state')
    .select('lesson, whiteboard_snapshot, annotations')
    .eq('booking_id', bookingId)
    .maybeSingle()

  const state = data as OneOnOneTeachingStateRow | null
  return {
    state: {
      lesson: state?.lesson ?? null,
      whiteboardSnapshot: state?.whiteboard_snapshot ?? null,
      annotations: state?.annotations ?? EMPTY_TEACHING_ANNOTATIONS,
    },
    error,
  }
}

export async function saveBookingTeachingState(
  supabase: SupabaseClient,
  input: {
    bookingId: string
    lesson: LessonState
    whiteboardSnapshot: string | null
    annotations: TeachingAnnotations
    updatedBy: string
  }
) {
  const { error } = await supabase.from('session_teaching_state').upsert(
    {
      booking_id: input.bookingId,
      lesson: input.lesson,
      whiteboard_snapshot: input.whiteboardSnapshot,
      annotations: input.annotations,
      updated_by: input.updatedBy,
    },
    { onConflict: 'booking_id' }
  )

  return { error }
}
