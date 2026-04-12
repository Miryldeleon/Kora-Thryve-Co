import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { brandUi } from '@/lib/ui/branding'

type TeacherGroupSession = {
  id: string
  template_id: string
  session_date: string
  start_time_local: string
  end_time_local: string
  status: 'scheduled' | 'completed' | 'cancelled' | string
  meeting_room_name: string
}

type GroupClassTemplate = {
  id: string
  title: string
}

type GroupSessionParticipant = {
  session_id: string
}

function groupStatusBadgeClass(status: string) {
  if (status === 'scheduled') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'completed') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function formatSessionDate(sessionDate: string) {
  const parsed = new Date(`${sessionDate}T00:00:00.000Z`)
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(parsed)
}

function formatSessionTimeRange(start: string, end: string) {
  return `${start} - ${end}`
}

export default async function TeacherGroupSessionsPage() {
  const { supabase, user } = await requireApprovedTeacher()
  const todayIsoDate = new Date().toISOString().slice(0, 10)

  const { data: sessionData, error: sessionError } = await supabase
    .from('group_class_sessions')
    .select('id, template_id, session_date, start_time_local, end_time_local, status, meeting_room_name')
    .eq('is_active', true)
    .eq('teacher_id', user.id)
    .eq('status', 'scheduled')
    .gte('session_date', todayIsoDate)
    .order('session_date', { ascending: true })
    .order('start_time_local', { ascending: true })

  if (sessionError) {
    throw new Error(sessionError.message)
  }

  const sessions = (sessionData ?? []) as TeacherGroupSession[]
  const templateIds = Array.from(new Set(sessions.map((session) => session.template_id)))
  const sessionIds = sessions.map((session) => session.id)

  let templateById = new Map<string, string>()
  if (templateIds.length > 0) {
    const { data: templateData, error: templateError } = await supabase
      .from('group_class_templates')
      .select('id, title')
      .eq('is_active', true)
      .in('id', templateIds)

    if (templateError) {
      throw new Error(templateError.message)
    }

    templateById = new Map(
      ((templateData ?? []) as GroupClassTemplate[]).map((template) => [template.id, template.title])
    )
  }

  let participantCountBySession = new Map<string, number>()
  if (sessionIds.length > 0) {
    const { data: participantData, error: participantError } = await supabase
      .from('group_class_session_participants')
      .select('session_id')
      .eq('is_active', true)
      .in('session_id', sessionIds)

    if (participantError) {
      throw new Error(participantError.message)
    }

    participantCountBySession = new Map<string, number>()
    for (const participant of (participantData ?? []) as GroupSessionParticipant[]) {
      participantCountBySession.set(
        participant.session_id,
        (participantCountBySession.get(participant.session_id) ?? 0) + 1
      )
    }
  }

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <header className={brandUi.header}>
          <p className={brandUi.eyebrow}>Kora Thryve</p>
          <h1 className={brandUi.title}>Group Sessions</h1>
          <p className={brandUi.subtitle}>
            Review your upcoming scheduled group classes and open each session detail.
          </p>
        </header>

        <section className={brandUi.section}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={brandUi.sectionTitle}>Upcoming Scheduled Sessions</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {sessions.length} session{sessions.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {sessions.length === 0 && (
              <p className={brandUi.mutedCard}>No upcoming scheduled group sessions yet.</p>
            )}

            {sessions.map((session) => (
              <article key={session.id} className={brandUi.card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {templateById.get(session.template_id) || 'Recurring Class'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatSessionDate(session.session_date)} |{' '}
                      {formatSessionTimeRange(session.start_time_local, session.end_time_local)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Participants: {participantCountBySession.get(session.id) ?? 0}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${groupStatusBadgeClass(
                      session.status
                    )}`}
                  >
                    {session.status}
                  </span>
                </div>

                <a href={`/teacher/group-sessions/${session.id}`} className={`mt-4 ${brandUi.primaryButton}`}>
                  View Session
                </a>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
