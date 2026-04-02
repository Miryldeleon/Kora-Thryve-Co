'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

type PortalNavItem = {
  href: string
  label: string
}

type PortalShellProps = {
  portalLabel: string
  navItems: PortalNavItem[]
  logoutHref: string
  children: ReactNode
}

function isActive(pathname: string, href: string) {
  if (pathname === href) return true
  return pathname.startsWith(`${href}/`)
}

export default function PortalShell({
  portalLabel,
  navItems,
  logoutHref,
  children,
}: PortalShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#f5f4f2] text-slate-900">
      <div className="mx-auto grid w-full max-w-[1700px] lg:min-h-screen lg:grid-cols-[304px_minmax(0,1fr)]">
        <aside className="border-b border-[#e7e2d9] bg-white px-6 py-7 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-8 lg:py-9">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8b7758]">
              Kora Thryve
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{portalLabel}</h2>
            <p className="mt-2 text-sm text-slate-500">Learning operations workspace</p>
          </div>

          <nav className="mt-8 grid gap-2">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-3 text-[15px] font-medium transition ${
                    active
                      ? 'border border-[#ddceb7] bg-[#f7f1e8] text-[#7f6948] shadow-[0_12px_22px_-20px_rgba(127,105,72,0.65)]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-8 lg:mt-auto">
            <a
              href={logoutHref}
              className="inline-flex w-full items-center justify-center rounded-xl border border-[#d9ccb9] bg-white px-4 py-2.5 text-sm font-medium text-[#8b7758] transition hover:bg-[#f7f3ed]"
            >
              Logout
            </a>
          </div>
        </aside>

        <main className="px-5 py-6 sm:px-7 lg:px-12 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
