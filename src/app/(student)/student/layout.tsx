import PortalShell from '@/components/portal/portal-shell'
import { ReactNode } from 'react'

const STUDENT_NAV = [
  { href: '/student/dashboard', label: 'Dashboard' },
  { href: '/student/classes', label: 'Classes' },
  { href: '/student/modules', label: 'My Modules' },
  { href: '/student/booking', label: 'Book Session' },
  { href: '/student/profile', label: 'Profile' },
]

export default function StudentPortalLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell portalLabel="Student Portal" navItems={STUDENT_NAV} logoutHref="/student/logout">
      {children}
    </PortalShell>
  )
}
