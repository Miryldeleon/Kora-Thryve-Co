import type { SupabaseClient } from '@supabase/supabase-js'

export type TeacherAttendanceClassRow = {
  template_id: string
  template_title: string
  schedule_summary: string | null
  active_student_count: number | null
  scheduled_session_count: number | null
  completed_session_count: number | null
}

export async function listTeacherAttendanceClasses(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc('get_teacher_attendance_classes')
  return { classes: (data ?? []) as TeacherAttendanceClassRow[], error }
}
