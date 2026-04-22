'use client'

import { loginWithEmailPassword } from '@/app/(marketing)/login/actions'
import { authUi } from './auth-shell'
import { PasswordInput } from './password-input'

type RoleLoginFormProps = {
  next?: string
  role: 'student' | 'teacher'
}

export function RoleLoginForm({ next, role }: RoleLoginFormProps) {
  return (
    <form action={loginWithEmailPassword} className="mt-7 grid gap-4">
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="next" value={next ?? ''} />
      <label className="text-sm text-slate-600">
        Email
        <input type="email" name="email" autoComplete="email" required className={authUi.input} />
      </label>
      <PasswordInput label="Password" name="password" autoComplete="current-password" />
      <button type="submit" className={authUi.button}>
        {role === 'student' ? 'Sign in as student' : 'Sign in as teacher'}
      </button>
      <a
        href={`/forgot-password?role=${role}`}
        className="text-center text-sm text-slate-500 underline-offset-4 transition hover:text-slate-700 hover:underline"
      >
        Forgot password?
      </a>
    </form>
  )
}
