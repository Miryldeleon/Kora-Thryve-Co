import { formatDateTimeRange } from '@/lib/booking/format'
import { requireApprovedStudent } from '@/lib/auth/student'
import { brandUi } from '@/lib/ui/branding'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'

type StudentSessionBookingRow = {
  id: string
  teacher_name: string | null
  starts_at: string
  ends_at: string
  status: 'confirmed' | 'completed' | 'cancelled' | string
}

type StudentGroupParticipantRow = {
  session_id: string
}

type StudentGroupSessionRow = {
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

type OneOnOneSession = {
  id: string
  sessionType: 'one_on_one'
  title: string
  dateTimeLabel: string
  status: 'confirmed' | 'completed' | 'cancelled' | string
  href: string
}

type GroupSession = {
  id: string
  sessionType: 'group'
  title: string
  dateTimeLabel: string
  status: 'scheduled' | 'completed' | 'cancelled' | string
  href: null
}

type StudentSessionItem = OneOnOneSession | GroupSession

type SessionAttendanceRow = {
  booking_id: string
  role: 'teacher' | 'student'
  joined_at: string
}

type AttendanceSummary = {
  teacherJoinedAt: string | null
  studentJoinedAt: string | null
}

function formatActivityTime(isoString: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoString))
}

function sessionTypeBadgeClass(sessionType: StudentSessionItem['sessionType']) {
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

function getSessionAction(item: StudentSessionItem) {
  if (item.sessionType !== 'one_on_one') return null
  if (item.status === 'confirmed') return 'Join Session'
  if (item.status === 'completed') return 'View Session'
  return null
}

function buildAttendanceMap(rows: SessionAttendanceRow[]) {
  const attendanceByBooking = new Map<string, AttendanceSummary>()

  rows.forEach((row) => {
    const current = attendanceByBooking.get(row.booking_id) ?? {
      teacherJoinedAt: null,
      studentJoinedAt: null,
    }

    if (row.role === 'teacher') {
      current.teacherJoinedAt = row.joined_at
    } else {
      current.studentJoinedAt = row.joined_at
    }

    attendanceByBooking.set(row.booking_id, current)
  })

  return attendanceByBooking
}

function SessionSection({
  title,
  rows,
  attendanceByBooking,
}: {
  title: string
  rows: StudentSessionItem[]
  attendanceByBooking: Map<string, AttendanceSummary>
}) {
  return (
    <section className={brandUi.section}>
      <h2 className={brandUi.sectionTitle}>{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className={brandUi.mutedCard}>No sessions in this category.</p>}
        {rows.map((item) => {
          const attendance = item.sessionType === 'one_on_one' ? attendanceByBooking.get(item.id) : null
          const actionLabel = getSessionAction(item)
          return (
            <article key={item.id} className={brandUi.card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.dateTimeLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionTypeBadgeClass(
                      item.sessionType
                    )}`}
                  >
                    {item.sessionType === 'group' ? 'Group' : '1-on-1'}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${sessionStatusBadgeClass(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
              {item.sessionType === 'one_on_one' ? (
                <div className={`mt-3 ${brandUi.mutedCard}`}>
                  <p>
                    Teacher:{' '}
                    {attendance?.teacherJoinedAt
                      ? `Joined ${formatActivityTime(attendance.teacherJoinedAt)}`
                      : 'Not joined'}
                  </p>
                  <p className="mt-1">
                    Student:{' '}
                    {attendance?.studentJoinedAt
                      ? `Joined ${formatActivityTime(attendance.studentJoinedAt)}`
                      : 'Not joined'}
                  </p>
                </div>
              ) : (
                <p className={`mt-3 ${brandUi.mutedCard}`}>
                  Group attendance and live room access will be available in the next phase.
                </p>
              )}
              {actionLabel && item.href && (
                <a href={item.href} className={`mt-4 ${brandUi.primaryButton}`}>
                  {actionLabel}
                </a>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default async function StudentSessionsPage() {
  const { supabase, user } = await requireApprovedStudent()

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, teacher_name, starts_at, ends_at, status')
    .eq('student_id', user.id)
    .order('starts_at', { ascending: true })

  if (bookingsError) {
    throw new Error(bookingsError.message)
  }

  const bookingRows = (bookingsData ?? []) as StudentSessionBookingRow[]
  const bookingIds = bookingRows.map((booking) => booking.id)

  let attendanceRows: SessionAttendanceRow[] = []
  if (bookingIds.length > 0) {
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('session_attendance')
      .select('booking_id, role, joined_at')
      .in('booking_id', bookingIds)
      .order('joined_at', { ascending: false })

    if (attendanceError) {
      throw new Error(attendanceError.message)
    }

    attendanceRows = (attendanceData ?? []) as SessionAttendanceRow[]
  }

  const attendanceByBooking = buildAttendanceMap(attendanceRows)

  const { data: groupParticipantData, error: groupParticipantError } = await supabase
    .from('group_class_session_participants')
    .select('session_id')
    .eq('student_profile_id', user.id)
    .eq('is_active', true)

  if (groupParticipantError) {
    throw new Error(groupParticipantError.message)
  }

  const groupSessionIds = Array.from(
    new Set(((groupParticipantData ?? []) as StudentGroupParticipantRow[]).map((row) => row.session_id))
  )

  let groupSessionRows: StudentGroupSessionRow[] = []
  if (groupSessionIds.length > 0) {
    const { data: groupSessionData, error: groupSessionError } = await supabase
      .from('group_class_sessions')
      .select('id, template_id, session_date, start_time_local, end_time_local, status')
      .eq('is_active', true)
      .in('id', groupSessionIds)
      .order('session_date', { ascending: true })
      .order('start_time_local', { ascending: true })

    if (groupSessionError) {
      throw new Error(groupSessionError.message)
    }

    groupSessionRows = (groupSessionData ?? []) as StudentGroupSessionRow[]
  }

  const templateIds = Array.from(new Set(groupSessionRows.map((row) => row.template_id)))
  let templateTitleById = new Map<string, string>()
  if (templateIds.length > 0) {
    const { data: templateData, error: templateError } = await supabase
      .from('group_class_templates')
      .select('id, title')
      .in('id', templateIds)

    if (templateError) {
      throw new Error(templateError.message)
    }

    templateTitleById = new Map(
      ((templateData ?? []) as GroupTemplateRow[]).map((template) => [template.id, template.title])
    )
  }

  const oneOnOneSessions: OneOnOneSession[] = bookingRows.map((booking) => ({
    id: booking.id,
    sessionType: 'one_on_one',
    title: booking.teacher_name || 'Teacher',
    dateTimeLabel: formatDateTimeRange(booking.starts_at, booking.ends_at),
    status: booking.status,
    href: `/session/${booking.id}`,
  }))

  const groupSessions: GroupSession[] = groupSessionRows.map((session) => ({
    id: session.id,
    sessionType: 'group',
    title: templateTitleById.get(session.template_id) || 'Group Session',
    dateTimeLabel: `${formatIsoCalendarDate(session.session_date, {
      dateStyle: 'medium',
    })} | ${session.start_time_local} - ${session.end_time_local}`,
    status: session.status,
    href: null,
  }))

  const allSessions: StudentSessionItem[] = [...oneOnOneSessions, ...groupSessions]
  const confirmedUpcoming = allSessions.filter(
    (session) => session.status === 'confirmed' || session.status === 'scheduled'
  )
  const completed = allSessions.filter((session) => session.status === 'completed')
  const cancelled = allSessions.filter((session) => session.status === 'cancelled')

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <header className={brandUi.header}>
          <p className={brandUi.eyebrow}>Kora Thryve</p>
          <h1 className={brandUi.title}>Session History</h1>
          <p className={brandUi.subtitle}>
            Review your confirmed, completed, and cancelled sessions with attendance
            activity.
          </p>
        </header>

        <div className="mt-8 space-y-4">
          <SessionSection
            title="Confirmed / Upcoming"
            rows={confirmedUpcoming}
            attendanceByBooking={attendanceByBooking}
          />
          <SessionSection
            title="Completed"
            rows={completed}
            attendanceByBooking={attendanceByBooking}
          />
          <SessionSection
            title="Cancelled"
            rows={cancelled}
            attendanceByBooking={attendanceByBooking}
          />
        </div>
      </div>
    </main>
  )
}
