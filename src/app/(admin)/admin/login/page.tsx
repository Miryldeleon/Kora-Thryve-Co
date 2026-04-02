import { adminLoginWithPassword } from './actions'

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const { error } = await searchParams

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kora Thryve</p>
        <h1 className="mt-2 text-2xl font-semibold">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with an approved admin account.
        </p>
        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <form action={adminLoginWithPassword} className="mt-6 space-y-4">
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            type="email"
            name="email"
            placeholder="Admin email"
            autoComplete="email"
            required
          />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <button
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            type="submit"
          >
            Sign in to Admin
          </button>
        </form>
      </div>
    </main>
  )
}
