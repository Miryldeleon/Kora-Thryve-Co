import Link from 'next/link'

type LoginPageProps = {
  searchParams: Promise<{
    next?: string
    error?: string
  }>
}

function BookIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.8 5.5a2.4 2.4 0 0 1 2.4-2.4H20v16.8H7.2a2.4 2.4 0 0 0-2.4 2.4V5.5Z" />
      <path d="M4.8 19.9a2.4 2.4 0 0 1 2.4-2.4H20" />
      <path d="M8.6 7.4h6.6" />
      <path d="M8.6 10.6h4.8" />
    </svg>
  )
}

function TeacherIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 8.3 9-4.2 9 4.2-9 4.2-9-4.2Z" />
      <path d="M7.4 10.4v4.4c0 1.7 2.1 3.1 4.6 3.1s4.6-1.4 4.6-3.1v-4.4" />
      <path d="M20.8 9v5.4" />
      <path d="M20.8 17.4v.1" />
    </svg>
  )
}

function appendNextParam(path: string, next?: string) {
  if (!next) return path
  return `${path}?next=${encodeURIComponent(next)}`
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f5ef] px-4 py-10 text-[#27352c] sm:px-6">
      <div
        aria-hidden="true"
        className="absolute -right-20 top-0 h-72 w-72 rounded-[42%_58%_54%_46%/44%_38%_62%_56%] bg-[#dfe9d7]/55 blur-[2px]"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -left-20 h-80 w-80 rounded-[56%_44%_39%_61%/42%_54%_46%_58%] bg-[#eadbc2]/60 blur-[2px]"
      />

      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d7dfcf] bg-white text-lg font-semibold text-[#5d745a] shadow-[0_18px_40px_-28px_rgba(39,53,44,0.45)]">
          KT
        </div>

        <h1 className="mt-7 max-w-3xl text-4xl font-semibold tracking-tight text-[#27352c] sm:text-5xl">
          Welcome back to Kora Thryve
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#667162]">
          Choose your account type to continue.
        </p>

        {error && (
          <p className="mt-6 w-full max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-10 grid w-full gap-5 text-left md:grid-cols-2">
          <article className="flex min-h-[320px] flex-col rounded-[32px] border border-[#dfe5da] bg-white/95 p-7 shadow-[0_24px_60px_-42px_rgba(39,53,44,0.45)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf3e8] text-[#5d735a]">
              <BookIcon />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-[#27352c]">Student</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-[#697568]">
              Access your classes, sessions, modules, and learning materials.
            </p>
            <Link
              href={appendNextParam('/login/student', next)}
              className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#7f927c] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_26px_-20px_rgba(70,91,65,0.8)] outline-none transition hover:-translate-y-0.5 hover:bg-[#6f826d] focus-visible:ring-2 focus-visible:ring-[#7f927c] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Login as Student
            </Link>
          </article>

          <article className="flex min-h-[320px] flex-col rounded-[32px] border border-[#dfe5da] bg-white/95 p-7 shadow-[0_24px_60px_-42px_rgba(39,53,44,0.45)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f3de] text-[#4f8b43]">
              <TeacherIcon />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-[#27352c]">Teacher</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-[#697568]">
              Manage your classes, sessions, learners, and teaching materials.
            </p>
            <Link
              href={appendNextParam('/login/teacher', next)}
              className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#79ad67] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_26px_-20px_rgba(75,132,61,0.85)] outline-none transition hover:-translate-y-0.5 hover:bg-[#679d55] focus-visible:ring-2 focus-visible:ring-[#79ad67] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Login as Teacher
            </Link>
          </article>
        </div>

        <div className="mt-7 text-center">
          <p className="text-sm text-[#667162]">
            New here?{' '}
            <Link
              href="/signup"
              className="font-semibold text-[#5d745a] underline-offset-4 hover:text-[#43563f] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7f927c] focus-visible:ring-offset-2"
            >
              Create an account
            </Link>
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex text-sm font-medium text-[#667162] underline-offset-4 hover:text-[#27352c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7f927c] focus-visible:ring-offset-2"
          >
            ← Back to Home
          </Link>
        </div>
      </section>
    </main>
  )
}
