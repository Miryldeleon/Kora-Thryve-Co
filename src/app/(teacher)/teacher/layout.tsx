import PortalShell from '@/components/portal/portal-shell'
import { ReactNode } from 'react'

const TEACHER_NAV = [
  { href: '/teacher/dashboard', label: 'Dashboard' },
  { href: '/teacher/classes', label: 'Classes' },
  { href: '/teacher/attendance', label: 'Attendance' },
  { href: '/teacher/modules', label: 'Modules' },
  { href: '/teacher/students', label: 'Students' },
  { href: '/teacher/availability', label: 'Availability' },
  { href: '/teacher/profile', label: 'Profile' },
]

export default function TeacherPortalLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell portalLabel="Teacher Portal" navItems={TEACHER_NAV} logoutHref="/teacher/logout">
      {children}
    </PortalShell>
  )
}
