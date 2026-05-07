'use client'

import Link from 'next/link'
import { loginWithEmailPassword } from '@/app/(marketing)/login/actions'
import { PasswordInput } from './password-input'

type RoleLoginFormProps = {
  next?: string
  role: 'student' | 'teacher'
}

function EmailIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

const labelClassName = 'text-sm font-medium text-[#59685c]'
const inputClassName =
  'block w-full rounded-2xl border border-[#dfe5da] bg-[#fbfcfa] px-12 py-3.5 text-sm text-[#27352c] outline-none transition placeholder:text-[#9ba69a] focus:border-[#9aa397] focus:bg-white focus:ring-2 focus:ring-[#dcefe5]'

export function RoleLoginForm({ next, role }: RoleLoginFormProps) {
  return (
    <form action={loginWithEmailPassword} className="grid gap-5">
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="next" value={next ?? ''} />

      <label className={labelClassName}>
        Email
        <span className="relative mt-2 block">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-[#91a08e]">
            <EmailIcon />
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className={inputClassName}
            placeholder="you@example.com"
          />
        </span>
      </label>

      <div>
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          labelClassName={labelClassName}
          inputClassName={inputClassName}
          buttonClassName="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-2xl text-[#91a08e] transition hover:text-[#5d745a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9aa397]"
        />
        <div className="mt-2 flex justify-end">
          <Link
            href={`/forgot-password?role=${role}`}
            className="text-sm font-medium text-[#6d8069] underline-offset-4 hover:text-[#4f684c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9aa397] focus-visible:ring-offset-2"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <button
        type="submit"
        className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-[#7f927c] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_26px_-20px_rgba(70,91,65,0.8)] outline-none transition hover:-translate-y-0.5 hover:bg-[#6f826d] focus-visible:ring-2 focus-visible:ring-[#7f927c] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        Login
      </button>
    </form>
  )
}
