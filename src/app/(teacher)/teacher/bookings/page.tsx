import { formatDateTimeRange } from '@/lib/booking/format'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { bookingStatusBadgeClass, brandUi } from '@/lib/ui/branding'
import { cancelBooking, markBookingCompleted } from './actions'

type TeacherBookingsPageProps = {
  searchParams: Promise<{
    success?: string
    error?: string
    tab?: string
  }>
}

type TeacherBooking = {
  id: string
  student_name: string | null
  student_email: string | null
  starts_at: string
  ends_at: string
  status: string
}

function isConfirmedStatus(status: string) {
  return status.trim().toLowerCase() === 'confirmed'
}

function isCompletedStatus(status: string) {
  return status.trim().toLowerCase() === 'completed'
}

export default async function TeacherBookingsPage({
  searchParams,
}: TeacherBookingsPageProps) {
  const { supabase, user } = await requireApprovedTeacher()
  const { success, error: pageError, tab } = await searchParams
  const { data, error } = await supabase
    .from('bookings')
    .select('id, student_name, student_email, starts_at, ends_at, status')
    .eq('teacher_id', user.id)
    .order('starts_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const bookings = (data ?? []) as TeacherBooking[]
  const activeTab = tab === 'upcoming' || tab === 'completed' ? tab : 'all'
  const visibleBookings =
    activeTab === 'upcoming'
      ? bookings.filter((booking) => isConfirmedStatus(booking.status))
      : activeTab === 'completed'
        ? bookings.filter((booking) => isCompletedStatus(booking.status))
        : bookings

  return (
    <div className={brandUi.container}>
      <div className={brandUi.header}>
        <p className={brandUi.eyebrow}>Kora Thryve</p>
        <h1 className={brandUi.title}>Bookings</h1>
        <p className={brandUi.subtitle}>Review all sessions booked with your students.</p>
      </div>

      {success && <p className={brandUi.successAlert}>{success}</p>}
      {pageError && <p className={brandUi.errorAlert}>{pageError}</p>}

      <section className={brandUi.section}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={brandUi.sectionTitle}>Session Bookings</h2>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <a
              href="/teacher/bookings?tab=upcoming"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                activeTab === 'upcoming' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Upcoming
            </a>
            <a
              href="/teacher/bookings?tab=completed"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                activeTab === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Completed
            </a>
            <a
              href="/teacher/bookings?tab=all"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              All
            </a>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {visibleBookings.length === 0 && <p className={brandUi.mutedCard}>No bookings in this view.</p>}
          {visibleBookings.map((booking) => (
            <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {booking.student_name || 'Unnamed student'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{booking.student_email || 'No email available'}</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">
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
              {isConfirmedStatus(booking.status) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={markBookingCompleted}>
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <input type="hidden" name="return_to" value="/teacher/bookings" />
                    <button type="submit" className={brandUi.infoButton}>
                      Mark Completed
                    </button>
                  </form>
                  <form action={cancelBooking}>
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <input type="hidden" name="return_to" value="/teacher/bookings" />
                    <button type="submit" className={brandUi.dangerButton}>
                      Cancel Booking
                    </button>
                  </form>
                </div>
              )}
              {(isConfirmedStatus(booking.status) || isCompletedStatus(booking.status)) && (
                <a href={`/session/${booking.id}`} className={`mt-4 ${brandUi.primaryButton}`}>
                  {isCompletedStatus(booking.status) ? 'View Session' : 'Join Session'}
                </a>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
