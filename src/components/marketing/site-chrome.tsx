import Link from 'next/link'
import { ReactNode } from 'react'

export const brandName = 'Kora Thryve & Co.'
export const brandTagline = 'Life | Organization | Voice | Education'

export function SectionContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1180px] px-5 sm:px-8 ${className}`}>{children}</div>
}

export function MarketingNavbar({ dark = false }: { dark?: boolean }) {
  const baseText = dark ? 'text-white' : 'text-[#3f403d]'
  const mutedText = dark ? 'text-white/75' : 'text-slate-500'
  const linkTone = dark ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'

  return (
    <header className="relative z-10 py-4 sm:py-5">
      <SectionContainer className="flex items-start justify-between gap-6">
        <div>
          <p className={`font-serif text-lg leading-none sm:text-xl ${baseText}`}>{brandName}</p>
          <p className={`mt-1 text-[10px] uppercase tracking-[0.2em] sm:text-[11px] ${mutedText}`}>
            {brandTagline}
          </p>
        </div>
        <nav className="mt-0.5 flex items-center gap-3 text-xs font-medium sm:gap-7 sm:text-sm">
          <Link href="/" className={`transition ${linkTone}`}>
            Home
          </Link>
          <Link href="/about" className={`transition ${linkTone}`}>
            About
          </Link>
          <Link
            href="/login"
            className={
              dark
                ? 'rounded-full bg-white px-4 py-1.5 text-xs text-slate-900 shadow-sm transition hover:bg-white/90 sm:text-sm'
                : 'rounded-full bg-[#cfb083] px-4 py-1.5 text-xs text-white shadow-sm transition hover:bg-[#c1a274] sm:text-sm'
            }
          >
            Login
          </Link>
        </nav>
      </SectionContainer>
    </header>
  )
}

export function MarketingCtaSection({
  title,
  buttonLabel,
  buttonHref,
}: {
  title: string
  buttonLabel: string
  buttonHref: string
}) {
  return (
    <section className="bg-[#9daa84] py-18 text-center sm:py-22">
      <SectionContainer>
        <h2 className="font-serif text-4xl tracking-tight text-white sm:text-5xl">{title}</h2>
        <Link
          href={buttonHref}
          className="mt-7 inline-flex items-center justify-center rounded-full border border-white/80 bg-white px-7 py-3 text-sm font-semibold text-[#6f7e58] transition hover:bg-[#f4f7ef]"
        >
          {buttonLabel}
        </Link>
      </SectionContainer>
    </section>
  )
}

export function MarketingFooter() {
  return (
    <footer className="bg-[#23262c] py-14 text-white">
      <SectionContainer>
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-3">
          <div>
            <p className="font-serif text-xl">{brandName}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/70">{brandTagline}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/90">Contact</h3>
            <a
              href="mailto:korathryveco@gmail.com"
              className="mt-3 block text-sm text-white/70 transition hover:text-white"
            >
              korathryveco@gmail.com
            </a>
            <a href="tel:+6588137298" className="mt-2 block text-sm text-white/70 transition hover:text-white">
              +65 88137298

            </a>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/90">Follow Us</h3>
            <div className="mt-3 flex gap-5 text-sm text-white/70">
              <a href="https://www.facebook.com/profile.php?id=61585226572304" className="transition hover:text-white">
                Facebook
              </a>
              <a href="https://www.instagram.com/korathryveco" className="transition hover:text-white">
                Instagram
              </a>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-white/45">© 2026 Kora Thryve & Co. All rights reserved.</p>
        <p className="mt-6 text-center text-xs text-white/45">Created by Idle Digital.</p>
      </SectionContainer>
    </footer>
  )
}
