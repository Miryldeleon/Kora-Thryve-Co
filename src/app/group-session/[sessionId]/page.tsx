import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getFutureJitsiAuthToken, getJitsiPublicConfig } from '@/lib/session/jitsi'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { brandUi } from '@/lib/ui/branding'
import SessionMeetingStage from '@/components/session/session-meeting-stage'
import TeachingTools from '@/components/session/teaching-tools'
import SessionNotesPanel from '@/components/session/session-notes-panel'
import { TEACHER_MODULES_BUCKET } from '@/lib/modules/config'

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

type GroupSessionRoomAccessRow = {
  session_id: string
  template_id: string
  teacher_id: string
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

type GroupSessionParticipantRow = {
  id: string
  student_profile_id: string
}

type GroupAttendanceRow = {
  session_id: string
  user_id: string
  role: 'teacher' | 'student'
  joined_at: string
}

type GroupSessionTeacherPresenceRow = {
  teacher_has_joined: boolean
  teacher_joined_at: string | null
}

type GroupSessionNotesRow = {
  notes: string
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

type SessionModule = {
  id: string
  folder_id: string | null
  title: string
  description: string | null
  teacher_name: string | null
  storage_path: string
}

type SessionFolder = {
  id: string
  name: string
}

type SessionModuleWithUrl = SessionModule & {
  signedUrl: string | null
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
  const { sessionId } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: accessData, error: accessError } = await supabase
    .rpc('get_group_session_room_access', { target_session_id: sessionId })
    .maybeSingle()

  if (accessError || !accessData) {
    return <UnauthorizedState />
  }

  const access = accessData as GroupSessionRoomAccessRow
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
  if (access.access_role !== 'teacher' && access.access_role !== 'student') {
    return <UnauthorizedState />
  }

  const isTeacher = access.access_role === 'teacher'
  const backHref = isTeacher ? '/teacher/classes?type=group' : '/student/classes?type=group'

  if (session.status === 'cancelled' || session.status === 'completed') {
    return <SessionUnavailableState status={session.status} backHref={backHref} />
  }

  const role = isTeacher ? 'teacher' : 'student'
  const displayName = isTeacher ? 'Teacher' : 'Student'
  const jitsiConfig = getJitsiPublicConfig()
  const isHostedMode = jitsiConfig.domain === '8x8.vc' || Boolean(jitsiConfig.appId)
  let jitsiAuthToken: string | null = null
  let jitsiTokenErrorMessage: string | null = null

  try {
    jitsiAuthToken = await getFutureJitsiAuthToken({
      bookingId: session.id,
      userId: user.id,
      role,
      displayName,
      roomName: session.meeting_room_name,
      roomPrefix: jitsiConfig.roomPrefix,
    })
  } catch {
    jitsiTokenErrorMessage =
      'Live meeting is temporarily unavailable. Please refresh in a moment or contact support.'
  }

  const { data: attendanceData, error: attendanceError } = await supabase
    .rpc('get_group_session_attendance_snapshot', { target_session_id: session.id })

  const attendanceErrorMessage = attendanceError?.message
  const attendanceRows = ((attendanceData ?? []) as GroupAttendanceRow[]).sort((a, b) => {
    if (a.role === b.role) {
      return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
    }
    return a.role === 'teacher' ? -1 : 1
  })

  const { data: teacherPresenceData, error: teacherPresenceError } = await supabase
    .rpc('get_group_session_teacher_presence', { target_session_id: session.id })
    .maybeSingle()

  if (teacherPresenceError) {
    throw new Error(teacherPresenceError.message)
  }

  const teacherPresence = teacherPresenceData as GroupSessionTeacherPresenceRow | null
  const teacherHasJoined = Boolean(teacherPresence?.teacher_has_joined)

  const { data: notesData, error: notesLoadError } = await supabase
    .rpc('get_group_session_notes', { target_session_id: session.id })
    .maybeSingle()

  if (notesLoadError) {
    throw new Error(notesLoadError.message)
  }

  const noteRow = notesData as GroupSessionNotesRow | null
  const savedNotes = noteRow?.notes ?? ''

  const { data: participantData, error: participantError } = await supabase
    .from('group_class_session_participants')
    .select('id, student_profile_id')
    .eq('session_id', session.id)
    .eq('is_active', true)

  if (participantError) {
    throw new Error(participantError.message)
  }

  const participants = (participantData ?? []) as GroupSessionParticipantRow[]
  const studentIds = participants.map((row) => row.student_profile_id)
  const profileIds = Array.from(
    new Set([access.teacher_id, ...studentIds, ...attendanceRows.map((row) => row.user_id)])
  )
  let profileById = new Map<string, ProfileRow>()
  if (profileIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', profileIds)

    if (profileError) {
      throw new Error(profileError.message)
    }

    profileById = new Map(((profileData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
  }

  const participantByUserRole = new Map<string, ParticipantListItem>()
  const teacherAttendance = attendanceRows.find((row) => row.role === 'teacher')
  participantByUserRole.set(`teacher:${access.teacher_id}`, {
    userId: access.teacher_id,
    role: 'teacher',
    joinedAt: teacherAttendance?.joined_at ?? null,
  })

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

  const { data: modulesData, error: modulesError } = await supabase
    .from('modules')
    .select('id, folder_id, title, description, teacher_name, storage_path')
    .order('created_at', { ascending: false })

  if (modulesError) {
    throw new Error(modulesError.message)
  }

  const { data: folderData, error: folderError } = await supabase
    .from('module_folders')
    .select('id, name')
    .order('created_at', { ascending: true })

  if (folderError) {
    throw new Error(folderError.message)
  }

  const modules = (modulesData ?? []) as SessionModule[]
  const folders = (folderData ?? []) as SessionFolder[]
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
              {isHostedMode && (jitsiTokenErrorMessage || !jitsiAuthToken) ? (
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
                    domain: jitsiConfig.domain,
                    appId: jitsiConfig.appId,
                    roomPrefix: jitsiConfig.roomPrefix,
                    authToken: jitsiAuthToken,
                    roomName: session.meeting_room_name,
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
                  stateApiPath="/api/group-session-teaching-state"
                  stateResourceParam="sessionId"
                  folders={folders}
                  modules={modulesWithUrls.map((module) => ({
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
