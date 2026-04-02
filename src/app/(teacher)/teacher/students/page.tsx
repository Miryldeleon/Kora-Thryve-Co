import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { formatDateTimeRange } from '@/lib/booking/format'
import { brandUi } from '@/lib/ui/branding'

type TeacherBookingRecord = {
  id: string
  student_id: string
  student_name: string | null
  student_email: string | null
  starts_at: string
  ends_at: string
  status: string
}

type StudentProfileRecord = {
  id: string
  full_name: string | null
  age: number | null
  location: string | null
}

type AttendanceRecord = {
  booking_id: string
  user_id: string
  role: 'teacher' | 'student'
  joined_at: string
}

type StudentAggregate = {
  studentId: string
  fullName: string
  email: string
  age: number | null
  location: string | null
  totalBookings: number
  confirmedCount: number
  completedCount: number
  cancelledCount: number
  attendanceJoinCount: number
  latestSessionEndsAt: string | null
  latestSessionLabel: string | null
}

export default async function TeacherStudentsPage() {
  const { supabase, user } = await requireApprovedTeacher()

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, student_id, student_name, student_email, starts_at, ends_at, status')
    .eq('teacher_id', user.id)
    .order('starts_at', { ascending: false })

  if (bookingsError) {
    throw new Error(bookingsError.message)
  }

  const bookings = (bookingsData ?? []) as TeacherBookingRecord[]
  const studentIds = Array.from(new Set(bookings.map((booking) => booking.student_id)))
  const bookingIds = bookings.map((booking) => booking.id)

  let profiles: StudentProfileRecord[] = []
  if (studentIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, age, location')
      .in('id', studentIds)

    if (profileError) {
      throw new Error(profileError.message)
    }
    profiles = (profileData ?? []) as StudentProfileRecord[]
  }

  let attendanceRows: AttendanceRecord[] = []
  if (bookingIds.length > 0) {
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('session_attendance')
      .select('booking_id, user_id, role, joined_at')
      .in('booking_id', bookingIds)
      .eq('role', 'student')

    if (attendanceError) {
      throw new Error(attendanceError.message)
    }

    attendanceRows = (attendanceData ?? []) as AttendanceRecord[]
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const attendanceByBooking = new Map(attendanceRows.map((row) => [row.booking_id, row]))
  const aggregateMap = new Map<string, StudentAggregate>()

  for (const booking of bookings) {
    const existing = aggregateMap.get(booking.student_id)
    const profile = profileMap.get(booking.student_id)
    const bookingAttendance = attendanceByBooking.get(booking.id)

    if (!existing) {
      aggregateMap.set(booking.student_id, {
        studentId: booking.student_id,
        fullName: profile?.full_name || booking.student_name || 'Unnamed student',
        email: booking.student_email || 'No email available',
        age: profile?.age ?? null,
        location: profile?.location ?? null,
        totalBookings: 1,
        confirmedCount: booking.status === 'confirmed' ? 1 : 0,
        completedCount: booking.status === 'completed' ? 1 : 0,
        cancelledCount: booking.status === 'cancelled' ? 1 : 0,
        attendanceJoinCount: bookingAttendance ? 1 : 0,
        latestSessionEndsAt: booking.ends_at,
        latestSessionLabel: formatDateTimeRange(booking.starts_at, booking.ends_at),
      })
      continue
    }

    existing.totalBookings += 1
    if (booking.status === 'confirmed') existing.confirmedCount += 1
    if (booking.status === 'completed') existing.completedCount += 1
    if (booking.status === 'cancelled') existing.cancelledCount += 1
    if (bookingAttendance) existing.attendanceJoinCount += 1

    const currentLatest = existing.latestSessionEndsAt ? new Date(existing.latestSessionEndsAt).getTime() : 0
    const candidate = new Date(booking.ends_at).getTime()
    if (candidate > currentLatest) {
      existing.latestSessionEndsAt = booking.ends_at
      existing.latestSessionLabel = formatDateTimeRange(booking.starts_at, booking.ends_at)
    }
  }

  const studentRecords = Array.from(aggregateMap.values()).sort(
    (a, b) => (b.latestSessionEndsAt ? new Date(b.latestSessionEndsAt).getTime() : 0) - (a.latestSessionEndsAt ? new Date(a.latestSessionEndsAt).getTime() : 0)
  )

  return (
    <div className={brandUi.container}>
      <header className={brandUi.header}>
        <p className={brandUi.eyebrow}>Kora Thryve</p>
        <h1 className={brandUi.title}>Student Records</h1>
        <p className={brandUi.subtitle}>
          View student profile details, booking counts, and attendance activity from your sessions.
        </p>
      </header>

      <section className={brandUi.section}>
        <h2 className={brandUi.sectionTitle}>Students</h2>
        <div className="mt-4 grid gap-4">
          {studentRecords.length === 0 && (
            <p className={brandUi.mutedCard}>No student records yet. Student details will appear after bookings.</p>
          )}

          {studentRecords.map((student) => (
            <article key={student.studentId} className={brandUi.card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{student.fullName}</p>
                  <p className="mt-1 text-sm text-slate-600">{student.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-700">
                    Bookings: {student.totalBookings}
                  </span>
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-emerald-700">
                    Attended: {student.attendanceJoinCount}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Age</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{student.age ?? '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Location</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{student.location || '—'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Latest Session</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {student.latestSessionLabel || '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Status Counts</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    C:{student.confirmedCount} / D:{student.completedCount} / X:{student.cancelledCount}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
