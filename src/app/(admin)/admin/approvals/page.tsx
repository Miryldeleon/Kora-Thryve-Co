import { requireAdminAccess } from '@/lib/auth/admin'
import { approveProfile, rejectProfile } from './actions'
import { adminSignOut } from '../actions'

type PendingProfile = {
  id: string
  full_name: string | null
  email: string
  role: string
  approval_status: string
  created_at: string
}

export default async function AdminApprovalsPage() {
  const { supabase } = await requireAdminAccess()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, approval_status, created_at')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const pendingProfiles = (data ?? []) as PendingProfile[]

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kora Thryve</p>
            <h1 className="mt-2 text-3xl font-semibold">Admin Approvals</h1>
            <p className="mt-2 text-sm text-slate-600">
              Review pending profiles and approve or reject access.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/admin/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Back to dashboard
            </a>
            <form action={adminSignOut}>
              <button
                type="submit"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead className="bg-slate-100 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Full Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Approval Status</th>
                  <th className="px-4 py-3 font-medium">Created At</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingProfiles.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-sm text-slate-600" colSpan={6}>
                      No pending users right now.
                    </td>
                  </tr>
                )}
                {pendingProfiles.map((profile) => (
                  <tr key={profile.id} className="border-t border-slate-100">
                    <td className="px-4 py-4 text-sm">{profile.full_name || '-'}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{profile.email}</td>
                    <td className="px-4 py-4 text-sm capitalize">{profile.role}</td>
                    <td className="px-4 py-4 text-sm capitalize">{profile.approval_status}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {new Date(profile.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <form action={approveProfile}>
                          <input type="hidden" name="profile_id" value={profile.id} />
                          <button
                            type="submit"
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-500"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={rejectProfile}>
                          <input type="hidden" name="profile_id" value={profile.id} />
                          <button
                            type="submit"
                            className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-rose-500"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
