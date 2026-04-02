import Link from 'next/link'
import { AuthShell, authUi } from '@/components/auth/auth-shell'
import { signUpWithEmailPassword } from '../actions'

type TeacherSignupPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function TeacherSignupPage({
  searchParams,
}: TeacherSignupPageProps) {
  const { error } = await searchParams

  return (
    <AuthShell
      title="Teacher Signup"
      subtitle="Create your teacher account and submit for approval to start teaching."
      footer={
        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login/teacher" className={authUi.secondaryLink}>
            Teacher login
          </Link>
        </p>
      }
    >
      {error && <p className={authUi.alertError}>{error}</p>}
      <form action={signUpWithEmailPassword} className="mt-7 grid gap-4">
        <input type="hidden" name="role" value="teacher" />
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
          Create teacher account
        </button>
      </form>
    </AuthShell>
  )
}
