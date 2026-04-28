import Link from 'next/link'
import { ReactNode } from 'react'
import logoIcon from '@/app/Kora-Thryve-Co-Logo.png'
import Image from 'next/image'

export const brandName = 'Kora Thryve & Co.'
export const brandTagline = 'Grow with guidance'

export function SectionContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1180px] px-5 sm:px-8 ${className}`}>{children}</div>
}

export function MarketingNavbar({ dark = false }: { dark?: boolean }) {
  const textTone = dark ? 'text-white' : 'text-[var(--deep-forest)]'
  const subtleTone = dark ? 'text-white/70' : 'text-[color:rgb(90_107_94/0.72)]'
  const linkTone = dark ? 'text-white/82 hover:text-white' : 'text-[color:rgb(47_58_51/0.72)] hover:text-[var(--deep-forest)]'
  const panelTone = dark
    ? 'border-white/12 bg-white/10 backdrop-blur-md'
    : 'border-[color:rgb(154_163_151/0.14)] bg-white/88 backdrop-blur-md'

  return (
    <header className="relative z-20 py-4 sm:py-6">
      <SectionContainer>
        <div className={`flex items-center justify-between gap-4 rounded-full border px-4 py-3 shadow-[0_18px_45px_-30px_rgba(47,58,51,0.35)] sm:px-6 ${panelTone}`}>
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 shadow-[0_12px_30px_-20px_rgba(47,58,51,0.45)]">
              <Image src={logoIcon} alt="Kora Thryve & Co. logo" className="h-7 w-7 object-contain" />
            </span>
            <span className="min-w-0">
              <span className={`block truncate text-base font-extrabold sm:text-lg ${textTone}`}>{brandName}</span>
              <span className={`block text-[11px] uppercase tracking-[0.24em] sm:text-xs ${subtleTone}`}>
                {brandTagline}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium lg:flex">
            <Link href="/" className={linkTone}>
              Home
            </Link>
            <Link href="/#services" className={linkTone}>
              Services
            </Link>
            <Link href="/#featured-classes" className={linkTone}>
              Classes
            </Link>
            <Link href="/about" className={linkTone}>
              About
            </Link>
            <Link href="/#contact" className={linkTone}>
              Contact
            </Link>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/login"
              className={`rounded-full px-4 py-2 text-sm font-semibold ${dark ? 'text-white/86 hover:text-white' : 'text-[var(--deep-forest)]/80 hover:text-[var(--deep-forest)]'}`}
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[var(--sage-green)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_18px_30px_-18px_rgba(47,58,51,0.65)] hover:-translate-y-0.5 hover:bg-[var(--fresh-leaf)]"
            >
              Get Started
            </Link>
          </div>

          <details className="group relative lg:hidden">
            <summary
              className={`flex cursor-pointer list-none items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold marker:hidden ${dark ? 'border-white/18 bg-white/10 text-white' : 'border-[color:rgb(154_163_151/0.2)] bg-white/80 text-[var(--deep-forest)]'}`}
            >
              Menu
              <span className="text-xs transition group-open:rotate-45">+</span>
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.75rem)] w-60 rounded-[1.5rem] border border-[color:rgb(154_163_151/0.14)] bg-white p-3 text-sm shadow-[0_30px_60px_-35px_rgba(47,58,51,0.45)]">
              <div className="flex flex-col gap-1 text-[var(--deep-forest)]">
                <Link href="/" className="rounded-2xl px-4 py-3 hover:bg-[var(--cream)]">
                  Home
                </Link>
                <Link href="/#services" className="rounded-2xl px-4 py-3 hover:bg-[var(--cream)]">
                  Services
                </Link>
                <Link href="/#featured-classes" className="rounded-2xl px-4 py-3 hover:bg-[var(--cream)]">
                  Classes
                </Link>
                <Link href="/about" className="rounded-2xl px-4 py-3 hover:bg-[var(--cream)]">
                  About
                </Link>
                <Link href="/#contact" className="rounded-2xl px-4 py-3 hover:bg-[var(--cream)]">
                  Contact
                </Link>
                <Link href="/login" className="rounded-2xl px-4 py-3 hover:bg-[var(--cream)]">
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="mt-2 rounded-full bg-[var(--sage-green)] px-4 py-3 text-center font-bold text-white hover:bg-[var(--fresh-leaf)]"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </details>
        </div>
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
    <section className="relative overflow-hidden bg-[var(--sage-green)] py-20 text-center sm:py-24 lg:py-32">
      <div className="marketing-blob animate-float-soft left-[-5rem] top-10 h-40 w-40 opacity-20">
        <svg viewBox="0 0 200 200" className="h-full w-full" fill="none">
          <path d="M54 108Q39 51 96 39t70 42q13 54-29 87t-83-15q-14-18 0-45Z" fill="var(--soft-mint)" />
        </svg>
      </div>
      <div className="marketing-blob animate-float-slower bottom-[-3rem] right-8 h-48 w-48 opacity-20">
        <svg viewBox="0 0 220 220" className="h-full w-full" fill="none">
          <path d="M59 102q6-44 54-61t82 16q34 33 5 77t-81 44Q49 178 59 102Z" fill="var(--sunshine-yellow)" />
        </svg>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(154,163,151,0.88)_0%,rgba(154,163,151,0.96)_100%)]" />
      <SectionContainer className="relative z-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-7xl">{title}</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90 sm:text-xl">
            Build confidence, discover support, and grow with guidance every step of the way.
          </p>
          <Link
            href={buttonHref}
            className="mt-10 inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-lg font-extrabold text-[var(--sage-green)] shadow-[0_24px_45px_-24px_rgba(47,58,51,0.55)] hover:-translate-y-1 hover:scale-[1.02]"
          >
            {buttonLabel}
          </Link>
        </div>
      </SectionContainer>
    </section>
  )
}

export function MarketingFooter() {
  return (
    <footer id="contact" className="bg-[var(--deep-forest)] py-16 text-white">
      <SectionContainer>
        <div className="grid gap-10 border-b border-white/10 pb-12 md:grid-cols-[1.1fr_0.9fr_0.9fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                <Image src={logoIcon} alt="Kora Thryve & Co. logo" className="h-7 w-7 object-contain brightness-0 invert" />
              </span>
              <div>
                <p className="text-lg font-extrabold">{brandName}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/68">{brandTagline}</p>
              </div>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/72">
              Empowering growth through personalized learning, mentoring, and calm, confidence-building support.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/92">Services</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/72">
              <Link href="/#services" className="hover:text-white">
                Tutoring & Academic
              </Link>
              <Link href="/#services" className="hover:text-white">
                Life Skills Coaching
              </Link>
              <Link href="/#services" className="hover:text-white">
                Wellness Support
              </Link>
              <Link href="/#services" className="hover:text-white">
                Vocal Coaching
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/92">Company</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/72">
              <Link href="/about" className="hover:text-white">
                About Us
              </Link>
              <Link href="/#featured-classes" className="hover:text-white">
                Classes
              </Link>
              <Link href="/#why-kora-thryve" className="hover:text-white">
                Why Kora Thryve
              </Link>
              <Link href="/signup" className="hover:text-white">
                Get Started
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/92">Contact</h3>
            <a href="mailto:korathryveco@gmail.com" className="mt-4 block text-sm text-white/72 hover:text-white">
              korathryveco@gmail.com
            </a>
            <a href="tel:+6588137298" className="mt-3 block text-sm text-white/72 hover:text-white">
              +65 88137298
            </a>
            <div className="mt-6 flex gap-3 text-xs font-semibold">
              <a
                href="https://www.instagram.com/korathryveco"
                className="rounded-full bg-white/10 px-4 py-2 text-white/80 hover:bg-white/16 hover:text-white"
              >
                Instagram
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61585226572304"
                className="rounded-full bg-white/10 px-4 py-2 text-white/80 hover:bg-white/16 hover:text-white"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Kora Thryve & Co. All rights reserved.</p>
          <p>Created by Idle Digital.</p>
        </div>
      </SectionContainer>
    </footer>
  )
}
