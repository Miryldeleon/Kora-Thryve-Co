import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { brandUi } from '@/lib/ui/branding'
import Link from 'next/link'

type TeacherGroupSessionDetailPageProps = {
  params: Promise<{
    sessionId: string
  }>
}

type GroupSession = {
  id: string
  template_id: string
  teacher_id: string
  session_date: string
  start_time_local: string
  end_time_local: string
  status: 'scheduled' | 'completed' | 'cancelled' | string
  meeting_room_name: string
}

type GroupClassTemplate = {
  id: string
  teacher_id: string
  title: string
  description: string | null
}

type GroupSessionParticipant = {
  id: string
  student_profile_id: string
}

type StudentProfile = {
  id: string
  full_name: string | null
  email: string | null
}

function groupStatusBadgeClass(status: string) {
  if (status === 'scheduled') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'completed') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function formatSessionDate(sessionDate: string) {
  return formatIsoCalendarDate(sessionDate, { dateStyle: 'full' })
}

function studentDisplayName(profile: StudentProfile | undefined, fallbackId: string) {
  return profile?.full_name?.trim() || profile?.email || fallbackId
}

function UnauthorizedState() {
  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <section className={brandUi.section}>
          <h1 className="text-2xl font-semibold">Session not found or unauthorized</h1>
          <p className="mt-2 text-sm text-slate-600">
            You do not have access to this group session.
          </p>
          <Link href="/teacher/group-sessions" className={`mt-4 ${brandUi.secondaryButton}`}>
            Back to Group Sessions
          </Link>
        </section>
      </div>
    </main>
  )
}

export default async function TeacherGroupSessionDetailPage({
  params,
}: TeacherGroupSessionDetailPageProps) {
  const { sessionId } = await params
  const { supabase, user } = await requireApprovedTeacher()

  const { data: sessionData, error: sessionError } = await supabase
    .from('group_class_sessions')
    .select(
      'id, template_id, teacher_id, session_date, start_time_local, end_time_local, status, meeting_room_name'
    )
    .eq('id', sessionId)
    .eq('is_active', true)
    .maybeSingle()

  if (sessionError || !sessionData) {
    return <UnauthorizedState />
  }

  const session = sessionData as GroupSession
  const { data: templateData, error: templateError } = await supabase
    .from('group_class_templates')
    .select('id, teacher_id, title, description')
    .eq('id', session.template_id)
    .eq('is_active', true)
    .maybeSingle()

  if (templateError || !templateData) {
    return <UnauthorizedState />
  }

  const template = templateData as GroupClassTemplate
  if (template.teacher_id !== user.id) {
    return <UnauthorizedState />
  }

  const { data: participantData, error: participantError } = await supabase
    .from('group_class_session_participants')
    .select('id, student_profile_id')
    .eq('session_id', session.id)
    .eq('is_active', true)

  if (participantError) {
    throw new Error(participantError.message)
  }

  const participants = (participantData ?? []) as GroupSessionParticipant[]
  const studentIds = participants.map((row) => row.student_profile_id)

  let profileById = new Map<string, StudentProfile>()
  if (studentIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds)

    if (profileError) {
      throw new Error(profileError.message)
    }

    profileById = new Map(
      ((profileData ?? []) as StudentProfile[]).map((profile) => [profile.id, profile])
    )
  }

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <header className={brandUi.header}>
          <p className={brandUi.eyebrow}>Kora Thryve</p>
          <h1 className={brandUi.title}>Group Session Detail</h1>
          <p className={brandUi.subtitle}>
            Review session information and participant snapshots for your upcoming class.
          </p>
        </header>

        <section className={brandUi.section}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{template.title}</h2>
              <p className="mt-2 text-sm text-slate-600">
                {formatSessionDate(session.session_date)} | {session.start_time_local} -{' '}
                {session.end_time_local}
              </p>
              <p className="mt-1 text-sm text-slate-600">Participants: {participants.length}</p>
              <p className="mt-1 break-all text-xs text-slate-500">Room: {session.meeting_room_name}</p>
            </div>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${groupStatusBadgeClass(
                session.status
              )}`}
            >
              {session.status}
            </span>
          </div>

          {template.description && (
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {template.description}
            </p>
          )}
        </section>

        <section className={brandUi.section}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={brandUi.sectionTitle}>Participants</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {participants.length} student{participants.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {participants.length === 0 && (
              <p className={brandUi.mutedCard}>No participant snapshots for this session yet.</p>
            )}
            {participants.map((participant) => (
              <article
                key={participant.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                {studentDisplayName(profileById.get(participant.student_profile_id), participant.student_profile_id)}
              </article>
            ))}
          </div>

          <Link href="/teacher/group-sessions" className={`mt-4 ${brandUi.secondaryButton}`}>
            Back to Group Sessions
          </Link>
        </section>
      </div>
    </main>
  )
}
