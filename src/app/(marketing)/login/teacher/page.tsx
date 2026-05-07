import { RoleLoginPageShell } from '@/components/auth/role-login-page-shell'

type TeacherLoginPageProps = {
  searchParams: Promise<{
    error?: string
    next?: string
  }>
}

export default async function TeacherLoginPage({ searchParams }: TeacherLoginPageProps) {
  const { error, next } = await searchParams

  return (
    <RoleLoginPageShell
      role="teacher"
      error={error}
      next={next}
      heading="Welcome back, Teacher"
      subtitle="Sign in to manage your teaching workspace."
      rightHeadline="Guide Learners with Clarity."
      rightParagraph="Manage your classes, sessions, learners, and teaching materials in one organized space."
      signupHref="/signup/teacher"
    />
  )
}
