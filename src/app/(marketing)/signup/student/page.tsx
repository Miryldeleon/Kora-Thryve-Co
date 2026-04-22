import Link from 'next/link'
import { AuthShell, authUi } from '@/components/auth/auth-shell'
import { RoleSignupForm } from '@/components/auth/role-signup-form'

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
      <RoleSignupForm role="student" />
    </AuthShell>
  )
}
