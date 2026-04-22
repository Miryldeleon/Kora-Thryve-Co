import Link from 'next/link'
import { AuthShell, authUi } from '@/components/auth/auth-shell'
import { RoleLoginForm } from '@/components/auth/role-login-form'

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
      <RoleLoginForm role="student" next={next} />
    </AuthShell>
  )
}
