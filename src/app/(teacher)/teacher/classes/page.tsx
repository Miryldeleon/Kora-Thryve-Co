import Link from 'next/link'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { brandUi } from '@/lib/ui/branding'
import { cancelBooking, markBookingCompleted } from '../bookings/actions'

type TeacherClassesPageProps = {
  searchParams: Promise<Record<string, string | undefined>>
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

type TeacherGroupClassRpcRow = {
  template_id: string
  template_title: string
  session_id: string | null
  session_date: string | null
  start_time_local: string | null
  end_time_local: string | null
  status: string | null
  participant_count: number | null
}

type BookingRow = {
  id: string
  student_name: string | null
  starts_at: string
  ends_at: string
  status: string
}

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

function getOneOnOneActionLabel(status: string) {
  const normalized = status.trim().toLowerCase()
  if (normalized === 'confirmed') return 'Join Session'
  if (normalized === 'completed') return 'View Session'
  return null
}

function isConfirmedStatus(status: string) {
  return status.trim().toLowerCase() === 'confirmed'
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

export default async function TeacherClassesPage({ searchParams }: TeacherClassesPageProps) {
  const { supabase, user } = await requireApprovedTeacher()
  await searchParams
  const nowIso = new Date().toISOString()

  const [groupClassResult, bookingResult] = await Promise.all([
    supabase.rpc('get_teacher_classes_page_group_sessions'),
    supabase
      .from('bookings')
      .select('id, student_name, starts_at, ends_at, status')
      .eq('teacher_id', user.id)
      .eq('status', 'confirmed')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true }),
  ])

  if (groupClassResult.error) {
    throw new Error(groupClassResult.error.message)
  }

  if (bookingResult.error) {
    throw new Error(bookingResult.error.message)
  }

  const groupClassRows = (groupClassResult.data ?? []) as TeacherGroupClassRpcRow[]
  const templateRows = Array.from(
    new Map(
      groupClassRows.map((row) => [
        row.template_id,
        {
          id: row.template_id,
          title: row.template_title,
        },
      ])
    ).values()
  ) satisfies GroupTemplateRow[]

  const groupSessions: GroupSessionRow[] = groupClassRows
    .filter(
      (
        row
      ): row is TeacherGroupClassRpcRow & {
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
    .map((row) => ({
      id: row.session_id,
      template_id: row.template_id,
      session_date: row.session_date,
      start_time_local: row.start_time_local,
      end_time_local: row.end_time_local,
      status: row.status,
    }))
  const participantCountBySession = new Map(
    groupClassRows
      .filter((row) => row.session_id !== null)
      .map((row) => [row.session_id as string, row.participant_count ?? 0])
  )

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
        nextParticipantCount: nextSession?.participantCount ?? 0,
        upcomingSessionCount: sortedSessions.length,
        sessions: sortedSessions,
        sortValue: nextSession?.sortValue ?? Number.MAX_SAFE_INTEGER,
      }
    })
    .sort((a, b) => a.sortValue - b.sortValue)

  const bookings = (bookingResult.data ?? []) as BookingRow[]
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

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <header className={brandUi.header}>
          <p className={brandUi.eyebrow}>Kora Thryve</p>
          <h1 className={brandUi.title}>Classes</h1>
          <p className={brandUi.subtitle}>
            Your unified teaching schedule across group classes and 1-on-1 sessions.
          </p>
          <Link href="/teacher/sessions" className={`mt-4 ${brandUi.secondaryButton}`}>
            View Session History
          </Link>
        </header>

        <section className={brandUi.section}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={brandUi.sectionTitle}>Group Classes</h2>
              <p className="mt-1 text-sm text-slate-600">Recurring classes available to approved teachers.</p>
            </div>
            <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-indigo-700">
              Group
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {groupCards.length === 0 && <p className={brandUi.mutedCard}>No group classes available yet.</p>}
            {groupCards.map((group) => (
              <Link
                key={group.templateId}
                href={`/teacher/classes/${group.templateId}`}
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
                      {group.upcomingSessionCount === 1 ? '' : 's'} | Participants (next): {group.nextParticipantCount}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${classTypeBadgeClass('group')}`}>
                      Group
                    </span>
                    <span className="text-sm font-medium text-[#8b7758]">View Class</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={brandUi.section}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={brandUi.sectionTitle}>Upcoming 1-on-1 Sessions</h2>
              <p className="mt-1 text-sm text-slate-600">Confirmed sessions booked with your students.</p>
            </div>
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-amber-700">
              1-on-1
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {oneOnOneCards.length === 0 && <p className={brandUi.mutedCard}>No upcoming 1-on-1 sessions.</p>}
            {oneOnOneCards.map((oneOnOne) => {
              const actionLabel = getOneOnOneActionLabel(oneOnOne.status)
              return (
                <article key={oneOnOne.id} className={brandUi.card}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{oneOnOne.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{oneOnOne.subtitle}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {oneOnOne.dateLabel} | {oneOnOne.timeLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${classTypeBadgeClass('one_on_one')}`}>
                        1-on-1
                      </span>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${classStatusBadgeClass(oneOnOne.status)}`}>
                        {oneOnOne.status}
                      </span>
                    </div>
                  </div>
                  {(actionLabel || isConfirmedStatus(oneOnOne.status)) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {actionLabel && (
                        <Link href={oneOnOne.href} className={brandUi.primaryButton}>
                          {actionLabel}
                        </Link>
                      )}
                      {isConfirmedStatus(oneOnOne.status) && (
                        <>
                          <form action={markBookingCompleted}>
                            <input type="hidden" name="booking_id" value={oneOnOne.id} />
                            <input type="hidden" name="return_to" value="/teacher/classes" />
                            <button type="submit" className={brandUi.infoButton}>
                              Mark Completed
                            </button>
                          </form>
                          <form action={cancelBooking}>
                            <input type="hidden" name="booking_id" value={oneOnOne.id} />
                            <input type="hidden" name="return_to" value="/teacher/classes" />
                            <button type="submit" className={brandUi.dangerButton}>
                              Cancel Booking
                            </button>
                          </form>
                        </>
                      )}
                    </div>
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
