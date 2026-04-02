import Link from 'next/link'
import { AuthShell, authUi } from '@/components/auth/auth-shell'
import { signUpWithEmailPassword } from '../actions'

type StudentSignupPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function StudentSignupPage({
  searchParams,
}: StudentSignupPageProps) {
  const { error } = await searchParams

  return (
    <AuthShell
      title="Student Signup"
      subtitle="Create your student account to access modules and schedule sessions."
      footer={
        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login/student" className={authUi.secondaryLink}>
            Student login
          </Link>
        </p>
      }
    >
      {error && <p className={authUi.alertError}>{error}</p>}
      <form action={signUpWithEmailPassword} className="mt-7 grid gap-4">
        <input type="hidden" name="role" value="student" />
        <label className="text-sm text-slate-600">
          Full Name
          <input type="text" name="full_name" autoComplete="name" required className={authUi.input} />
        </label>
        <label className="text-sm text-slate-600">
          Email
          <input type="email" name="email" autoComplete="email" required className={authUi.input} />
        </label>
        <label className="text-sm text-slate-600">
          Password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            className={authUi.input}
          />
        </label>
        <button type="submit" className={authUi.button}>
          Create student account
        </button>
      </form>
    </AuthShell>
  )
}
