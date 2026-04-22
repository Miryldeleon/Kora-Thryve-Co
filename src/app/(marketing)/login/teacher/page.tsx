import Link from 'next/link'
import { AuthShell, authUi } from '@/components/auth/auth-shell'
import { RoleLoginForm } from '@/components/auth/role-login-form'

type TeacherLoginPageProps = {
  searchParams: Promise<{
    error?: string
    next?: string
  }>
}

export default async function TeacherLoginPage({
  searchParams,
}: TeacherLoginPageProps) {
  const { error, next } = await searchParams

  return (
    <AuthShell
      title="Teacher Login"
      subtitle="Sign in to manage sessions, availability, and learning materials."
      footer={
        <p className="text-sm text-slate-600">
          Need an account?{' '}
          <Link href="/signup/teacher" className={authUi.secondaryLink}>
            Teacher signup
          </Link>
        </p>
      }
    >
      {error && <p className={authUi.alertError}>{error}</p>}
      <RoleLoginForm role="teacher" next={next} />
    </AuthShell>
  )
}
