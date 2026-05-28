import type { SupabaseClient, User } from '@supabase/supabase-js'
import {
  getBookingAccessById,
  getLatestTeacherBookingAttendance,
  recordBookingAttendance,
  type BookingAccessRow,
} from '@/lib/data/booking-queries'
import {
  getGroupSessionRoomAccess,
  getGroupSessionTeacherPresence,
  recordGroupSessionAttendance,
  type GroupSessionRoomAccessRow,
} from '@/lib/data/group-class-queries'

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number }

export type AuthorizedBooking = {
  booking: BookingAccessRow
  role: 'teacher' | 'student'
}

export type AuthorizedGroupSession = {
  session: GroupSessionRoomAccessRow
  role: 'teacher' | 'student'
}

export function getBookingParticipantRole(booking: BookingAccessRow, userId: string) {
  if (booking.teacher_id === userId) return 'teacher'
  if (booking.student_id === userId) return 'student'
  return null
}

export async function authorizeBookingParticipant(
  supabase: SupabaseClient,
  user: User,
  bookingId: string
): Promise<ServiceResult<AuthorizedBooking>> {
  const { booking, error } = await getBookingAccessById(supabase, bookingId)

  if (error || !booking) {
    return { ok: false, error: 'Booking not found.', status: 404 }
  }

  const role = getBookingParticipantRole(booking, user.id)
  if (!role) {
    return { ok: false, error: 'Forbidden.', status: 403 }
  }

  return { ok: true, data: { booking, role } }
}

export async function getBookingTeacherPresenceForUser(
  supabase: SupabaseClient,
  user: User,
  bookingId: string
) {
  const access = await authorizeBookingParticipant(supabase, user, bookingId)
  if (!access.ok) return access

  const presence = await getLatestTeacherBookingAttendance(supabase, bookingId)
  if (presence.error) {
    return { ok: false as const, error: presence.error.message, status: 400 }
  }

  return {
    ok: true as const,
    data: {
      teacherHasJoined: presence.teacherHasJoined,
      teacherJoinedAt: presence.teacherJoinedAt,
    },
  }
}

export async function recordBookingJoin(supabase: SupabaseClient, user: User, bookingId: string) {
  const access = await authorizeBookingParticipant(supabase, user, bookingId)
  if (!access.ok) return access

  const { booking, role } = access.data
  if (booking.status === 'cancelled') {
    return {
      ok: false as const,
      error: 'This booking was cancelled. Live session access is unavailable.',
      status: 400,
    }
  }

  if (booking.status === 'completed') {
    return { ok: false as const, error: 'This booking has already been completed.', status: 400 }
  }

  const { error } = await recordBookingAttendance(supabase, {
    bookingId,
    userId: user.id,
    role,
  })

  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: { role } }
}

export async function authorizeGroupSessionParticipant(
  supabase: SupabaseClient,
  sessionId: string
): Promise<ServiceResult<AuthorizedGroupSession>> {
  const { access, error } = await getGroupSessionRoomAccess(supabase, sessionId)

  if (error || !access) {
    return { ok: false, error: 'Group session not found.', status: 404 }
  }

  if (access.access_role !== 'teacher' && access.access_role !== 'student') {
    return { ok: false, error: 'Forbidden.', status: 403 }
  }

  return { ok: true, data: { session: access, role: access.access_role } }
}

export async function getGroupSessionTeacherPresenceForUser(
  supabase: SupabaseClient,
  sessionId: string
) {
  const access = await authorizeGroupSessionParticipant(supabase, sessionId)
  if (!access.ok) return access

  const presence = await getGroupSessionTeacherPresence(supabase, sessionId)
  if (presence.error) {
    return { ok: false as const, error: presence.error.message, status: 400 }
  }

  return {
    ok: true as const,
    data: {
      teacherHasJoined: presence.teacherHasJoined,
      teacherJoinedAt: presence.teacherJoinedAt,
    },
  }
}

export async function recordGroupSessionJoin(supabase: SupabaseClient, sessionId: string) {
  const access = await authorizeGroupSessionParticipant(supabase, sessionId)
  if (!access.ok) return access

  const { session } = access.data
  if (session.status === 'cancelled') {
    return {
      ok: false as const,
      error: 'This group session was cancelled. Live access is unavailable.',
      status: 400,
    }
  }

  if (session.status === 'completed') {
    return {
      ok: false as const,
      error: 'This group session has already been completed.',
      status: 400,
    }
  }

  const { error } = await recordGroupSessionAttendance(supabase, sessionId)
  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: { role: access.data.role } }
}
