import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatDateTimeRange } from '@/lib/booking/format'
import TeachingTools from '@/components/session/teaching-tools'
import { bookingStatusBadgeClass, brandUi } from '@/lib/ui/branding'
import SessionNotesPanel from '@/components/session/session-notes-panel'
import SessionMeetingStage from '@/components/session/session-meeting-stage'
import { redirect } from 'next/navigation'
import { getOneOnOneLiveSessionPageData } from '@/lib/services/live-session-service'
import { parseResourceId } from '@/lib/request/validation'

export const dynamic = 'force-dynamic'

type SessionRoomPageProps = {
  params: Promise<{
    bookingId: string
  }>
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
  const rawParams = await params
  const bookingId = parseResourceId(rawParams.bookingId, 'booking ID')
  if (!bookingId.ok) {
    return <UnauthorizedState />
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const liveSessionResult = await getOneOnOneLiveSessionPageData(supabase, user, bookingId.value)
  if (!liveSessionResult.ok) {
    return <UnauthorizedState />
  }

  const {
    attendanceErrorMessage,
    attendanceRows,
    booking,
    folders,
    jitsi,
    jitsiTokenErrorMessage,
    modules,
    participantName,
    role: currentUserRole,
    savedNotes,
    teacherHasJoined,
  } = liveSessionResult.data
  const backHref = user.id === booking.teacher_id ? '/teacher/classes?type=one_on_one' : '/student/classes?type=one_on_one'
  const isTeacher = user.id === booking.teacher_id

  if (booking.status === 'cancelled') {
    return <BookingUnavailableState status={booking.status} backHref={backHref} />
  }

  const isCompletedReviewMode = booking.status === 'completed'
  const isHostedMode = jitsi.domain === '8x8.vc' || Boolean(jitsi.appId)

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
              ) : isHostedMode && (jitsiTokenErrorMessage || !jitsi.authToken) ? (
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
                    domain: jitsi.domain,
                    appId: jitsi.appId,
                    roomPrefix: jitsi.roomPrefix,
                    authToken: jitsi.authToken,
                    roomName: jitsi.roomName,
                    displayName: participantName,
                    participantRole: currentUserRole,
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
                  sessionId={booking.id}
                  isTeacher={isTeacher}
                  currentUserId={user.id}
                  stateApiPath="/api/session-teaching-state"
                  stateResourceParam="bookingId"
                  folders={folders}
                  modules={modules.map((module) => ({
                    id: module.id,
                    folder_id: module.folder_id,
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
              resourceId={booking.id}
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
