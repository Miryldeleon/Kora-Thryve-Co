export type UserRole = 'teacher' | 'student'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export type UserProfile = {
  role: UserRole
  approval_status: ApprovalStatus
}

export const ROLE_DASHBOARD: Record<UserRole, string> = {
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
}

export function isUserRole(value: unknown): value is UserRole {
  return value === 'teacher' || value === 'student'
}

export function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return value === 'pending' || value === 'approved' || value === 'rejected'
}

export function isProtectedRoleRoute(pathname: string) {
  return pathname.startsWith('/teacher') || pathname.startsWith('/student')
}

export function isAdminRoute(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

export function isAdminLoginRoute(pathname: string) {
  return pathname === '/admin/login'
}

export function isAuthRoute(pathname: string) {
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/signup' ||
    pathname.startsWith('/signup/')
  )
}

export function getRoleRoutePrefix(pathname: string): UserRole | null {
  if (pathname.startsWith('/teacher')) return 'teacher'
  if (pathname.startsWith('/student')) return 'student'
  return null
}

export function getRedirectPathForProfile(profile: UserProfile): string {
  if (profile.approval_status === 'pending') return '/pending-approval'
  if (profile.approval_status === 'rejected') return '/access-rejected'
  return ROLE_DASHBOARD[profile.role]
}
