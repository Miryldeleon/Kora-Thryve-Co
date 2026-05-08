import Link from 'next/link'
import { requireApprovedStudent } from '@/lib/auth/student'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { brandUi } from '@/lib/ui/branding'

type StudentBookingRow = {
  id: string
  teacher_name: string | null
  starts_at: string
  ends_at: string
  status: 'confirmed' | 'completed' | 'cancelled' | string
}

type StudentGroupClassRpcRow = {
  template_id: string
  template_title: string
  template_timezone: string | null
  session_id: string | null
  session_date: string | null
  start_time_local: string | null
  end_time_local: string | null
  status: string | null
}

type GroupTemplateRow = {
  id: string
  title: string
  timezone: string | null
}

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
  nextSessionDateLabel: string
  nextSessionTimeLabel: string
  upcomingSessionCount: number
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

function sessionTypeBadgeClass(sessionType: 'group' | 'one_on_one') {
  if (sessionType === 'group') return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function sessionStatusBadgeClass(status: string) {
  const normalized = status.trim().toLowerCase()
  if (normalized === 'scheduled' || normalized === 'confirmed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (normalized === 'completed') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (normalized === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function getOneOnOneActionLabel(status: string) {
  return status.trim().toLowerCase() === 'confirmed' ? 'Join Session' : null
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

function normalizeLocalTime(value: string) {
  const [hour = '0', minute = '0', second = '0'] = value.split(':')
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`
}

function getCurrentDateTimeParts(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00'

  return {
    date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    time: `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`,
  }
}

function isCurrentOrFutureGroupSession({
  sessionDate,
  endTimeLocal,
  timezone,
}: {
  sessionDate: string
  endTimeLocal: string
  timezone: string
}) {
  const now = getCurrentDateTimeParts(timezone)
  if (sessionDate > now.date) return true
  if (sessionDate < now.date) return false
  return normalizeLocalTime(endTimeLocal) >= now.time
}

export default async function StudentClassesPage() {
  const { supabase, user } = await requireApprovedStudent()
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

  const oneOnOneCards: OneOnOneCard[] = ((bookingData ?? []) as StudentBookingRow[]).map(
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

  const { data: groupClassData, error: groupClassError } = await supabase.rpc(
    'get_student_classes_page_group_sessions'
  )

  if (groupClassError) {
    throw new Error(groupClassError.message)
  }

  const groupClassRows = (groupClassData ?? []) as StudentGroupClassRpcRow[]
  const templateRows = Array.from(
    new Map(
      groupClassRows.map((row) => [
        row.template_id,
        {
          id: row.template_id,
          title: row.template_title,
          timezone: row.template_timezone,
        },
      ])
    ).values()
  ) satisfies GroupTemplateRow[]

  const groupSessionItems: Array<GroupSessionListItem & { templateId: string }> = groupClassRows
    .filter(
      (
        row
      ): row is StudentGroupClassRpcRow & {
        session_id: string
        session_date: string
        start_time_local: string
        end_time_local: string
        status: string
      } =>
        row.session_id !== null &&
        row.session_date !== null &&
        row.start_time_local !== null &&
        row.end_time_local !== null &&
        row.status !== null
    )
    .filter((session) =>
      isCurrentOrFutureGroupSession({
        sessionDate: session.session_date,
        endTimeLocal: session.end_time_local,
        timezone: session.template_timezone || 'UTC',
      })
    )
    .map((session) => ({
      id: session.session_id,
      templateId: session.template_id,
      dateLabel: formatIsoCalendarDate(session.session_date, { dateStyle: 'medium' }),
      timeLabel: `${session.start_time_local} - ${session.end_time_local}`,
      status: session.status,
      sortValue: toLocalSessionSortValue(session.session_date, session.start_time_local),
      href: `/group-session/${session.session_id}`,
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

  const groupCards: GroupClassCard[] = templateRows
    .map((template) => {
      const sessions = groupItemsByTemplate.get(template.id) ?? []
      const sortedSessions = [...sessions].sort((a, b) => a.sortValue - b.sortValue)
      const nextSession = sortedSessions[0]

      return {
        templateId: template.id,
        className: template.title,
        nextSessionDateLabel: nextSession?.dateLabel || 'No upcoming session',
        nextSessionTimeLabel: nextSession?.timeLabel || '',
        upcomingSessionCount: sortedSessions.length,
        sortValue: nextSession?.sortValue ?? Number.MAX_SAFE_INTEGER,
      }
    })
    .sort((a, b) => a.sortValue - b.sortValue)

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <header className={brandUi.header}>
          <p className={brandUi.eyebrow}>Kora Thryve</p>
          <h1 className={brandUi.title}>Classes</h1>
          <p className={brandUi.subtitle}>
            Your current group classes and upcoming 1-on-1 learning sessions.
          </p>
          <Link href="/student/sessions" className={`mt-4 ${brandUi.secondaryButton}`}>
            View Session History
          </Link>
        </header>

        <section className={brandUi.section}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={brandUi.sectionTitle}>Group Classes</h2>
              <p className="mt-1 text-sm text-slate-600">Recurring classes you are enrolled in.</p>
            </div>
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionTypeBadgeClass('group')}`}>
              Group
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {groupCards.length === 0 && <p className={brandUi.mutedCard}>No group classes yet.</p>}
            {groupCards.map((group) => (
              <Link
                key={group.templateId}
                href={`/student/classes/${group.templateId}`}
                className={`${brandUi.card} block transition hover:-translate-y-0.5 hover:shadow-md`}
              >
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
                      {group.upcomingSessionCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-[#8b7758]">View Class</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={brandUi.section}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={brandUi.sectionTitle}>Upcoming 1-on-1 Sessions</h2>
              <p className="mt-1 text-sm text-slate-600">
                Confirmed sessions booked with your teachers.
              </p>
            </div>
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionTypeBadgeClass('one_on_one')}`}>
              1-on-1
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {oneOnOneCards.length === 0 && (
              <div className={brandUi.mutedCard}>
                <p>No upcoming 1-on-1 sessions.</p>
                <Link href="/student/booking" className={`mt-3 ${brandUi.primaryButton}`}>
                  Book Session
                </Link>
              </div>
            )}

            {oneOnOneCards.map((oneOnOne) => {
              const actionLabel = getOneOnOneActionLabel(oneOnOne.status)
              return (
                <article key={oneOnOne.id} className={brandUi.card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{oneOnOne.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {oneOnOne.dateLabel} | {oneOnOne.timeLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionTypeBadgeClass('one_on_one')}`}>
                        1-on-1
                      </span>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionStatusBadgeClass(oneOnOne.status)}`}>
                        {oneOnOne.status}
                      </span>
                    </div>
                  </div>

                  {actionLabel && (
                    <Link href={oneOnOne.href} className={`mt-4 ${brandUi.primaryButton}`}>
                      {actionLabel}
                    </Link>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
