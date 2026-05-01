import Link from 'next/link'
import { ReactNode } from 'react'
import logoIcon from '@/app/Kora-Thryve-Co-Logo.png'
import Image from 'next/image'

export const brandName = 'Kora Thryve & Co.'
export const brandTagline = 'Grow with guidance'

export function SectionContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1180px] px-5 sm:px-8 ${className}`}>{children}</div>
}

export function MarketingBlob({
  className,
  color,
  path,
}: {
  className: string
  color: string
  path: string
}) {
  return (
    <div className={`marketing-blob ${className}`}>
      <svg viewBox="0 0 320 320" className="h-full w-full" fill="none" aria-hidden="true">
        <path d={path} fill={color} />
      </svg>
    </div>
  )
}

export function MarketingPill({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${className}`}
    >
      {children}
    </div>
  )
}

export function MarketingIcon({ type, className = 'h-5 w-5' }: { type: string; className?: string }) {
  switch (type) {
    case 'book':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v15.5A1.5 1.5 0 0 0 18.5 18H6.5A2.5 2.5 0 0 0 4 20.5Z" />
          <path d="M8 8h8M8 12h8" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z" />
          <path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7ZM5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7Z" />
        </svg>
      )
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 20-1.1-1C5.1 13.8 2 11 2 7.5 2 5 4 3 6.5 3c1.7 0 3.4.8 4.5 2.1C12.1 3.8 13.8 3 15.5 3 18 3 20 5 20 7.5c0 3.5-3.1 6.3-8.9 11.5Z" />
        </svg>
      )
    case 'mic':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Z" />
          <path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8" />
        </svg>
      )
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 2v4M16 2v4M3 10h18" />
          <rect x="3" y="4" width="18" height="17" rx="3" />
        </svg>
      )
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" />
        </svg>
      )
    case 'video':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="m16 10 5-3v10l-5-3Z" />
        </svg>
      )
    case 'mail':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      )
    case 'message':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6a8 8 0 1 1 18-5Z" />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'award':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="5" />
          <path d="m8.5 12.5-1.4 8 4.9-2.9 4.9 2.9-1.4-8" />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9Z" />
        </svg>
      )
    case 'check':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.3">
          <path d="m5 12 4 4L19 6" />
        </svg>
      )
    case 'arrow':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      )
    case 'quote':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <path d="M10.6 6.2c-2.8 1.4-4.7 3.8-5 8.2H10v5H4.2C4 14 5.6 9.2 9.8 6l.8.2Zm9 0c-2.8 1.4-4.7 3.8-5 8.2H19v5h-5.8c-.2-5.4 1.4-10.2 5.6-13.4l.8.2Z" />
        </svg>
      )
    default:
      return null
  }
}

export function MarketingDetailRow({
  icon,
  children,
}: {
  icon: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--body-muted)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/82 text-[var(--sage-green)]">
        <MarketingIcon type={icon} className="h-4 w-4" />
      </span>
      <span>{children}</span>
    </div>
  )
}

export function MarketingPageHero({
  badge,
  icon = 'sparkles',
  title,
  subtitle,
  activePath,
}: {
  badge?: string
  icon?: string
  title: string
  subtitle: string
  activePath?: string
}) {
  return (
    <section className="relative isolate overflow-hidden bg-white pb-20 pt-1 sm:pb-24 lg:pb-32">
      <MarketingBlob
        className="left-[-4rem] top-36 h-48 w-48 opacity-22"
        color="color-mix(in srgb, var(--soft-peach) 34%, white 66%)"
        path="M55 126Q31 76 76 46t101 4q56 34 52 93t-56 93Q121 270 75 228T55 126Z"
      />
      <MarketingBlob
        className="right-[-3rem] top-40 h-56 w-56 opacity-28"
        color="color-mix(in srgb, var(--warm-sand) 30%, white 70%)"
        path="M62 112Q85 37 158 48t95 80q22 69-29 116t-126 24Q23 222 42 150t20-38Z"
      />
      <MarketingNavbar activePath={activePath} />
      <SectionContainer>
        <div className="mx-auto max-w-4xl pt-20 text-center sm:pt-28 lg:pt-32">
          {badge ? (
            <MarketingPill className="mx-auto w-fit border-[color:rgb(154_163_151/0.22)] bg-[var(--cream)] text-[var(--deep-forest)]">
              <span className="text-[var(--sage-green)]">
                <MarketingIcon type={icon} className="h-4 w-4" />
              </span>
              <span>{badge}</span>
            </MarketingPill>
          ) : null}
          <h1 className="mt-7 text-5xl font-extrabold leading-[1.02] tracking-tight text-[var(--deep-forest)] sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[var(--body-muted)] sm:text-xl">{subtitle}</p>
        </div>
      </SectionContainer>
    </section>
  )
}

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Teachers', href: '/teachers' },
  { label: 'Classes', href: '/classes' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export function MarketingNavbar({ dark = false, activePath }: { dark?: boolean; activePath?: string }) {
  const textTone = dark ? 'text-white' : 'text-[var(--deep-forest)]'
  const subtleTone = dark ? 'text-white/70' : 'text-[color:rgb(90_107_94/0.72)]'
  const panelTone = dark
    ? 'border-white/12 bg-white/10 backdrop-blur-md'
    : 'border-[color:rgb(154_163_151/0.14)] bg-white/88 backdrop-blur-md'
  const getLinkTone = (href: string) => {
    const isActive = activePath === href
    if (dark) return isActive ? 'text-white' : 'text-white/82 hover:text-white'
    return isActive
      ? 'rounded-full bg-[var(--cream)] px-4 py-2 text-[var(--deep-forest)] shadow-[0_12px_24px_-22px_rgba(47,58,51,0.45)]'
      : 'text-[color:rgb(47_58_51/0.72)] hover:text-[var(--deep-forest)]'
  }
  const getMobileLinkTone = (href: string) =>
    activePath === href
      ? 'rounded-2xl bg-[var(--cream)] px-4 py-3 font-extrabold text-[var(--deep-forest)]'
      : 'rounded-2xl px-4 py-3 hover:bg-[var(--cream)]'

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
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={getLinkTone(item.href)}>
                {item.label}
              </Link>
            ))}
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
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className={getMobileLinkTone(item.href)}>
                    {item.label}
                  </Link>
                ))}
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
  text = 'Build confidence, discover support, and grow with guidance every step of the way.',
  buttonLabel,
  buttonHref,
}: {
  title: string
  text?: string
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
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90 sm:text-xl">{text}</p>
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
              <Link href="/teachers" className="hover:text-white">
                Our Teachers
              </Link>
              <Link href="/classes" className="hover:text-white">
                Classes
              </Link>
              <Link href="/contact" className="hover:text-white">
                Contact
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
