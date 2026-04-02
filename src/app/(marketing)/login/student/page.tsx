import Link from 'next/link'
import { AuthShell, authUi } from '@/components/auth/auth-shell'
import { loginWithEmailPassword } from '../actions'

type StudentLoginPageProps = {
  searchParams: Promise<{
    error?: string
    next?: string
  }>
}

export default async function StudentLoginPage({
  searchParams,
}: StudentLoginPageProps) {
  const { error, next } = await searchParams

  return (
    <AuthShell
      title="Student Login"
      subtitle="Sign in to continue your learning sessions and module progress."
      footer={
        <p className="text-sm text-slate-600">
          Need an account?{' '}
          <Link href="/signup/student" className={authUi.secondaryLink}>
            Student signup
          </Link>
        </p>
      }
    >
      {error && <p className={authUi.alertError}>{error}</p>}
      <form action={loginWithEmailPassword} className="mt-7 grid gap-4">
        <input type="hidden" name="role" value="student" />
        <input type="hidden" name="next" value={next ?? ''} />
        <label className="text-sm text-slate-600">
          Email
          <input type="email" name="email" autoComplete="email" required className={authUi.input} />
        </label>
        <label className="text-sm text-slate-600">
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className={authUi.input}
          />
        </label>
        <button type="submit" className={authUi.button}>
          Sign in as student
        </button>
        <a
          href="/forgot-password?role=student"
          className="text-center text-sm text-slate-500 underline-offset-4 transition hover:text-slate-700 hover:underline"
        >
          Forgot password?
        </a>
      </form>
    </AuthShell>
  )
}
