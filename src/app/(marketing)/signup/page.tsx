import Link from 'next/link'
import { AuthShell, authUi } from '@/components/auth/auth-shell'

export default function SignupPage() {
  return (
    <AuthShell
      title="Welcome to Kora Thryve"
      subtitle="Please select your role to continue"
      wide
      footer={
        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className={authUi.secondaryLink}>
            Sign in
          </Link>
        </p>
      }
    >
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <a
          href="/signup/student"
          className="rounded-3xl border border-[#c9d8c2] bg-[#f3f9ef] px-6 py-6 text-left transition hover:-translate-y-0.5 hover:border-[#b8cab0] hover:shadow-[0_20px_35px_-24px_rgba(126,154,114,0.55)]"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#dce8d4] text-sm font-semibold text-[#496240]">
            S
          </span>
          <p className="mt-4 text-xl font-semibold text-slate-900">Signup as Student</p>
          <p className="mt-1 text-sm text-slate-600">Create a student account to book and join classes.</p>
        </a>
        <a
          href="/signup/teacher"
          className="rounded-3xl border border-[#e1d3be] bg-[#faf4ea] px-6 py-6 text-left transition hover:-translate-y-0.5 hover:border-[#d6c3a6] hover:shadow-[0_20px_35px_-24px_rgba(161,128,83,0.55)]"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f1e2cc] text-sm font-semibold text-[#775d38]">
            T
          </span>
          <p className="mt-4 text-xl font-semibold text-slate-900">Signup as Teacher</p>
          <p className="mt-1 text-sm text-slate-600">
            Create a teacher account to manage students and sessions.
          </p>
        </a>
      </div>
    </AuthShell>
  )
}
