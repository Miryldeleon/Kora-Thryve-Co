import { formatDateTimeRange } from '@/lib/booking/format'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { brandUi } from '@/lib/ui/branding'
import Link from 'next/link'

type TeacherUpcomingSession = {
  id: string
  student_name: string | null
  starts_at: string
  ends_at: string
  status: string
}

type TeacherRecentModule = {
  id: string
  title: string
  created_at: string
}

export default async function TeacherDashboardPage() {
  const { supabase, user } = await requireApprovedTeacher()

  const { data: upcomingData, error } = await supabase
    .from('bookings')
    .select('id, student_name, starts_at, ends_at, status')
    .eq('teacher_id', user.id)
    .eq('status', 'confirmed')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(3)

  if (error) {
    throw new Error(error.message)
  }

  const { data: allBookingsData, error: allBookingsError } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('teacher_id', user.id)

  if (allBookingsError) {
    throw new Error(allBookingsError.message)
  }

  const { data: modulesData, error: modulesError } = await supabase
    .from('modules')
    .select('id, title, created_at')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })
    .limit(4)

  if (modulesError) {
    throw new Error(modulesError.message)
  }

  const upcomingSessions = (upcomingData ?? []) as TeacherUpcomingSession[]
  const allBookings = (allBookingsData ?? []) as { id: string; status: string }[]
  const recentModules = (modulesData ?? []) as TeacherRecentModule[]
  const completedCount = allBookings.filter(
    (booking) => booking.status.trim().toLowerCase() === 'completed'
  ).length
  const upcomingCount = allBookings.filter(
    (booking) => booking.status.trim().toLowerCase() === 'confirmed'
  ).length

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <header>
        <p className={brandUi.eyebrow}>Kora Thryve</p>
        <h1 className={brandUi.title}>Welcome back, {user.email?.split('@')[0] || 'Teacher'}</h1>
        <p className={brandUi.subtitle}>Manage classes, modules, and your teaching operations.</p>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        <Link href="/teacher/modules" className={brandUi.secondaryButton}>
          Manage Modules
        </Link>
        <Link href="/teacher/bookings" className={brandUi.secondaryButton}>
          Open Bookings
        </Link>
        <Link href="/teacher/availability" className={brandUi.secondaryButton}>
          Update Availability
        </Link>
        <Link href="/teacher/sessions" className={brandUi.secondaryButton}>
          Session History
        </Link>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <article className={brandUi.card}>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Upcoming</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{upcomingCount}</p>
        </article>
        <article className={brandUi.card}>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{completedCount}</p>
        </article>
        <article className={brandUi.card}>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Modules</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{recentModules.length}</p>
        </article>
      </section>

      <section className={`${brandUi.section} mt-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={brandUi.sectionTitle}>Today&apos;s Sessions</h2>
          <Link href="/teacher/sessions" className={brandUi.secondaryButton}>
            Session History
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {upcomingSessions.length === 0 && (
            <p className={brandUi.mutedCard}>No confirmed sessions in your next schedule.</p>
          )}

          {upcomingSessions.map((session) => (
            <article
              key={session.id}
              className={`flex flex-wrap items-center justify-between gap-3 ${brandUi.card}`}
            >
              <div>
                <p className="text-base font-semibold text-slate-900">{session.student_name || 'Student'}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatDateTimeRange(session.starts_at, session.ends_at)}
                </p>
              </div>
              <a href={`/session/${session.id}`} className={brandUi.primaryButton}>
                Join Session
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className={brandUi.section}>
          <h2 className={brandUi.sectionTitle}>Recent Modules</h2>
          <div className="mt-4 space-y-3">
            {recentModules.length === 0 && <p className={brandUi.mutedCard}>No modules uploaded yet.</p>}
            {recentModules.map((module) => (
              <div key={module.id} className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{module.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
                  {new Date(module.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
          <Link href="/teacher/modules" className={`mt-4 ${brandUi.secondaryButton}`}>
            Manage Modules
          </Link>
        </article>
        <article className={brandUi.section}>
          <h2 className={brandUi.sectionTitle}>Booking Operations</h2>
          <p className="mt-2 text-sm text-slate-600">
            Review confirmed, completed, and cancelled sessions in one place.
          </p>
          <Link href="/teacher/bookings" className={`mt-4 ${brandUi.primaryButton}`}>
            View Bookings
          </Link>
        </article>
      </section>

      <section className="mt-4">
        <Link href="/teacher/modules" className={brandUi.primaryButton}>
          Upload New Module
        </Link>
      </section>
    </div>
  )
}
