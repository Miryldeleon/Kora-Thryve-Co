import Link from 'next/link'
import { AuthShell, authUi } from '@/components/auth/auth-shell'
import {
  RoleSignupForm,
  type StudentSignupClassOption,
} from '@/components/auth/role-signup-form'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type StudentSignupPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

type SignupClassRpcRow = {
  template_id: string
  class_title: string
  schedule_summary: string | null
}

function buildClassOptionLabel(row: SignupClassRpcRow) {
  return [row.class_title, row.schedule_summary]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(' · ')
}

export default async function StudentSignupPage({
  searchParams,
}: StudentSignupPageProps) {
  const { error } = await searchParams
  const supabase = await createServerSupabaseClient()
  const { data: classData, error: classesError } = await supabase.rpc(
    'get_active_group_class_signup_options'
  )

  const classOptions: StudentSignupClassOption[] = ((classData ?? []) as SignupClassRpcRow[]).map(
    (row) => ({
      templateId: row.template_id,
      label: buildClassOptionLabel(row),
    })
  )

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
      <RoleSignupForm
        role="student"
        classOptions={classOptions}
        classesError={classesError?.message ?? null}
      />
    </AuthShell>
  )
}
