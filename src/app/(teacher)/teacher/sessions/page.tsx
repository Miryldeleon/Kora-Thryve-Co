import { formatDateTimeRange } from '@/lib/booking/format'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { bookingStatusBadgeClass, brandUi } from '@/lib/ui/branding'
import { cancelBooking, markBookingCompleted } from '../bookings/actions'

type TeacherSessionsPageProps = {
  searchParams: Promise<{
    success?: string
    error?: string
  }>
}

type TeacherSessionBooking = {
  id: string
  student_name: string | null
  starts_at: string
  ends_at: string
  status: 'confirmed' | 'completed' | 'cancelled' | string
}

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

function getSessionAction(status: string) {
  if (status === 'confirmed') return 'Join Session'
  if (status === 'completed') return 'View Session'
  return null
}

function isConfirmedStatus(status: string) {
  return status.trim().toLowerCase() === 'confirmed'
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
  showManagementActions,
}: {
  title: string
  rows: TeacherSessionBooking[]
  attendanceByBooking: Map<string, AttendanceSummary>
  showManagementActions?: boolean
}) {
  return (
    <section className={brandUi.section}>
      <h2 className={brandUi.sectionTitle}>{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className={brandUi.mutedCard}>No sessions in this category.</p>}
        {rows.map((booking) => {
          const attendance = attendanceByBooking.get(booking.id)
          const actionLabel = getSessionAction(booking.status)
          return (
            <article key={booking.id} className={brandUi.card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {booking.student_name || 'Student'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDateTimeRange(booking.starts_at, booking.ends_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${bookingStatusBadgeClass(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
              </div>
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
              {actionLabel && (
                <a href={`/session/${booking.id}`} className={`mt-4 ${brandUi.primaryButton}`}>
                  {actionLabel}
                </a>
              )}
              {showManagementActions && isConfirmedStatus(booking.status) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={markBookingCompleted}>
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <input type="hidden" name="return_to" value="/teacher/sessions" />
                    <button type="submit" className={brandUi.infoButton}>
                      Mark Completed
                    </button>
                  </form>
                  <form action={cancelBooking}>
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <input type="hidden" name="return_to" value="/teacher/sessions" />
                    <button type="submit" className={brandUi.dangerButton}>
                      Cancel Booking
                    </button>
                  </form>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default async function TeacherSessionsPage({
  searchParams,
}: TeacherSessionsPageProps) {
  const { supabase, user } = await requireApprovedTeacher()
  const { success, error: pageError } = await searchParams

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, student_name, starts_at, ends_at, status')
    .eq('teacher_id', user.id)
    .order('starts_at', { ascending: true })

  if (bookingsError) {
    throw new Error(bookingsError.message)
  }

  const bookings = (bookingsData ?? []) as TeacherSessionBooking[]
  const bookingIds = bookings.map((booking) => booking.id)

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
  const confirmedUpcoming = bookings.filter((booking) => booking.status === 'confirmed')
  const completed = bookings.filter((booking) => booking.status === 'completed')
  const cancelled = bookings.filter((booking) => booking.status === 'cancelled')

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <header className={brandUi.header}>
          <p className={brandUi.eyebrow}>Kora Thryve</p>
          <h1 className={brandUi.title}>Session History</h1>
          <p className={brandUi.subtitle}>
            Track your confirmed, completed, and cancelled sessions with attendance
            activity.
          </p>
        </header>
        {success && <p className={brandUi.successAlert}>{success}</p>}
        {pageError && <p className={brandUi.errorAlert}>{pageError}</p>}

        <div className="mt-8 space-y-4">
          <SessionSection
            title="Confirmed / Upcoming"
            rows={confirmedUpcoming}
            attendanceByBooking={attendanceByBooking}
            showManagementActions
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
