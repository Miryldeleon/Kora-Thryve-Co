import Link from 'next/link'
import { requireApprovedStudent } from '@/lib/auth/student'
import { formatIsoCalendarDate, getTodayIsoDateForTimezone } from '@/lib/group-classes/date'
import { brandUi } from '@/lib/ui/branding'

type StudentClassesPageProps = {
  searchParams: Promise<{
    type?: string
  }>
}

type StudentBookingRow = {
  id: string
  teacher_name: string | null
  starts_at: string
  ends_at: string
  status: 'confirmed' | 'completed' | 'cancelled' | string
}

type StudentGroupSessionRow = {
  id: string
  template_id: string
  session_date: string
  start_time_local: string
  end_time_local: string
  status: 'scheduled' | 'completed' | 'cancelled' | string
}

type StudentEnrollmentRow = {
  template_id: string
}

type GroupTemplateRow = {
  id: string
  title: string
  timezone: string | null
  teacher_id: string
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type FilterType = 'all' | 'group' | 'one_on_one'

type GroupSessionListItem = {
  id: string
  dateLabel: string
  timeLabel: string
  status: string
  href: string
  sortValue: number
}

type GroupClassCard = {
  templateId: string
  className: string
  teacherName: string
  nextSessionDateLabel: string
  nextSessionTimeLabel: string
  upcomingSessionCount: number
  sessions: GroupSessionListItem[]
  sortValue: number
}

type OneOnOneCard = {
  id: string
  title: string
  dateLabel: string
  timeLabel: string
  status: string
  sortValue: number
  href: string
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

function sessionTypeBadgeClass(sessionType: 'group' | 'one_on_one') {
  if (sessionType === 'group') return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function sessionStatusBadgeClass(status: string) {
  if (status === 'scheduled' || status === 'confirmed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (status === 'completed') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
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

export default async function StudentClassesPage({ searchParams }: StudentClassesPageProps) {
  const { supabase, user } = await requireApprovedStudent()
  const { type } = await searchParams
  const activeFilter = toFilterType(type)

  const nowIso = new Date().toISOString()
  const { data: bookingData, error: bookingError } = await supabase
    .from('bookings')
    .select('id, teacher_name, starts_at, ends_at, status')
    .eq('student_id', user.id)
    .eq('status', 'confirmed')
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true })

  if (bookingError) {
    throw new Error(bookingError.message)
  }

  const oneOnOneItems: OneOnOneCard[] = ((bookingData ?? []) as StudentBookingRow[]).map(
    (booking) => ({
      id: booking.id,
      title: booking.teacher_name || '1-on-1 Teacher',
      dateLabel: formatBookingDate(booking.starts_at),
      timeLabel: formatBookingTime(booking.starts_at, booking.ends_at),
      status: booking.status,
      sortValue: Date.parse(booking.starts_at),
      href: `/session/${booking.id}`,
    })
  )

  let rawGroupSessions: StudentGroupSessionRow[] = []
  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from('group_class_enrollments')
    .select('template_id')
    .eq('student_id', user.id)
    .eq('is_active', true)

  if (enrollmentError) {
    throw new Error(enrollmentError.message)
  }

  const enrolledTemplateIds = Array.from(
    new Set(((enrollmentData ?? []) as StudentEnrollmentRow[]).map((row) => row.template_id))
  )

  if (enrolledTemplateIds.length > 0) {
    const { data: groupSessionData, error: groupSessionError } = await supabase
      .from('group_class_sessions')
      .select('id, template_id, session_date, start_time_local, end_time_local, status')
      .eq('is_active', true)
      .eq('status', 'scheduled')
      .in('template_id', enrolledTemplateIds)
      .order('session_date', { ascending: true })
      .order('start_time_local', { ascending: true })

    if (groupSessionError) {
      throw new Error(groupSessionError.message)
    }

    rawGroupSessions = (groupSessionData ?? []) as StudentGroupSessionRow[]
  }

  const templateIds = Array.from(new Set(rawGroupSessions.map((row) => row.template_id)))
  let templateById = new Map<string, GroupTemplateRow>()
  if (templateIds.length > 0) {
    const { data: templateData, error: templateError } = await supabase
      .from('group_class_templates')
      .select('id, title, timezone, teacher_id')
      .in('id', templateIds)

    if (templateError) {
      throw new Error(templateError.message)
    }

    templateById = new Map(
      ((templateData ?? []) as GroupTemplateRow[]).map((template) => [template.id, template])
    )
  }

  const teacherIds = Array.from(new Set(Array.from(templateById.values()).map((template) => template.teacher_id)))
  let teacherProfileById = new Map<string, ProfileRow>()
  if (teacherIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', teacherIds)

    if (profileError) {
      throw new Error(profileError.message)
    }

    teacherProfileById = new Map(((profileData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
  }

  const groupSessionItems: Array<GroupSessionListItem & { templateId: string }> = rawGroupSessions
    .filter((session) => {
      const timezone = templateById.get(session.template_id)?.timezone || 'UTC'
      return session.session_date >= getTodayIsoDateForTimezone(timezone)
    })
    .map((session) => ({
      id: session.id,
      templateId: session.template_id,
      dateLabel: formatIsoCalendarDate(session.session_date, { dateStyle: 'medium' }),
      timeLabel: `${session.start_time_local} - ${session.end_time_local}`,
      status: session.status,
      sortValue: toLocalSessionSortValue(session.session_date, session.start_time_local),
      href: `/group-session/${session.id}`,
    }))

  const groupItemsByTemplate = new Map<string, GroupSessionListItem[]>()
  groupSessionItems.forEach((session) => {
    const list = groupItemsByTemplate.get(session.templateId) ?? []
    list.push({
      id: session.id,
      dateLabel: session.dateLabel,
      timeLabel: session.timeLabel,
      status: session.status,
      href: session.href,
      sortValue: session.sortValue,
    })
    groupItemsByTemplate.set(session.templateId, list)
  })

  const groupCards: GroupClassCard[] = Array.from(templateById.values())
    .map((template) => {
      const sessions = groupItemsByTemplate.get(template.id) ?? []
      const sortedSessions = [...sessions].sort((a, b) => a.sortValue - b.sortValue)
      const nextSession = sortedSessions[0]
      const teacherProfile = teacherProfileById.get(template.teacher_id)

      return {
        templateId: template.id,
        className: template.title,
        teacherName: teacherProfile?.full_name?.trim() || teacherProfile?.email || 'Teacher',
        nextSessionDateLabel: nextSession?.dateLabel || 'No upcoming session',
        nextSessionTimeLabel: nextSession?.timeLabel || '',
        upcomingSessionCount: sortedSessions.length,
        sessions: sortedSessions,
        sortValue: nextSession?.sortValue ?? Number.MAX_SAFE_INTEGER,
      }
    })
    .sort((a, b) => a.sortValue - b.sortValue)

  const classItems: CombinedCard[] = [
    ...groupCards.map((card) => ({ kind: 'group' as const, sortValue: card.sortValue, payload: card })),
    ...oneOnOneItems.map((card) => ({
      kind: 'one_on_one' as const,
      sortValue: card.sortValue,
      payload: card,
    })),
  ]
    .filter((item) => {
      if (activeFilter === 'all') return true
      return item.kind === activeFilter
    })
    .sort((a, b) => a.sortValue - b.sortValue)

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <header className={brandUi.header}>
          <p className={brandUi.eyebrow}>Kora Thryve</p>
          <h1 className={brandUi.title}>Classes</h1>
          <p className={brandUi.subtitle}>
            Your unified upcoming schedule across recurring group classes and 1-on-1 sessions.
          </p>
        </header>

        <section className={brandUi.section}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {FILTERS.map((filter) => (
                <Link
                  key={filter.id}
                  href={filter.id === 'all' ? '/student/classes' : `/student/classes?type=${filter.id}`}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    activeFilter === filter.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
            <Link href="/student/sessions" className={brandUi.secondaryButton}>
              View Session History
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {classItems.length === 0 && (
              <p className={brandUi.mutedCard}>
                No upcoming classes yet. Your future group and 1-on-1 sessions will appear here.
              </p>
            )}

            {classItems.map((item) => {
              if (item.kind === 'group') {
                const group = item.payload
                return (
                  <Link
                    key={`group-${group.templateId}`}
                    href={`/student/classes/${group.templateId}`}
                    className={`${brandUi.card} block transition hover:-translate-y-0.5 hover:shadow-md`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-indigo-700">↻</span>
                          <p className="text-base font-semibold text-slate-900">{group.className}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">Teacher: {group.teacherName}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Next: {group.nextSessionDateLabel}
                          {group.nextSessionTimeLabel ? ` | ${group.nextSessionTimeLabel}` : ''}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {group.upcomingSessionCount} upcoming session
                          {group.upcomingSessionCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionTypeBadgeClass(
                            'group'
                          )}`}
                        >
                          Group
                        </span>
                        <span className="text-sm font-medium text-[#8b7758]">View Class</span>
                      </div>
                    </div>
                  </Link>
                )
              }

              const oneOnOne = item.payload
              return (
                <article key={`one-${oneOnOne.id}`} className={brandUi.card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{oneOnOne.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {oneOnOne.dateLabel} | {oneOnOne.timeLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionTypeBadgeClass(
                          'one_on_one'
                        )}`}
                      >
                        1-on-1
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionStatusBadgeClass(
                          oneOnOne.status
                        )}`}
                      >
                        {oneOnOne.status}
                      </span>
                    </div>
                  </div>

                  <Link href={oneOnOne.href} className={`mt-4 ${brandUi.primaryButton}`}>
                    Join Session
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
