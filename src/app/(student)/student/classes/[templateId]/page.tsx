import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireApprovedStudent } from '@/lib/auth/student'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { brandUi } from '@/lib/ui/branding'
import GroupSessionNotesDialog from '@/components/session/group-session-notes-dialog'

type StudentClassDetailPageProps = {
  params: Promise<{
    templateId: string
  }>
}

type StudentGroupClassRpcRow = {
  template_id: string
  template_title: string
  template_description: string | null
  template_timezone: string
  schedule_summary: string
  session_id: string | null
  session_date: string | null
  start_time_local: string | null
  end_time_local: string | null
  status: string | null
  meeting_room_name: string | null
}

type ClassSession = {
  id: string
  dateLabel: string
  timeLabel: string
  href: string
  sortValue: number
  statusLabel: string
  kind: 'upcoming' | 'completed' | 'cancelled'
  canJoin: boolean
}

function classStatusBadgeClass(status: string) {
  if (status === 'scheduled' || status === 'confirmed' || status === 'live' || status === 'active') {
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
  return `${formatTimeLabel(startTimeLocal)} - ${formatTimeLabel(endTimeLocal)}`
}

function toLocalSessionSortValue(sessionDate: string, startTimeLocal: string) {
  const normalized = `${sessionDate}${toComparableTime(startTimeLocal)}`.replace(/[^0-9]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
}

function formatTimeLabel(timeLocal: string) {
  const [hourPart, minutePart] = timeLocal.split(':')
  const hour = Number(hourPart)
  const minute = Number(minutePart)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return timeLocal

  const displayHour = hour % 12 || 12
  const suffix = hour >= 12 ? 'PM' : 'AM'
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`
}

function toComparableTime(timeLocal: string) {
  const [hourPart = '00', minutePart = '00'] = timeLocal.split(':')
  return `${hourPart.padStart(2, '0')}${minutePart.padStart(2, '0')}`
}

function nowSortValueForTimezone(timeZone: string) {
  const localNowSortValue = () => {
    const now = new Date()
    const normalized = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    return Number(normalized)
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date())

    const byType = new Map(parts.map((part) => [part.type, part.value]))
    const hour = byType.get('hour') === '24' ? '00' : byType.get('hour')
    const normalized = `${byType.get('year')}${byType.get('month')}${byType.get('day')}${hour}${byType.get(
      'minute'
    )}`
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : localNowSortValue()
  } catch {
    return localNowSortValue()
  }
}

function buildSessionState(status: string, startSortValue: number, endSortValue: number, nowSortValue: number) {
  const normalizedStatus = status.toLowerCase()

  if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
    return {
      kind: 'cancelled' as const,
      statusLabel: 'Cancelled',
      canJoin: false,
    }
  }

  if (normalizedStatus === 'completed' || normalizedStatus === 'done' || endSortValue < nowSortValue) {
    return {
      kind: 'completed' as const,
      statusLabel: 'Completed',
      canJoin: false,
    }
  }

  if (
    normalizedStatus === 'live' ||
    normalizedStatus === 'active' ||
    normalizedStatus === 'in_progress' ||
    (startSortValue <= nowSortValue && endSortValue >= nowSortValue)
  ) {
    return {
      kind: 'upcoming' as const,
      statusLabel: 'Live',
      canJoin: true,
    }
  }

  return {
    kind: 'upcoming' as const,
    statusLabel: 'Scheduled',
    canJoin: true,
  }
}

export default async function StudentClassDetailPage({ params }: StudentClassDetailPageProps) {
  const { supabase } = await requireApprovedStudent()
  const { templateId } = await params

  const { data: groupClassData, error: groupClassError } = await supabase.rpc(
    'get_student_classes_page_group_sessions'
  )
  if (groupClassError) {
    throw new Error(groupClassError.message)
  }

  const classRows = ((groupClassData ?? []) as StudentGroupClassRpcRow[]).filter(
    (row) => row.template_id === templateId
  )

  if (classRows.length === 0) {
    notFound()
  }

  const classInfo = classRows[0]
  const nowSortValue = nowSortValueForTimezone(classInfo.template_timezone)
  const sessions: ClassSession[] = classRows
    .filter(
      (
        row
      ): row is StudentGroupClassRpcRow & {
        session_id: string
        session_date: string
        start_time_local: string
        end_time_local: string
        status: string
        meeting_room_name: string
      } =>
        row.session_id !== null &&
        row.session_date !== null &&
        row.start_time_local !== null &&
        row.end_time_local !== null &&
        row.status !== null &&
        row.meeting_room_name !== null
    )
    .map((row) => {
      const sortValue = toLocalSessionSortValue(row.session_date, row.start_time_local)
      const endSortValue = toLocalSessionSortValue(row.session_date, row.end_time_local)
      const sessionState = buildSessionState(row.status, sortValue, endSortValue, nowSortValue)

      return {
        id: row.session_id,
        dateLabel: formatGroupDate(row.session_date),
        timeLabel: formatGroupTime(row.start_time_local, row.end_time_local),
        href: `/group-session/${row.session_id}`,
        sortValue,
        ...sessionState,
      }
    })
    .sort((a, b) => a.sortValue - b.sortValue)

  const upcomingSessions = sessions.filter((session) => session.kind === 'upcoming')
  const historySessions = sessions
    .filter((session) => session.kind === 'completed' || session.kind === 'cancelled')
    .sort((a, b) => b.sortValue - a.sortValue)
  const completedSessionCount = historySessions.filter((session) => session.kind === 'completed').length
  const description = classInfo.template_description?.trim() || 'No class description yet.'

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <Link href="/student/classes" className={brandUi.secondaryButton}>
          Back to Classes
        </Link>

        <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-h-44 bg-[#9cae82] px-6 py-8 text-white">
            <p className="text-xs uppercase tracking-[0.22em] text-white/80">Kora Thryve Group Class</p>
            <h1 className="mt-10 max-w-3xl text-4xl font-semibold tracking-tight">{classInfo.template_title}</h1>
          </div>
          <div className="grid gap-4 p-6 lg:grid-cols-[1.4fr_0.9fr]">
            <section>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Description</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
            </section>
            <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Schedule</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{classInfo.schedule_summary}</p>
              <p className="mt-1 text-xs text-slate-600">Timezone: {classInfo.template_timezone}</p>
            </section>
          </div>
        </article>

        <section className={`mt-6 ${brandUi.section}`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={brandUi.sectionTitle}>Upcoming Sessions</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {upcomingSessions.length} upcoming
            </span>
          </div>

          {upcomingSessions.length === 0 ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No upcoming sessions yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {upcomingSessions.map((session) => (
                <article key={session.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{session.dateLabel}</p>
                      <p className="mt-1 text-sm text-slate-600">{session.timeLabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] ${classStatusBadgeClass(
                          session.statusLabel.toLowerCase()
                        )}`}
                      >
                        {session.statusLabel}
                      </span>
                      {session.canJoin && (
                        <Link href={session.href} className={brandUi.secondaryButton}>
                          Join Session
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={`mt-5 ${brandUi.section}`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={brandUi.sectionTitle}>Session History</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {completedSessionCount} completed
            </span>
          </div>

          {historySessions.length === 0 ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Completed sessions will appear here.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {historySessions.map((session) => (
                <article key={session.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{session.dateLabel}</p>
                      <p className="mt-1 text-sm text-slate-600">{session.timeLabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] ${classStatusBadgeClass(
                          session.statusLabel.toLowerCase()
                        )}`}
                      >
                        {session.statusLabel}
                      </span>
                      <GroupSessionNotesDialog
                        sessionId={session.id}
                        sessionLabel={`${session.dateLabel} | ${session.timeLabel}`}
                        isTeacher={false}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
