import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { brandUi } from '@/lib/ui/branding'
import SessionMeetingStage from '@/components/session/session-meeting-stage'
import TeachingTools from '@/components/session/teaching-tools'
import SessionNotesPanel from '@/components/session/session-notes-panel'
import LiveSessionShell from '@/components/session/live-session-shell'
import { getGroupLiveSessionPageData } from '@/lib/services/live-session-service'
import { parseResourceId } from '@/lib/request/validation'

export const dynamic = 'force-dynamic'

type GroupSessionPageProps = {
  params: Promise<{
    sessionId: string
  }>
}

type GroupSessionRow = {
  id: string
  template_id: string
  session_date: string
  start_time_local: string
  end_time_local: string
  status: 'scheduled' | 'completed' | 'cancelled' | string
  meeting_room_name: string
  is_active: boolean
}

type GroupTemplateRow = {
  id: string
  title: string
  description: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type ParticipantListItem = {
  userId: string
  role: 'teacher' | 'student'
  joinedAt: string | null
}

function sessionStatusBadgeClass(status: string) {
  if (status === 'scheduled') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'completed') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
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

function participantLabel(profile: ProfileRow | undefined, fallbackId: string) {
  return profile?.full_name?.trim() || profile?.email || fallbackId
}

function roleLabel(role: 'teacher' | 'student') {
  return role === 'teacher' ? 'Teacher' : 'Student'
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
        <h1 className="text-2xl font-semibold">Group session not found or unauthorized</h1>
        <p className="mt-2 text-sm text-slate-600">You do not have access to this group session.</p>
      </div>
    </main>
  )
}

function SessionUnavailableState({
  status,
  backHref,
}: {
  status: 'cancelled' | 'completed'
  backHref: string
}) {
  const message =
    status === 'cancelled'
      ? 'This group session was cancelled. Live room access is unavailable.'
      : 'This group session has ended. Live room access is unavailable.'

  return (
    <main className={brandUi.page}>
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <BackLink href={backHref} />
        <h1 className="mt-4 text-2xl font-semibold">Session Unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <p className="mt-4">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionStatusBadgeClass(
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

export default async function GroupSessionPage({ params }: GroupSessionPageProps) {
  const rawParams = await params
  const sessionId = parseResourceId(rawParams.sessionId, 'session ID')
  if (!sessionId.ok) {
    return <UnauthorizedState />
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const liveSessionResult = await getGroupLiveSessionPageData(supabase, user, sessionId.value)
  if (!liveSessionResult.ok) {
    return <UnauthorizedState />
  }

  const {
    access,
    attendanceErrorMessage,
    attendanceRows,
    folders,
    jitsi,
    jitsiTokenErrorMessage,
    modules,
    participants,
    profiles,
    role,
    savedNotes,
    teacherHasJoined,
  } = liveSessionResult.data
  const session: GroupSessionRow = {
    id: access.session_id,
    template_id: access.template_id,
    session_date: access.session_date,
    start_time_local: access.start_time_local,
    end_time_local: access.end_time_local,
    status: access.status,
    meeting_room_name: access.meeting_room_name,
    is_active: access.is_active,
  }
  const template: GroupTemplateRow = {
    id: access.template_id,
    title: access.template_title,
    description: access.template_description,
  }
  const isTeacher = role === 'teacher'
  const backHref = isTeacher ? '/teacher/classes?type=group' : '/student/classes?type=group'

  if (session.status === 'cancelled' || session.status === 'completed') {
    return <SessionUnavailableState status={session.status} backHref={backHref} />
  }

  const displayName = isTeacher ? 'Teacher' : 'Student'
  const isHostedMode = jitsi.domain === '8x8.vc' || Boolean(jitsi.appId)
  const profileById = new Map((profiles as ProfileRow[]).map((profile) => [profile.id, profile]))

  const participantByUserRole = new Map<string, ParticipantListItem>()
  const teacherAttendance = attendanceRows.find((row) => row.role === 'teacher')
  if (access.teacher_id) {
    participantByUserRole.set(`teacher:${access.teacher_id}`, {
      userId: access.teacher_id,
      role: 'teacher',
      joinedAt: teacherAttendance?.joined_at ?? null,
    })
  }

  attendanceRows.forEach((row) => {
    participantByUserRole.set(`${row.role}:${row.user_id}`, {
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
    })
  })

  participants.forEach((participant) => {
    const key = `student:${participant.student_profile_id}`
    if (participantByUserRole.has(key)) return
    participantByUserRole.set(key, {
      userId: participant.student_profile_id,
      role: 'student',
      joinedAt: null,
    })
  })

  const participantItems = Array.from(participantByUserRole.values()).sort((a, b) => {
    if (a.role !== b.role) return a.role === 'teacher' ? -1 : 1
    if (a.joinedAt && b.joinedAt) {
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    }
    if (a.joinedAt) return -1
    if (b.joinedAt) return 1
    return participantLabel(profileById.get(a.userId), a.userId).localeCompare(
      participantLabel(profileById.get(b.userId), b.userId)
    )
  })
  const hasStudentParticipants = participantItems.some((participant) => participant.role === 'student')

  const meetingLabel = `${formatIsoCalendarDate(session.session_date, {
    dateStyle: 'medium',
  })} | ${session.start_time_local} - ${session.end_time_local}`

  const studentMeetingNode = isHostedMode && (jitsiTokenErrorMessage || !jitsi.authToken) ? (
    <div className="flex h-full min-h-[190px] flex-1 items-center justify-center rounded-2xl border border-rose-800/70 bg-[#1d1417] px-5 text-center text-sm text-rose-100 md:min-h-[360px] lg:min-h-0">
      {jitsiTokenErrorMessage ||
        'Live meeting is unavailable because secure meeting access could not be established.'}
    </div>
  ) : (
    <SessionMeetingStage
      bookingId={session.id}
      isTeacher={isTeacher}
      initialTeacherJoined={teacherHasJoined}
      attendanceApiPath="/api/group-session-attendance"
      attendanceResourceParam="sessionId"
      jitsi={{
        domain: jitsi.domain,
        appId: jitsi.appId,
        roomPrefix: jitsi.roomPrefix,
        authToken: jitsi.authToken,
        roomName: jitsi.roomName,
        displayName,
        participantRole: role,
        meetingLabel,
        className: 'h-full min-h-[190px] flex-1 md:min-h-[360px] lg:min-h-[500px]',
        compact: true,
      }}
    />
  )

  const studentTeachingToolsNode = (
    <TeachingTools
      className="h-full min-h-0 overflow-hidden rounded-2xl bg-[#0f1622] p-2 lg:p-4"
      sessionId={session.id}
      isTeacher={isTeacher}
      currentUserId={user.id}
      stateApiPath="/api/group-session-teaching-state"
      stateResourceParam="sessionId"
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
  )

  const studentNotesNode = (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 text-slate-900 shadow-sm lg:p-5">
      <h2 className={brandUi.sectionTitle}>Notes / Whiteboard Area</h2>
      <SessionNotesPanel
        resourceId={session.id}
        initialNotes={savedNotes}
        isTeacher={isTeacher}
        isCompletedReviewMode={false}
        apiPath="/api/group-session-notes"
        resourceParam="sessionId"
      />
    </article>
  )

  const studentParticipantsNode = (
    <article className="rounded-2xl border border-slate-700/70 bg-[#111a27] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">
        Participants / Activity
      </h2>
      {attendanceErrorMessage && <p className={brandUi.errorAlert}>{attendanceErrorMessage}</p>}
      <div className="mt-3 space-y-2">
        {participantItems.map((participant) => (
          <p
            key={`${participant.role}-${participant.userId}`}
            className="rounded-xl border border-slate-700 bg-[#0f1622] px-3 py-2 text-sm text-slate-200"
          >
            <span className="font-medium">
              {participantLabel(profileById.get(participant.userId), participant.userId)}
            </span>
            <span className="ml-2 text-xs uppercase tracking-[0.12em] text-slate-400">
              {roleLabel(participant.role)}
            </span>
            {participant.joinedAt && (
              <span className="ml-2 text-xs text-slate-500">
                Joined {formatActivityTime(participant.joinedAt)}
              </span>
            )}
          </p>
        ))}
        {!hasStudentParticipants && (
          <p className="rounded-xl border border-slate-700 bg-[#0f1622] px-3 py-2 text-sm text-slate-300">
            No students have joined yet.
          </p>
        )}
      </div>
    </article>
  )

  const studentDetailsNode = (
    <article className="rounded-2xl border border-slate-700/70 bg-[#111a27] p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Class</p>
      <h1 className="mt-2 text-xl font-semibold text-slate-100">{template.title}</h1>
      <p className="mt-2 text-sm text-slate-300">
        {formatIsoCalendarDate(session.session_date, { dateStyle: 'full' })} |{' '}
        {session.start_time_local} - {session.end_time_local}
      </p>
      <span
        className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionStatusBadgeClass(
          session.status
        )}`}
      >
        {session.status}
      </span>
      {template.description && <p className="mt-3 text-sm text-slate-300">{template.description}</p>}
    </article>
  )

  if (!isTeacher) {
    return (
      <LiveSessionShell
        sessionId={session.id}
        viewerRole="student"
        backHref={backHref}
        title={template.title}
        subtitle={meetingLabel}
        statusLabel={session.status}
        statusClassName={sessionStatusBadgeClass(session.status)}
        sessionBadge="Student View"
        defaultContentTab="presentation"
        meeting={studentMeetingNode}
        teachingTools={studentTeachingToolsNode}
        notes={studentNotesNode}
        participants={studentParticipantsNode}
        details={studentDetailsNode}
      />
    )
  }

  if (isTeacher) {
    return (
      <LiveSessionShell
        sessionId={session.id}
        viewerRole="teacher"
        backHref={backHref}
        title={template.title}
        subtitle={meetingLabel}
        statusLabel={session.status}
        statusClassName={sessionStatusBadgeClass(session.status)}
        sessionBadge="Teacher View"
        defaultContentTab="presentation"
        meeting={studentMeetingNode}
        teachingTools={studentTeachingToolsNode}
        notes={studentNotesNode}
        participants={studentParticipantsNode}
        details={studentDetailsNode}
      />
    )
  }

  return (
    <main className="min-h-screen bg-[#0b0f14] px-4 py-4 text-slate-900 sm:px-6 lg:px-8 xl:px-10">
      <div className="w-full">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-[#0f141b]/90 px-3 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <BackLink href={backHref} />
            <span className="rounded-full border border-indigo-700/60 bg-indigo-900/30 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-indigo-200">
              Group Session
            </span>
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl bg-[#0b0f14]">
          <div className="grid min-h-[84vh] gap-4 lg:grid-cols-[30%_minmax(0,1fr)]">
            <article className="flex min-h-0 flex-col rounded-2xl border border-slate-800 bg-[#111722] p-3 lg:overflow-y-auto xl:p-4">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">
                  Live Meeting
                </h2>
              </div>
              {isHostedMode && (jitsiTokenErrorMessage || !jitsi.authToken) ? (
                <div className="flex min-h-[380px] flex-1 items-center justify-center rounded-2xl border border-rose-800/70 bg-[#1d1417] px-5 text-center text-sm text-rose-100 lg:min-h-0">
                  {jitsiTokenErrorMessage ||
                    'Live meeting is unavailable because secure meeting access could not be established.'}
                </div>
              ) : (
                <SessionMeetingStage
                  bookingId={session.id}
                  isTeacher={isTeacher}
                  initialTeacherJoined={teacherHasJoined}
                  attendanceApiPath="/api/group-session-attendance"
                  attendanceResourceParam="sessionId"
                  jitsi={{
                    domain: jitsi.domain,
                    appId: jitsi.appId,
                    roomPrefix: jitsi.roomPrefix,
                    authToken: jitsi.authToken,
                    roomName: jitsi.roomName,
                    displayName,
                    participantRole: role,
                    meetingLabel: `${formatIsoCalendarDate(session.session_date, {
                      dateStyle: 'medium',
                    })} | ${session.start_time_local} - ${session.end_time_local}`,
                    className: 'h-full min-h-[500px] flex-1',
                    compact: true,
                  }}
                />
              )}
            </article>

            <div className="min-h-0 rounded-2xl border border-slate-800/70 bg-[#0f141d] p-4 lg:p-6">
              <div className="h-full min-h-0 rounded-2xl bg-[#111a27] p-1">
                <TeachingTools
                  className="h-full min-h-0 overflow-hidden rounded-2xl bg-[#0f1622] p-3 lg:p-4"
                  sessionId={session.id}
                  isTeacher={isTeacher}
                  currentUserId={user.id}
                  stateApiPath="/api/group-session-teaching-state"
                  stateResourceParam="sessionId"
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

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.45fr)]">
          <article className="rounded-2xl border border-slate-700/70 bg-[#111a27] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Class</p>
            <h1 className="mt-2 text-xl font-semibold text-slate-100">{template.title}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {formatIsoCalendarDate(session.session_date, { dateStyle: 'full' })} |{' '}
              {session.start_time_local} - {session.end_time_local}
            </p>
            <span
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionStatusBadgeClass(
                session.status
              )}`}
            >
              {session.status}
            </span>
            {template.description && <p className="mt-3 text-sm text-slate-300">{template.description}</p>}
          </article>

          <article className="rounded-2xl border border-slate-700/70 bg-[#111a27] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">
              Participants
            </h2>
            <div className="mt-3 space-y-2">
              {participantItems.map((participant) => (
                <p
                  key={`${participant.role}-${participant.userId}`}
                  className="rounded-xl border border-slate-700 bg-[#0f1622] px-3 py-2 text-sm text-slate-200"
                >
                  <span className="font-medium">
                    {participantLabel(profileById.get(participant.userId), participant.userId)}
                  </span>
                  <span className="ml-2 text-xs uppercase tracking-[0.12em] text-slate-400">
                    {roleLabel(participant.role)}
                  </span>
                  {participant.joinedAt && (
                    <span className="ml-2 text-xs text-slate-500">
                      Joined {formatActivityTime(participant.joinedAt)}
                    </span>
                  )}
                </p>
              ))}
              {!hasStudentParticipants && (
                <p className="rounded-xl border border-slate-700 bg-[#0f1622] px-3 py-2 text-sm text-slate-300">
                  No students have joined yet.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className={brandUi.sectionTitle}>Notes / Whiteboard Area</h2>
            <SessionNotesPanel
              resourceId={session.id}
              initialNotes={savedNotes}
              isTeacher={isTeacher}
              isCompletedReviewMode={false}
              apiPath="/api/group-session-notes"
              resourceParam="sessionId"
            />
          </article>

          <article className="rounded-2xl border border-slate-200/80 bg-[#f7f6f3] p-4 shadow-sm lg:p-5">
            <h2 className={brandUi.sectionTitle}>Attendance / Session Activity</h2>
            {attendanceErrorMessage && <p className={brandUi.errorAlert}>{attendanceErrorMessage}</p>}
            <div className="mt-4 grid gap-3">
              {attendanceRows.length === 0 && !attendanceErrorMessage && (
                <p className={brandUi.mutedCard}>No session activity yet.</p>
              )}
              {attendanceRows.map((row) => (
                <article key={`${row.session_id}-${row.user_id}`} className={brandUi.card}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">
                      {participantLabel(profileById.get(row.user_id), row.user_id)}
                    </p>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${activityRoleBadgeClass(
                        row.role
                      )}`}
                    >
                      {roleLabel(row.role)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {roleLabel(row.role)} — joined {formatActivityTime(row.joined_at)}
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
