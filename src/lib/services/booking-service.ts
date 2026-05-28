import type { SupabaseClient } from '@supabase/supabase-js'
import {
  countTeacherBookingsByStatus,
  listStudentUpcomingBookings,
  listTeacherUpcomingBookings,
} from '@/lib/data/booking-queries'
import { listStudentClassesPageGroupSessions } from '@/lib/data/group-class-queries'
import { listRecentModules } from '@/lib/data/module-queries'

export { authorizeBookingParticipant, getBookingParticipantRole } from '@/lib/services/attendance-service'

export async function getStudentDashboardReads(
  supabase: SupabaseClient,
  input: { studentId: string; nowIso: string }
) {
  const [bookings, modules, groupSessions] = await Promise.all([
    listStudentUpcomingBookings(supabase, {
      studentId: input.studentId,
      nowIso: input.nowIso,
      limit: 3,
    }),
    listRecentModules(supabase, { limit: 3 }),
    listStudentClassesPageGroupSessions(supabase),
  ])

  return { bookings, modules, groupSessions }
}

export async function getTeacherDashboardReads(
  supabase: SupabaseClient,
  input: { teacherId: string; nowIso: string }
) {
  const [upcoming, completedCount, upcomingCount, modules] = await Promise.all([
    listTeacherUpcomingBookings(supabase, {
      teacherId: input.teacherId,
      nowIso: input.nowIso,
      limit: 3,
    }),
    countTeacherBookingsByStatus(supabase, {
      teacherId: input.teacherId,
      status: 'completed',
    }),
    countTeacherBookingsByStatus(supabase, {
      teacherId: input.teacherId,
      status: 'confirmed',
    }),
    listRecentModules(supabase, { teacherId: input.teacherId, limit: 4 }),
  ])

  return { upcoming, completedCount, upcomingCount, modules }
}
