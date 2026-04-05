import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatDateTimeRange } from '@/lib/booking/format'
import TeachingTools from '@/components/session/teaching-tools'
import { getFutureJitsiAuthToken, getJitsiPublicConfig } from '@/lib/session/jitsi'
import { TEACHER_MODULES_BUCKET } from '@/lib/modules/config'
import { bookingStatusBadgeClass, brandUi } from '@/lib/ui/branding'
import SessionNotesPanel from '@/components/session/session-notes-panel'
import SessionMeetingStage from '@/components/session/session-meeting-stage'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type SessionRoomPageProps = {
  params: Promise<{
    bookingId: string
  }>
}

type BookingSession = {
  id: string
  teacher_id: string
  teacher_name: string | null
  student_id: string
  student_name: string | null
  starts_at: string
  ends_at: string
  status: string
}

type SessionModule = {
  id: string
  title: string
  description: string | null
  teacher_name: string | null
  storage_path: string
}

type SessionModuleWithUrl = SessionModule & {
  signedUrl: string | null
}

type SessionAttendance = {
  booking_id: string
  user_id: string
  role: 'teacher' | 'student'
  joined_at: string
}

function normalizeRoomName(roomName: string) {
  return roomName
    .replace(/[^a-zA-Z0-9/_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160)
}

function activityRoleBadgeClass(role: 'teacher' | 'student') {
  if (role === 'teacher') return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  return 'border-teal-200 bg-teal-50 text-teal-700'
}

function formatActivityTime(isoString: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoString))
}

function BackLink({ href }: { href: string }) {
  return (
    <a href={href} className={brandUi.secondaryButton}>
      Back
    </a>
  )
}

function UnauthorizedState() {
  return (
    <main className={brandUi.page}>
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Session not found or unauthorized</h1>
        <p className="mt-2 text-sm text-slate-600">You do not have access to this session.</p>
      </div>
    </main>
  )
}

function BookingUnavailableState({
  status,
  backHref,
}: {
  status: 'cancelled'
  backHref: string
}) {
  const message = 'This booking was cancelled. Live session access is unavailable.'

  return (
    <main className={brandUi.page}>
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <BackLink href={backHref} />
        <h1 className="mt-4 text-2xl font-semibold">Session Unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <p className="mt-4">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${bookingStatusBadgeClass(
              status
            )}`}
          >
            {status}
          </span>
        </p>
      </div>
    </main>
  )
}

export default async function SessionRoomPage({
  params,
}: SessionRoomPageProps) {
  const { bookingId } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, teacher_id, teacher_name, student_id, student_name, starts_at, ends_at, status'
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (error || !data) {
    return <UnauthorizedState />
  }

  const booking = data as BookingSession
  const canAccess = user.id === booking.teacher_id || user.id === booking.student_id
  if (!canAccess) {
    return <UnauthorizedState />
  }

  const backHref = user.id === booking.teacher_id ? '/teacher/bookings' : '/student/booking'
  const isTeacher = user.id === booking.teacher_id

  if (booking.status === 'cancelled') {
    return <BookingUnavailableState status={booking.status} backHref={backHref} />
  }

  const isCompletedReviewMode = booking.status === 'completed'
  const currentUserRole: SessionAttendance['role'] = isTeacher ? 'teacher' : 'student'
  const roomName = `kora-thryve-${booking.id}`
  const participantName = isTeacher
    ? booking.teacher_name || 'Teacher'
    : booking.student_name || 'Student'
  const jitsiConfig = getJitsiPublicConfig()
  const isHostedMode = jitsiConfig.domain === '8x8.vc' || Boolean(jitsiConfig.appId)
  let jitsiAuthToken: string | null = null
  let jitsiTokenErrorMessage: string | null = null

  try {
    jitsiAuthToken = await getFutureJitsiAuthToken({
      bookingId: booking.id,
      userId: user.id,
      role: currentUserRole,
      displayName: participantName,
      roomName,
      roomPrefix: jitsiConfig.roomPrefix,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Jitsi token error'
    console.log('[session-page] jitsi token generation failed', {
      bookingId: booking.id,
      role: currentUserRole,
      domain: jitsiConfig.domain,
      hasAppId: Boolean(jitsiConfig.appId),
      message,
    })
    jitsiTokenErrorMessage =
      'Live meeting is temporarily unavailable. Please refresh in a moment or contact support.'
  }
  if (process.env.NODE_ENV !== 'production') {
    const normalizedRoom = normalizeRoomName(roomName)
    const prefixedRoom = jitsiConfig.roomPrefix
      ? `${normalizeRoomName(jitsiConfig.roomPrefix)}-${normalizedRoom}`.slice(0, 160)
      : normalizedRoom
    const hostedPath = jitsiConfig.appId
      ? `${normalizeRoomName(jitsiConfig.appId)}/${prefixedRoom}`
      : prefixedRoom
    console.log('[session-page] jitsi config resolved', {
      bookingId: booking.id,
      role: currentUserRole,
      domain: jitsiConfig.domain,
      appId: jitsiConfig.appId,
      room: prefixedRoom,
      meetingPath: hostedPath,
      hasAppId: Boolean(jitsiConfig.appId),
      hasJwt: Boolean(jitsiAuthToken),
    })
  }

  const { data: attendanceData, error: attendanceLoadError } = await supabase
    .from('session_attendance')
    .select('booking_id, user_id, role, joined_at')
    .eq('booking_id', booking.id)
    .order('joined_at', { ascending: false })

  const attendanceErrorMessage = attendanceLoadError?.message
  const attendanceRows = ((attendanceData ?? []) as SessionAttendance[]).sort((a, b) => {
    if (a.role === b.role) {
      return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
    }
    return a.role === 'teacher' ? -1 : 1
  })
  const latestTeacherJoin = attendanceRows.find((row) => row.role === 'teacher')?.joined_at ?? null
  const teacherHasJoined = Boolean(latestTeacherJoin)

  if (process.env.NODE_ENV !== 'production') {
    console.log('[session-page] teacher gate seed from attendance', {
      bookingId: booking.id,
      role: currentUserRole,
      latestTeacherJoin,
      teacherHasJoined,
      attendanceRowsCount: attendanceRows.length,
    })
  }

  const { data: notesData, error: notesLoadError } = await supabase
    .from('session_notes')
    .select('notes')
    .eq('booking_id', booking.id)
    .maybeSingle()

  if (notesLoadError) {
    throw new Error(notesLoadError.message)
  }

  const savedNotes = notesData?.notes ?? ''

  const { data: modulesData, error: modulesError } = await supabase
    .from('modules')
    .select('id, title, description, teacher_name, storage_path')
    .eq('teacher_id', booking.teacher_id)
    .order('created_at', { ascending: false })

  if (modulesError) {
    throw new Error(modulesError.message)
  }

  const modules = (modulesData ?? []) as SessionModule[]
  const modulesWithUrls: SessionModuleWithUrl[] = await Promise.all(
    modules.map(async (module) => {
      const { data: signedUrlData } = await supabase.storage
        .from(TEACHER_MODULES_BUCKET)
        .createSignedUrl(module.storage_path, 60 * 10)

      return {
        ...module,
        signedUrl: signedUrlData?.signedUrl ?? null,
      }
    })
  )

  const shellGridClass = isTeacher
    ? 'grid min-h-[84vh] gap-4 lg:grid-cols-[24%_minmax(0,1fr)] lg:peer-checked:grid-cols-[30%_minmax(0,1fr)]'
    : 'grid min-h-[84vh] gap-4 lg:grid-cols-[28%_minmax(0,1fr)] lg:peer-checked:grid-cols-[34%_minmax(0,1fr)]'

  return (
    <main className="min-h-screen bg-[#0b0f14] px-4 py-4 text-slate-900 sm:px-6 lg:px-8 xl:px-10">
      <div className="w-full">
        <input id="meeting-rail-expanded" type="checkbox" className="peer sr-only" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-[#0f141b]/90 px-3 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <BackLink href={backHref} />
            {isCompletedReviewMode && (
              <span className="rounded-full border border-sky-700/60 bg-sky-900/30 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-sky-200">
                Review Mode
              </span>
            )}
          </div>
          <label
            htmlFor="meeting-rail-expanded"
            className="inline-flex cursor-pointer items-center rounded-lg border border-slate-700 bg-[#111926] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-[#162131]"
          >
            Toggle Meeting Width
          </label>
        </div>

        <section className="overflow-hidden rounded-3xl bg-[#0b0f14]">
          <div className={shellGridClass}>
            <article className="flex min-h-0 flex-col rounded-2xl border border-slate-800 bg-[#111722] p-3 lg:overflow-y-auto xl:p-4">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">
                  Live Meeting
                </h2>
              </div>
              {isCompletedReviewMode ? (
                <div className="flex min-h-[380px] flex-1 items-center justify-center rounded-2xl border border-slate-700 bg-[#131a24] px-5 text-center text-sm text-slate-300 lg:min-h-0">
                  This session has been completed. Live call is disabled in review mode.
                </div>
              ) : isHostedMode && (jitsiTokenErrorMessage || !jitsiAuthToken) ? (
                <div className="flex min-h-[380px] flex-1 items-center justify-center rounded-2xl border border-rose-800/70 bg-[#1d1417] px-5 text-center text-sm text-rose-100 lg:min-h-0">
                  {jitsiTokenErrorMessage ||
                    'Live meeting is unavailable because secure meeting access could not be established.'}
                </div>
              ) : (
                <SessionMeetingStage
                  bookingId={booking.id}
                  isTeacher={isTeacher}
                  initialTeacherJoined={teacherHasJoined}
                  jitsi={{
                    domain: jitsiConfig.domain,
                    appId: jitsiConfig.appId,
                    roomPrefix: jitsiConfig.roomPrefix,
                    authToken: jitsiAuthToken,
                    roomName,
                    displayName: participantName,
                    participantRole: isTeacher ? 'teacher' : 'student',
                    meetingLabel: formatDateTimeRange(booking.starts_at, booking.ends_at),
                    className: 'h-full min-h-[500px] flex-1',
                    compact: true,
                  }}
                />
              )}
            </article>
            <div className="min-h-0 rounded-2xl border border-slate-800/70 bg-[#0f141d] p-6 lg:p-8">
              <div className="h-full min-h-0 rounded-2xl bg-[#111a27] p-1">
                <TeachingTools
                  className="h-full min-h-0 overflow-hidden rounded-2xl bg-[#0f1622] p-3 lg:p-4"
                  bookingId={booking.id}
                  isTeacher={isTeacher}
                  modules={modulesWithUrls.map((module) => ({
                    id: module.id,
                    title: module.title,
                    description: module.description,
                    teacher_name: module.teacher_name,
                    signedUrl: module.signedUrl,
                  }))}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200/80 bg-[#f7f6f3] p-4 shadow-sm lg:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Teacher</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {booking.teacher_name || 'Teacher'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Student</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {booking.student_name || 'Student'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Date / Time</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatDateTimeRange(booking.starts_at, booking.ends_at)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Status</p>
              <p className="mt-1">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${bookingStatusBadgeClass(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className={brandUi.sectionTitle}>Notes / Whiteboard Area</h2>
            <SessionNotesPanel
              bookingId={booking.id}
              initialNotes={savedNotes}
              isTeacher={isTeacher}
              isCompletedReviewMode={isCompletedReviewMode}
            />
          </article>

          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className={brandUi.sectionTitle}>Attendance / Session Activity</h2>
            {attendanceErrorMessage && <p className={brandUi.errorAlert}>{attendanceErrorMessage}</p>}
            <div className="mt-4 grid gap-3">
              {attendanceRows.length === 0 && !attendanceErrorMessage && (
                <p className={brandUi.mutedCard}>No session activity yet.</p>
              )}
              {attendanceRows.map((row) => (
                <article key={`${row.booking_id}-${row.user_id}`} className={brandUi.card}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">
                      {row.role === 'teacher'
                        ? booking.teacher_name || 'Teacher'
                        : booking.student_name || 'Student'}
                    </p>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${activityRoleBadgeClass(
                        row.role
                      )}`}
                    >
                      {row.role}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Joined: {formatActivityTime(row.joined_at)}
                  </p>
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
