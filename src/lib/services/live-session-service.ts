import type { SupabaseClient, User } from '@supabase/supabase-js'
import {
  getBookingNotes,
  getBookingTeachingState,
  listBookingAttendance,
  saveBookingNotes,
  saveBookingTeachingState,
  type BookingAccessRow,
  type OneOnOneAttendanceRow,
} from '@/lib/data/booking-queries'
import {
  getGroupSessionNotes,
  getGroupSessionTeachingState,
  listGroupSessionAttendance,
  listGroupSessionParticipants,
  saveGroupSessionNotes,
  saveGroupSessionTeachingState,
  type GroupAttendanceRow,
  type GroupSessionParticipantRow,
  type GroupSessionRoomAccessRow,
} from '@/lib/data/group-class-queries'
import { listTeachingMaterialsWithSignedUrls } from '@/lib/data/module-queries'
import {
  listProfileSummariesById,
  type ProfileSummaryRow,
} from '@/lib/data/profile-queries'
import { getFutureJitsiAuthToken, getJitsiPublicConfig } from '@/lib/session/jitsi'
import {
  EMPTY_TEACHING_ANNOTATIONS,
  type LessonState,
  type TeachingAnnotations,
} from '@/lib/session/teaching-state'
import {
  authorizeBookingParticipant,
  authorizeGroupSessionParticipant,
  type ServiceResult,
} from '@/lib/services/attendance-service'

export type JitsiRoomConfig = {
  domain: string
  appId?: string | null
  roomPrefix?: string | null
  authToken: string | null
  roomName: string
}

export type OneOnOneLiveSessionData = {
  booking: BookingAccessRow
  role: 'teacher' | 'student'
  participantName: string
  jitsi: JitsiRoomConfig
  jitsiTokenErrorMessage: string | null
  attendanceRows: OneOnOneAttendanceRow[]
  attendanceErrorMessage: string | null
  teacherHasJoined: boolean
  savedNotes: string
  folders: Awaited<ReturnType<typeof listTeachingMaterialsWithSignedUrls>>['folders']
  modules: Awaited<ReturnType<typeof listTeachingMaterialsWithSignedUrls>>['modules']
}

export type GroupLiveSessionData = {
  access: GroupSessionRoomAccessRow
  role: 'teacher' | 'student'
  jitsi: JitsiRoomConfig
  jitsiTokenErrorMessage: string | null
  attendanceRows: GroupAttendanceRow[]
  attendanceErrorMessage: string | null
  teacherHasJoined: boolean
  savedNotes: string
  participants: GroupSessionParticipantRow[]
  profiles: ProfileSummaryRow[]
  folders: Awaited<ReturnType<typeof listTeachingMaterialsWithSignedUrls>>['folders']
  modules: Awaited<ReturnType<typeof listTeachingMaterialsWithSignedUrls>>['modules']
}

async function buildJitsiToken(input: {
  roomId: string
  userId: string
  role: 'teacher' | 'student'
  displayName: string
  roomName: string
}) {
  const jitsiConfig = getJitsiPublicConfig()
  let authToken: string | null = null
  let tokenErrorMessage: string | null = null

  try {
    authToken = await getFutureJitsiAuthToken({
      bookingId: input.roomId,
      userId: input.userId,
      role: input.role,
      displayName: input.displayName,
      roomName: input.roomName,
      roomPrefix: jitsiConfig.roomPrefix,
    })
  } catch {
    tokenErrorMessage =
      'Live meeting is temporarily unavailable. Please refresh in a moment or contact support.'
  }

  return {
    jitsi: {
      domain: jitsiConfig.domain,
      appId: jitsiConfig.appId,
      roomPrefix: jitsiConfig.roomPrefix,
      authToken,
      roomName: input.roomName,
    },
    tokenErrorMessage,
  }
}

export async function getOneOnOneLiveSessionPageData(
  supabase: SupabaseClient,
  user: User,
  bookingId: string
): Promise<ServiceResult<OneOnOneLiveSessionData>> {
  const access = await authorizeBookingParticipant(supabase, user, bookingId)
  if (!access.ok) return access

  const { booking, role } = access.data
  const participantName =
    role === 'teacher'
      ? booking.teacher_name || 'Teacher'
      : booking.student_name || 'Student'

  if (booking.status === 'cancelled') {
    const jitsiConfig = getJitsiPublicConfig()
    return {
      ok: true,
      data: {
        booking,
        role,
        participantName,
        jitsi: {
          domain: jitsiConfig.domain,
          appId: jitsiConfig.appId,
          roomPrefix: jitsiConfig.roomPrefix,
          authToken: null,
          roomName: `kora-thryve-${booking.id}`,
        },
        jitsiTokenErrorMessage: null,
        attendanceRows: [],
        attendanceErrorMessage: null,
        teacherHasJoined: false,
        savedNotes: '',
        folders: [],
        modules: [],
      },
    }
  }

  const roomName = `kora-thryve-${booking.id}`
  const [jitsiResult, attendanceResult, notesResult, materialsResult] = await Promise.all([
    booking.status === 'completed'
      ? Promise.resolve({
          jitsi: { ...getJitsiPublicConfig(), authToken: null, roomName },
          tokenErrorMessage: null,
        })
      : buildJitsiToken({
          roomId: booking.id,
          userId: user.id,
          role,
          displayName: participantName,
          roomName,
        }),
    listBookingAttendance(supabase, booking.id),
    getBookingNotes(supabase, booking.id),
    listTeachingMaterialsWithSignedUrls(supabase),
  ])

  if (notesResult.error) {
    return { ok: false, error: notesResult.error.message, status: 400 }
  }

  if (materialsResult.error) {
    return { ok: false, error: materialsResult.error.message, status: 400 }
  }

  const teacherHasJoined = attendanceResult.attendance.some((row) => row.role === 'teacher')

  return {
    ok: true,
    data: {
      booking,
      role,
      participantName,
      jitsi: jitsiResult.jitsi,
      jitsiTokenErrorMessage: jitsiResult.tokenErrorMessage,
      attendanceRows: attendanceResult.attendance,
      attendanceErrorMessage: attendanceResult.error?.message ?? null,
      teacherHasJoined,
      savedNotes: notesResult.notes,
      folders: materialsResult.folders,
      modules: materialsResult.modules,
    },
  }
}

export async function getGroupLiveSessionPageData(
  supabase: SupabaseClient,
  user: User,
  sessionId: string
): Promise<ServiceResult<GroupLiveSessionData>> {
  const accessResult = await authorizeGroupSessionParticipant(supabase, sessionId)
  if (!accessResult.ok) return accessResult

  const { session: access, role } = accessResult.data
  const displayName = role === 'teacher' ? 'Teacher' : 'Student'

  if (access.status === 'cancelled' || access.status === 'completed') {
    const jitsiConfig = getJitsiPublicConfig()
    return {
      ok: true,
      data: {
        access,
        role,
        jitsi: {
          domain: jitsiConfig.domain,
          appId: jitsiConfig.appId,
          roomPrefix: jitsiConfig.roomPrefix,
          authToken: null,
          roomName: access.meeting_room_name,
        },
        jitsiTokenErrorMessage: null,
        attendanceRows: [],
        attendanceErrorMessage: null,
        teacherHasJoined: false,
        savedNotes: '',
        participants: [],
        profiles: [],
        folders: [],
        modules: [],
      },
    }
  }

  const [jitsiResult, attendanceResult, notesResult, participantResult, materialsResult] =
    await Promise.all([
      buildJitsiToken({
        roomId: access.session_id,
        userId: user.id,
        role,
        displayName,
        roomName: access.meeting_room_name,
      }),
      listGroupSessionAttendance(supabase, access.session_id),
      getGroupSessionNotes(supabase, access.session_id),
      listGroupSessionParticipants(supabase, access.session_id),
      listTeachingMaterialsWithSignedUrls(supabase),
    ])

  if (notesResult.error) return { ok: false, error: notesResult.error.message, status: 400 }
  if (participantResult.error) {
    return { ok: false, error: participantResult.error.message, status: 400 }
  }
  if (materialsResult.error) return { ok: false, error: materialsResult.error.message, status: 400 }

  const profileIds = Array.from(
    new Set([
      access.teacher_id,
      ...participantResult.participants.map((row) => row.student_profile_id),
      ...attendanceResult.attendance.map((row) => row.user_id),
    ])
  ).filter((profileId): profileId is string => Boolean(profileId))

  const profileResult = await listProfileSummariesById(supabase, profileIds)
  if (profileResult.error) return { ok: false, error: profileResult.error.message, status: 400 }

  return {
    ok: true,
    data: {
      access,
      role,
      jitsi: jitsiResult.jitsi,
      jitsiTokenErrorMessage: jitsiResult.tokenErrorMessage,
      attendanceRows: attendanceResult.attendance,
      attendanceErrorMessage: attendanceResult.error?.message ?? null,
      teacherHasJoined: attendanceResult.attendance.some((row) => row.role === 'teacher'),
      savedNotes: notesResult.notes,
      participants: participantResult.participants,
      profiles: profileResult.profiles,
      folders: materialsResult.folders,
      modules: materialsResult.modules,
    },
  }
}

export async function getBookingNotesForUser(supabase: SupabaseClient, user: User, bookingId: string) {
  const access = await authorizeBookingParticipant(supabase, user, bookingId)
  if (!access.ok) return access

  const { notes, error } = await getBookingNotes(supabase, bookingId)
  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: { notes } }
}

export async function saveBookingNotesForTeacher(
  supabase: SupabaseClient,
  user: User,
  input: { bookingId: string; notes: string }
) {
  const access = await authorizeBookingParticipant(supabase, user, input.bookingId)
  if (!access.ok) return access

  if (access.data.role !== 'teacher') {
    return { ok: false as const, error: 'Only the teacher can edit notes.', status: 403 }
  }

  if (access.data.booking.status !== 'confirmed') {
    return {
      ok: false as const,
      error: 'Notes can only be edited for confirmed sessions.',
      status: 400,
    }
  }

  const { error } = await saveBookingNotes(supabase, {
    bookingId: input.bookingId,
    notes: input.notes,
    updatedBy: user.id,
  })

  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: { notes: input.notes } }
}

export async function getGroupSessionNotesForUser(supabase: SupabaseClient, sessionId: string) {
  const access = await authorizeGroupSessionParticipant(supabase, sessionId)
  if (!access.ok) return access

  const { notes, error } = await getGroupSessionNotes(supabase, sessionId)
  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: { notes } }
}

export async function saveGroupSessionNotesForTeacher(
  supabase: SupabaseClient,
  input: { sessionId: string; notes: string }
) {
  const access = await authorizeGroupSessionParticipant(supabase, input.sessionId)
  if (!access.ok) return access

  if (access.data.role !== 'teacher') {
    return { ok: false as const, error: 'Only the teacher can edit notes.', status: 403 }
  }

  if (access.data.session.status !== 'scheduled') {
    return {
      ok: false as const,
      error: 'Notes can only be edited for scheduled group sessions.',
      status: 400,
    }
  }

  const { error } = await saveGroupSessionNotes(supabase, input)
  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: { notes: input.notes } }
}

export async function getBookingTeachingStateForUser(
  supabase: SupabaseClient,
  user: User,
  bookingId: string
) {
  const access = await authorizeBookingParticipant(supabase, user, bookingId)
  if (!access.ok) return access

  const { state, error } = await getBookingTeachingState(supabase, bookingId)
  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: state }
}

export async function saveBookingTeachingStateForTeacher(
  supabase: SupabaseClient,
  user: User,
  input: {
    bookingId: string
    lesson: LessonState
    whiteboardSnapshot: string | null
    annotations?: TeachingAnnotations
  }
) {
  const access = await authorizeBookingParticipant(supabase, user, input.bookingId)
  if (!access.ok) return access

  if (access.data.role !== 'teacher') {
    return {
      ok: false as const,
      error: 'Only the teacher can control teaching tools.',
      status: 403,
    }
  }

  if (access.data.booking.status !== 'confirmed') {
    return {
      ok: false as const,
      error: 'Teaching tools can only be controlled for confirmed sessions.',
      status: 400,
    }
  }

  const { error } = await saveBookingTeachingState(supabase, {
    bookingId: input.bookingId,
    lesson: input.lesson,
    whiteboardSnapshot: input.whiteboardSnapshot,
    annotations: input.annotations ?? EMPTY_TEACHING_ANNOTATIONS,
    updatedBy: user.id,
  })

  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: {} }
}

export async function getGroupSessionTeachingStateForUser(
  supabase: SupabaseClient,
  sessionId: string
) {
  const access = await authorizeGroupSessionParticipant(supabase, sessionId)
  if (!access.ok) return access

  const { state, error } = await getGroupSessionTeachingState(supabase, sessionId)
  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: state }
}

export async function saveGroupSessionTeachingStateForTeacher(
  supabase: SupabaseClient,
  input: {
    sessionId: string
    lesson: LessonState
    whiteboardSnapshot: string | null
    annotations?: TeachingAnnotations
  }
) {
  const access = await authorizeGroupSessionParticipant(supabase, input.sessionId)
  if (!access.ok) return access

  if (access.data.role !== 'teacher') {
    return {
      ok: false as const,
      error: 'Only the teacher can control teaching tools.',
      status: 403,
    }
  }

  if (access.data.session.status !== 'scheduled') {
    return {
      ok: false as const,
      error: 'Teaching tools can only be controlled for scheduled group sessions.',
      status: 400,
    }
  }

  const { error } = await saveGroupSessionTeachingState(supabase, {
    sessionId: input.sessionId,
    lesson: input.lesson,
    whiteboardSnapshot: input.whiteboardSnapshot,
    annotations: input.annotations ?? EMPTY_TEACHING_ANNOTATIONS,
  })

  if (error) return { ok: false as const, error: error.message, status: 400 }
  return { ok: true as const, data: {} }
}
