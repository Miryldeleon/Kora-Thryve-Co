import { formatDateTimeRange } from '@/lib/booking/format'
import { requireApprovedStudent } from '@/lib/auth/student'
import { brandUi } from '@/lib/ui/branding'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { getStudentDashboardReads } from '@/lib/services/booking-service'
import Link from 'next/link'
import type { StudentClassesPageGroupSessionRow } from '@/lib/data/group-class-queries'

type StudentUpcomingSession =
  | {
      id: string
      sessionType: 'one_on_one'
      title: string
      dateTimeLabel: string
      sortKey: string
      href: string
    }
  | {
      id: string
      sessionType: 'group'
      title: string
      dateTimeLabel: string
      sortKey: string
      href: string
    }

function sessionTypeBadgeClass(sessionType: StudentUpcomingSession['sessionType']) {
  if (sessionType === 'group') return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

type StudentRecommendedModule = {
  id: string
  title: string
  teacher_name: string | null
  created_at: string
}

function logDashboardQueryError(label: string, error: { message?: string } | null | undefined) {
  if (process.env.NODE_ENV === 'development' && error) {
    console.error(`[StudentDashboard] ${label}:`, error.message ?? error)
  }
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

export default async function StudentDashboardPage() {
  const { supabase, user } = await requireApprovedStudent()
  const reads = await getStudentDashboardReads(supabase, {
    studentId: user.id,
    nowIso: new Date().toISOString(),
  })

  if (reads.bookings.error) {
    logDashboardQueryError('Upcoming 1-on-1 booking query failed', reads.bookings.error)
  }
  if (reads.modules.error) {
    throw new Error(reads.modules.error.message)
  }
  if (reads.groupSessions.error) {
    logDashboardQueryError('Upcoming group class session query failed', reads.groupSessions.error)
  }

  const bookingRows = reads.bookings.error ? [] : reads.bookings.bookings
  const normalizedOneOnOneSessions: StudentUpcomingSession[] = bookingRows.map((booking) => ({
    id: booking.id,
    sessionType: 'one_on_one',
    title: booking.teacher_name || 'Teacher',
    dateTimeLabel: formatDateTimeRange(booking.starts_at, booking.ends_at),
    sortKey: booking.starts_at,
    href: `/session/${booking.id}`,
  }))

  const groupClassRows = reads.groupSessions.error ? [] : reads.groupSessions.sessions
  const normalizedGroupSessions: StudentUpcomingSession[] = groupClassRows
    .filter(
      (
        row
      ): row is StudentClassesPageGroupSessionRow & {
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
    .filter((session) => session.status.trim().toLowerCase() === 'scheduled')
    .filter((session) =>
      isCurrentOrFutureGroupSession({
        sessionDate: session.session_date,
        endTimeLocal: session.end_time_local,
        timezone: session.template_timezone || 'UTC',
      })
    )
    .map((session) => ({
      id: session.session_id,
      sessionType: 'group',
      title: session.template_title || 'Group Session',
      dateTimeLabel: `${formatIsoCalendarDate(session.session_date, {
        dateStyle: 'medium',
      })} | ${session.start_time_local} - ${session.end_time_local}`,
      sortKey: `${session.session_date}T${normalizeLocalTime(session.start_time_local)}`,
      href: `/group-session/${session.session_id}`,
    }))

  const upcomingSessions = [...normalizedOneOnOneSessions, ...normalizedGroupSessions].sort((a, b) =>
    a.sortKey.localeCompare(b.sortKey)
  )
  const recommendedModules = reads.modules.modules as StudentRecommendedModule[]
  const nextSession = upcomingSessions[0]

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <header>
        <p className={brandUi.eyebrow}>Kora Thryve</p>
        <h1 className={brandUi.title}>Welcome back, {user.email?.split('@')[0] || 'Student'}</h1>
        <p className={brandUi.subtitle}>Track your learning progress and upcoming sessions.</p>
      </header>

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <article className={brandUi.card}>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Upcoming Sessions</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{upcomingSessions.length}</p>
        </article>
        <article className={brandUi.card}>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">My Modules</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{recommendedModules.length}</p>
        </article>
        <article className={brandUi.card}>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Session History</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {Math.max(0, upcomingSessions.length)}
          </p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#efe8dc] via-[#f5eee3] to-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-[#8b7758]">Continue Learning</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Resume your lesson flow</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Reopen your modules and stay on track with your learning plan this week.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/student/modules" className={brandUi.primaryButton}>
              Open Modules
            </Link>
            <Link href="/student/booking" className={brandUi.secondaryButton}>
              Book Session
            </Link>
          </div>
        </article>

        <article className={brandUi.section}>
          <div className="flex items-center justify-between">
            <h2 className={brandUi.sectionTitle}>Upcoming Session</h2>
            <Link href="/student/classes" className="text-sm font-medium text-[#8b7758]">
              View all
            </Link>
          </div>
          {!nextSession ? (
            <p className="mt-4 text-sm text-slate-600">No upcoming sessions yet.</p>
          ) : (
            <>
              <span
                className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionTypeBadgeClass(
                  nextSession.sessionType
                )}`}
              >
                {nextSession.sessionType === 'group' ? 'Group' : '1-on-1'}
              </span>
              <p className="mt-4 text-base font-semibold text-slate-900">
                {nextSession.title}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {nextSession.dateTimeLabel}
              </p>
              <a href={nextSession.href} className={`mt-4 ${brandUi.primaryButton}`}>
                Join Session
              </a>
            </>
          )}
        </article>
      </section>

      <section className={brandUi.section}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={brandUi.sectionTitle}>Recommended Modules</h2>
          <Link href="/student/modules" className={brandUi.secondaryButton}>
            Browse All
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {recommendedModules.length === 0 && (
            <p className={brandUi.mutedCard}>No modules available yet.</p>
          )}
          {recommendedModules.map((module) => (
            <article key={module.id} className={brandUi.card}>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                {module.teacher_name || 'Teacher'}
              </p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">{module.title}</h3>
              <p className="mt-2 text-sm text-slate-600">
                Added {new Date(module.created_at).toLocaleDateString()}
              </p>
              <Link href="/student/modules" className={`mt-4 ${brandUi.secondaryButton}`}>
                Continue
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
