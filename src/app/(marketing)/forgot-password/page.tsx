import Link from 'next/link'
import { AuthShell, authUi } from '@/components/auth/auth-shell'
import { sendPasswordResetEmail } from './actions'

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    role?: string
    sent?: string
    error?: string
  }>
}

function normalizeRole(value?: string) {
  if (value === 'student' || value === 'teacher') return value
  return null
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { role, sent, error } = await searchParams
  const roleHint = normalizeRole(role)
  const backToLoginHref = roleHint ? `/login/${roleHint}` : '/login'

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Enter your email and we’ll send a secure reset link to your inbox."
      footer={
        <p className="text-center text-sm text-slate-600">
          Back to{' '}
          <Link href={backToLoginHref} className={authUi.secondaryLink}>
            {roleHint ? `${roleHint} login` : 'login'}
          </Link>
        </p>
      }
    >
      {sent === '1' && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Reset email sent. Please check your inbox for the password reset link.
        </p>
      )}
      {error && <p className={authUi.alertError}>{error}</p>}

      <form action={sendPasswordResetEmail} className="mt-7 grid gap-4">
        <input type="hidden" name="role" value={roleHint ?? ''} />
        <label className="text-sm text-slate-600">
          Email
          <input type="email" name="email" autoComplete="email" required className={authUi.input} />
        </label>
        <button type="submit" className={authUi.button}>
          Send reset link
        </button>
      </form>
    </AuthShell>
  )
}
