import Link from 'next/link'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { brandUi } from '@/lib/ui/branding'
import { createClient } from '@supabase/supabase-js'


type TeacherClassesPageProps = {
  searchParams: Promise<{
    type?: string
  }>
}

type GroupSessionRow = {
  id: string
  template_id: string
  session_date: string
  start_time_local: string
  end_time_local: string
  status: 'scheduled' | 'completed' | 'cancelled' | string
}

type GroupTemplateRow = {
  id: string
  title: string
}

type GroupParticipantRow = {
  session_id: string
}

type BookingRow = {
  id: string
  student_name: string | null
  starts_at: string
  ends_at: string
  status: string
}

type FilterType = 'all' | 'group' | 'one_on_one'

type GroupSessionListItem = {
  id: string
  dateLabel: string
  timeLabel: string
  status: string
  participantCount: number
  href: string
  sortValue: number
}

type GroupClassCard = {
  templateId: string
  className: string
  nextSessionDateLabel: string
  nextSessionTimeLabel: string
  nextParticipantCount: number
  upcomingSessionCount: number
  sessions: GroupSessionListItem[]
  sortValue: number
}

type OneOnOneCard = {
  id: string
  title: string
  subtitle: string
  dateLabel: string
  timeLabel: string
  status: string
  href: string
  sortValue: number
}

type CombinedCard =
  | { kind: 'group'; sortValue: number; payload: GroupClassCard }
  | { kind: 'one_on_one'; sortValue: number; payload: OneOnOneCard }

const FILTERS: Array<{ id: FilterType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'group', label: 'Group' },
  { id: 'one_on_one', label: '1-on-1' },
]

function toFilterType(value: string | undefined): FilterType {
  if (value === 'group' || value === 'one_on_one') return value
  return 'all'
}

function classTypeBadgeClass(type: 'group' | 'one_on_one') {
  if (type === 'group') return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function classStatusBadgeClass(status: string) {
  if (status === 'scheduled' || status === 'confirmed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (status === 'completed') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function formatGroupDate(sessionDate: string) {
  return formatIsoCalendarDate(sessionDate, { dateStyle: 'medium' })
}

function formatGroupTime(startTimeLocal: string, endTimeLocal: string) {
  return `${startTimeLocal} - ${endTimeLocal}`
}

function formatBookingDate(startsAt: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(startsAt))
}

function formatBookingTime(startsAt: string, endsAt: string) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const startText = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(start)
  const endText = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(end)
  return `${startText} - ${endText}`
}

function toLocalSessionSortValue(sessionDate: string, startTimeLocal: string) {
  const normalized = `${sessionDate}${startTimeLocal}`.replace(/[^0-9]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
}

function createAdminClientOrNull() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export default async function TeacherClassesPage({ searchParams }: TeacherClassesPageProps) {
  const { supabase, user } = await requireApprovedTeacher()
  const adminClient = createAdminClientOrNull()
  const groupReadClient = adminClient ?? supabase
  const isDebug = process.env.NODE_ENV !== 'production'
  const { type } = await searchParams
  const activeFilter = toFilterType(type)
  const nowIso = new Date().toISOString()
  const queryClientPath: 'admin_service_role' | 'authenticated_fallback' = adminClient
    ? 'admin_service_role'
    : 'authenticated_fallback'
  if (!adminClient && isDebug) {
    console.warn('[teacher/classes] service role key missing, falling back to authenticated client')
  }

  const { data: teacherTemplateData, error: teacherTemplateError } = await groupReadClient
    .from('group_class_templates')
    .select('id, title')
    .eq('teacher_id', user.id)
  if (teacherTemplateError) {
    throw new Error(teacherTemplateError.message)
  }
  const templateRows = (teacherTemplateData ?? []) as GroupTemplateRow[]
  const templateById = new Map(templateRows.map((template) => [template.id, template.title]))

  const { data: groupSessionData, error: groupSessionError } = await groupReadClient
    .from('group_class_sessions')
    .select('id, template_id, session_date, start_time_local, end_time_local, status')
    .eq('teacher_id', user.id)
    .eq('is_active', true)
    .eq('status', 'scheduled')
    .order('session_date', { ascending: true })
    .order('start_time_local', { ascending: true })
  if (groupSessionError) {
    throw new Error(groupSessionError.message)
  }

  const rawGroupSessions = (groupSessionData ?? []) as GroupSessionRow[]
  const groupSessions = rawGroupSessions
  if (isDebug) {
    console.log('[teacher/classes] group query debug', {
      userId: user.id,
      clientPath: queryClientPath,
      rawTemplateCount: templateRows.length,
      rawSessionCount: groupSessions.length,
      sampleSessionIds: groupSessions.slice(0, 10).map((row) => row.id),
    })
  }

  const groupSessionIds = groupSessions.map((session) => session.id)
  const participantCountBySession = new Map<string, number>()
  if (groupSessionIds.length > 0) {
    const { data: participantData, error: participantError } = await groupReadClient
      .from('group_class_session_participants')
      .select('session_id')
      .eq('is_active', true)
      .in('session_id', groupSessionIds)

    if (participantError) {
      throw new Error(participantError.message)
    }

    for (const participant of (participantData ?? []) as GroupParticipantRow[]) {
      participantCountBySession.set(
        participant.session_id,
        (participantCountBySession.get(participant.session_id) ?? 0) + 1
      )
    }
  }

  const groupSessionItems: GroupSessionListItem[] = groupSessions.map((session) => {
    return {
      id: session.id,
      dateLabel: formatGroupDate(session.session_date),
      timeLabel: formatGroupTime(session.start_time_local, session.end_time_local),
      status: session.status,
      participantCount: participantCountBySession.get(session.id) ?? 0,
      href: `/group-session/${session.id}`,
      sortValue: toLocalSessionSortValue(session.session_date, session.start_time_local),
    }
  })

  const groupItemsByTemplate = new Map<string, GroupSessionListItem[]>()
  for (const session of groupSessions) {
    const list = groupItemsByTemplate.get(session.template_id) ?? []
    const sessionItem = groupSessionItems.find((row) => row.id === session.id)
    if (sessionItem) list.push(sessionItem)
    groupItemsByTemplate.set(session.template_id, list)
  }

  const groupCards: GroupClassCard[] = Array.from(groupItemsByTemplate.entries())
    .map(([templateId, sessions]) => {
      const sortedSessions = [...sessions].sort((a, b) => a.sortValue - b.sortValue)
      const nextSession = sortedSessions[0]
      return {
        templateId,
        className: templateById.get(templateId) || 'Recurring Class',
        nextSessionDateLabel: nextSession?.dateLabel || 'No upcoming session',
        nextSessionTimeLabel: nextSession?.timeLabel || '',
        nextParticipantCount: nextSession?.participantCount ?? 0,
        upcomingSessionCount: sortedSessions.length,
        sessions: sortedSessions,
        sortValue: nextSession?.sortValue ?? Number.MAX_SAFE_INTEGER,
      }
    })
    .sort((a, b) => a.sortValue - b.sortValue)
  if (isDebug) {
    console.log('[teacher/classes] group cards debug', {
      userId: user.id,
      groupedCardCount: groupCards.length,
    })
  }

  const { data: bookingData, error: bookingError } = await supabase
    .from('bookings')
    .select('id, student_name, starts_at, ends_at, status')
    .eq('teacher_id', user.id)
    .eq('status', 'confirmed')
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true })

  if (bookingError) {
    throw new Error(bookingError.message)
  }

  const bookings = (bookingData ?? []) as BookingRow[]
  const oneOnOneCards: OneOnOneCard[] = bookings.map((booking) => ({
    id: booking.id,
    title: booking.student_name || '1-on-1 Student',
    subtitle: '1-on-1 session',
    dateLabel: formatBookingDate(booking.starts_at),
    timeLabel: formatBookingTime(booking.starts_at, booking.ends_at),
    status: booking.status,
    href: `/session/${booking.id}`,
    sortValue: Date.parse(booking.starts_at),
  }))

  const combinedCards: CombinedCard[] = [
    ...groupCards.map((card) => ({ kind: 'group' as const, sortValue: card.sortValue, payload: card })),
    ...oneOnOneCards.map((card) => ({
      kind: 'one_on_one' as const,
      sortValue: card.sortValue,
      payload: card,
    })),
  ]
    .filter((item) => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'group') return item.kind === 'group'
      return item.kind === 'one_on_one'
    })
    .sort((a, b) => a.sortValue - b.sortValue)

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <header className={brandUi.header}>
          <p className={brandUi.eyebrow}>Kora Thryve</p>
          <h1 className={brandUi.title}>Classes</h1>
          <p className={brandUi.subtitle}>
            Your unified upcoming teaching schedule across group classes and 1-on-1 sessions.
          </p>
        </header>

        <section className={brandUi.section}>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {FILTERS.map((filter) => (
              <Link
                key={filter.id}
                href={filter.id === 'all' ? '/teacher/classes' : `/teacher/classes?type=${filter.id}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  activeFilter === filter.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {combinedCards.length === 0 && (
              <p className={brandUi.mutedCard}>
                No upcoming classes yet. Your future group sessions and 1-on-1 bookings will appear
                here.
              </p>
            )}

            {combinedCards.map((card) => {
              if (card.kind === 'group') {
                const group = card.payload
                return (
                  <details key={`group-${group.templateId}`} className={brandUi.card}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-indigo-700">↻</span>
                            <p className="text-base font-semibold text-slate-900">{group.className}</p>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            Next: {group.nextSessionDateLabel}
                            {group.nextSessionTimeLabel ? ` | ${group.nextSessionTimeLabel}` : ''}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {group.upcomingSessionCount} upcoming session
                            {group.upcomingSessionCount === 1 ? '' : 's'} | Participants (next):{' '}
                            {group.nextParticipantCount}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${classTypeBadgeClass(
                              'group'
                            )}`}
                          >
                            Group
                          </span>
                          <span className="text-slate-500">▾</span>
                        </div>
                      </div>
                    </summary>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="space-y-2">
                        {group.sessions.map((session) => (
                          <article
                            key={session.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {session.dateLabel} | {session.timeLabel}
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                  Participants: {session.participantCount}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] ${classStatusBadgeClass(
                                    session.status
                                  )}`}
                                >
                                  {session.status}
                                </span>
                                <Link href={session.href} className={brandUi.secondaryButton}>
                                  Open Session
                                </Link>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  </details>
                )
              }

              const oneOnOne = card.payload
              return (
                <article key={`one-${oneOnOne.id}`} className={brandUi.card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{oneOnOne.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{oneOnOne.subtitle}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {oneOnOne.dateLabel} | {oneOnOne.timeLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${classTypeBadgeClass(
                          'one_on_one'
                        )}`}
                      >
                        1-on-1
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${classStatusBadgeClass(
                          oneOnOne.status
                        )}`}
                      >
                        {oneOnOne.status}
                      </span>
                    </div>
                  </div>

                  <Link href={oneOnOne.href} className={`mt-4 ${brandUi.primaryButton}`}>
                    Open Session
                  </Link>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
