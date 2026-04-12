import { requireAdminAccess } from '@/lib/auth/admin'
import { adminSignOut } from '../actions'

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdminAccess()

  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'pending')

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kora Thryve</p>
            <h1 className="mt-2 text-3xl font-semibold">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage account approvals and onboarding quality.
            </p>
          </div>
          <form action={adminSignOut}>
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Sign out
            </button>
          </form>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Pending Applications
            </p>
            <p className="mt-3 text-4xl font-semibold text-slate-900">{count ?? 0}</p>
            <p className="mt-2 text-sm text-slate-600">Users waiting for admin review.</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Next Step</p>
            <p className="mt-3 text-lg font-medium">Review pending accounts</p>
            <p className="mt-2 text-sm text-slate-600">
              Open the approvals queue and set each profile to approved or rejected.
            </p>
            <a
              href="/admin/approvals"
              className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Go to approvals
            </a>
          </article>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Shared Library</p>
            <p className="mt-3 text-lg font-medium">Manage modules and folders</p>
            <p className="mt-2 text-sm text-slate-600">
              Delete modules and folders from a dedicated admin-only page.
            </p>
            <a
              href="/admin/modules"
              className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Go to modules
            </a>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Group Classes</p>
            <p className="mt-3 text-lg font-medium">Create recurring class templates</p>
            <p className="mt-2 text-sm text-slate-600">
              Assign teachers, define recurrence rules, and enroll students.
            </p>
            <a
              href="/admin/group-classes"
              className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Go to group classes
            </a>
          </article>
        </section>
      </div>
    </main>
  )
}
