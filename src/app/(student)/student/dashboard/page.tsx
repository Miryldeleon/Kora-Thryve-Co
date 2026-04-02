import { formatDateTimeRange } from '@/lib/booking/format'
import { requireApprovedStudent } from '@/lib/auth/student'
import { brandUi } from '@/lib/ui/branding'
import Link from 'next/link'

type StudentUpcomingSession = {
  id: string
  teacher_name: string | null
  starts_at: string
  ends_at: string
  status: string
}

type StudentRecommendedModule = {
  id: string
  title: string
  teacher_name: string | null
  created_at: string
}

export default async function StudentDashboardPage() {
  const { supabase, user } = await requireApprovedStudent()

  const { data, error } = await supabase
    .from('bookings')
    .select('id, teacher_name, starts_at, ends_at, status')
    .eq('student_id', user.id)
    .eq('status', 'confirmed')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(3)

  if (error) {
    throw new Error(error.message)
  }

  const { data: recommendedData, error: recommendedError } = await supabase
    .from('modules')
    .select('id, title, teacher_name, created_at')
    .order('created_at', { ascending: false })
    .limit(3)

  if (recommendedError) {
    throw new Error(recommendedError.message)
  }

  const upcomingSessions = (data ?? []) as StudentUpcomingSession[]
  const recommendedModules = (recommendedData ?? []) as StudentRecommendedModule[]
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
            <Link href="/student/sessions" className="text-sm font-medium text-[#8b7758]">
              View all
            </Link>
          </div>
          {!nextSession ? (
            <p className="mt-4 text-sm text-slate-600">No confirmed sessions yet.</p>
          ) : (
            <>
              <p className="mt-4 text-base font-semibold text-slate-900">
                {nextSession.teacher_name || 'Teacher'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatDateTimeRange(nextSession.starts_at, nextSession.ends_at)}
              </p>
              <a href={`/session/${nextSession.id}`} className={`mt-4 ${brandUi.primaryButton}`}>
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
