import Link from 'next/link'
import { ReactNode } from 'react'

type AuthShellProps = {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export const authUi = {
  card: 'w-full rounded-[30px] border border-[#e7e2d9] bg-white p-8 shadow-[0_30px_70px_-44px_rgba(15,23,42,0.3)] sm:p-10',
  brandMark: 'text-[12px] font-semibold uppercase tracking-[0.26em] text-[#8b7758]',
  brandTitle: 'mt-3 text-3xl font-semibold tracking-tight text-slate-900',
  brandTagline: 'mt-2 text-xs uppercase tracking-[0.22em] text-slate-500',
  title: 'mt-8 text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2rem]',
  subtitle: 'mt-2 text-sm text-slate-600',
  input:
    'mt-2 block w-full rounded-2xl border border-[#ddd7cc] bg-white px-4 py-3.5 text-sm text-slate-800 outline-none transition focus:border-[#cfb083] focus:ring-2 focus:ring-[#efe5d4]',
  button:
    'inline-flex w-full items-center justify-center rounded-xl bg-[#cfb083] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_20px_-14px_rgba(207,176,131,0.8)] transition hover:bg-[#c2a372]',
  secondaryLink:
    'text-sm font-medium text-[#8b7758] underline-offset-4 transition hover:text-[#735e40] hover:underline',
  mutedLink: 'text-sm text-slate-600 underline-offset-4 transition hover:text-slate-900 hover:underline',
  alertError:
    'mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700',
}

export function AuthShell({ title, subtitle, children, footer, wide = false }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#f5f4f2] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col items-center justify-center gap-5 sm:gap-7">
        <div className={`${authUi.card} ${wide ? 'max-w-[980px]' : 'max-w-[520px]'}`}>
          <div className="text-center">
            <p className={authUi.brandMark}>Kora Thryve &amp; Co.</p>
            <p className={authUi.brandTagline}>Life | Organization | Voice | Education</p>
          </div>
          <h1 className={`${authUi.title} text-center`}>{title}</h1>
          <p className={`${authUi.subtitle} text-center`}>{subtitle}</p>
          {children}
          {footer && <div className="mt-6 border-t border-slate-100 pt-4">{footer}</div>}
        </div>
        <Link href="/" className={authUi.mutedLink}>
          Back to home
        </Link>
      </div>
    </main>
  )
}
