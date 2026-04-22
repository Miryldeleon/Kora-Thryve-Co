import Link from 'next/link'
import { AuthShell, authUi } from '@/components/auth/auth-shell'
import { RoleSignupForm } from '@/components/auth/role-signup-form'

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
      <RoleSignupForm role="teacher" />
    </AuthShell>
  )
}
