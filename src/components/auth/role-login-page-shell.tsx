import Link from 'next/link'
import {
  MarketingBlob,
  MarketingFooter,
  MarketingIcon,
  MarketingNavbar,
  SectionContainer,
} from '@/components/marketing/site-chrome'
import { RoleLoginForm } from './role-login-form'

type RoleLoginPageShellProps = {
  error?: string
  heading: string
  next?: string
  rightHeadline: string
  rightParagraph: string
  role: 'student' | 'teacher'
  signupHref: string
  subtitle: string
}

export function RoleLoginPageShell({
  error,
  heading,
  next,
  rightHeadline,
  rightParagraph,
  role,
  signupHref,
  subtitle,
}: RoleLoginPageShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[var(--deep-forest)]">
      <div className="relative isolate overflow-hidden">
        <MarketingBlob
          className="left-[-5rem] top-44 hidden h-56 w-56 opacity-35 sm:block"
          color="color-mix(in srgb, var(--warm-sand) 34%, white 66%)"
          path="M55 126Q31 76 76 46t101 4q56 34 52 93t-56 93Q121 270 75 228T55 126Z"
        />
        <MarketingBlob
          className="right-[-4rem] top-28 hidden h-64 w-64 opacity-32 sm:block"
          color="color-mix(in srgb, var(--soft-peach) 30%, white 70%)"
          path="M62 112Q85 37 158 48t95 80q22 69-29 116t-126 24Q23 222 42 150t20-38Z"
        />
        <MarketingBlob
          className="bottom-8 left-[48%] hidden h-40 w-40 opacity-28 lg:block"
          color="color-mix(in srgb, var(--soft-mint) 55%, white 45%)"
          path="M54 108Q39 51 96 39t70 42q13 54-29 87t-83-15q-14-18 0-45Z"
        />

        <MarketingNavbar activePath="/login" />

        <main className="relative z-10 pb-20 pt-8 sm:pb-24 lg:pb-28">
          <SectionContainer>
            <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
              <section className="mx-auto w-full max-w-[520px] lg:mx-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d7dfcf] bg-white text-lg font-semibold text-[#5d745a] shadow-[0_18px_40px_-28px_rgba(39,53,44,0.45)]">
                  KT
                </div>
                <h1 className="mt-7 text-4xl font-semibold tracking-tight text-[var(--deep-forest)] sm:text-5xl">
                  {heading}
                </h1>
                <p className="mt-4 text-base leading-7 text-[var(--body-muted)]">{subtitle}</p>

                <div className="mt-8 rounded-[34px] border border-[color:rgb(154_163_151/0.16)] bg-white p-6 shadow-[0_30px_70px_-48px_rgba(47,58,51,0.5)] sm:p-8">
                  {error && (
                    <p className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </p>
                  )}

                  <RoleLoginForm role={role} next={next} />

                  <div className="mt-6 border-t border-[#edf1e9] pt-5 text-center">
                    <p className="text-sm text-[#667162]">
                      New here?{' '}
                      <Link
                        href={signupHref}
                        className="font-semibold text-[#5d745a] underline-offset-4 hover:text-[#43563f] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9aa397] focus-visible:ring-offset-2"
                      >
                        Create an account
                      </Link>
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#7d887c]">
                      Sign in using your approved {role} account.
                    </p>
                  </div>
                </div>

                <Link
                  href="/"
                  className="mt-5 inline-flex text-sm font-medium text-[#667162] underline-offset-4 hover:text-[#27352c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9aa397] focus-visible:ring-offset-2"
                >
                  ← Back to Home
                </Link>
              </section>

              <aside className="relative mx-auto w-full max-w-[560px] rounded-[44px] border border-white/70 bg-white/45 p-7 shadow-[0_30px_70px_-56px_rgba(47,58,51,0.45)] backdrop-blur-sm sm:p-10 lg:mx-0">
                <div
                  aria-hidden="true"
                  className="absolute -right-10 -top-10 h-32 w-32 rounded-[42%_58%_54%_46%/44%_38%_62%_56%] bg-[#dfe9d7]/75"
                />
                <div
                  aria-hidden="true"
                  className="absolute -bottom-10 left-12 h-28 w-28 rounded-[56%_44%_39%_61%/42%_54%_46%_58%] bg-[#eadbc2]/70"
                />

                <div className="relative z-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[26px] bg-[#edf3e8] text-[#5d735a] shadow-[0_18px_35px_-28px_rgba(47,58,51,0.5)]">
                    <MarketingIcon type="sparkles" className="h-7 w-7" />
                  </div>
                  <h2 className="mt-8 max-w-md text-4xl font-semibold leading-tight tracking-tight text-[var(--deep-forest)] sm:text-5xl">
                    {rightHeadline}
                  </h2>
                  <p className="mt-5 max-w-md text-base leading-8 text-[var(--body-muted)]">
                    {rightParagraph}
                  </p>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {[
                      ['book', role === 'student' ? 'Classes' : 'Planning'],
                      ['users', role === 'student' ? 'Sessions' : 'Learners'],
                      ['heart', role === 'student' ? 'Support' : 'Guidance'],
                    ].map(([icon, label]) => (
                      <div
                        key={label}
                        className="rounded-3xl border border-white/80 bg-white/75 px-4 py-4 text-sm font-semibold text-[#5d745a]"
                      >
                        <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f4f8f0] text-[#7f927c]">
                          <MarketingIcon type={icon} className="h-4 w-4" />
                        </span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </SectionContainer>
        </main>
      </div>

      <MarketingFooter />
    </div>
  )
}
