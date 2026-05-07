import { RoleLoginPageShell } from '@/components/auth/role-login-page-shell'

type StudentLoginPageProps = {
  searchParams: Promise<{
    error?: string
    next?: string
  }>
}

export default async function StudentLoginPage({ searchParams }: StudentLoginPageProps) {
  const { error, next } = await searchParams

  return (
    <RoleLoginPageShell
      role="student"
      error={error}
      next={next}
      heading="Welcome back, Student"
      subtitle="Sign in to continue your learning journey."
      rightHeadline="Learn with Purpose. Grow with Guidance."
      rightParagraph="Access your classes, upcoming sessions, modules, and learning materials in one supportive space."
      signupHref="/signup/student"
    />
  )
}
