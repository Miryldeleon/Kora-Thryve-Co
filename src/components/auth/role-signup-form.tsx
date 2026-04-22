'use client'

import { signUpWithEmailPassword } from '@/app/(marketing)/signup/actions'
import { authUi } from './auth-shell'
import { PasswordInput } from './password-input'

type RoleSignupFormProps = {
  role: 'student' | 'teacher'
}

export function RoleSignupForm({ role }: RoleSignupFormProps) {
  return (
    <form action={signUpWithEmailPassword} className="mt-7 grid gap-4">
      <input type="hidden" name="role" value={role} />
      <label className="text-sm text-slate-600">
        Full Name
        <input type="text" name="full_name" autoComplete="name" required className={authUi.input} />
      </label>
      <label className="text-sm text-slate-600">
        Email
        <input type="email" name="email" autoComplete="email" required className={authUi.input} />
      </label>
      <PasswordInput label="Password" name="password" autoComplete="new-password" />
      <button type="submit" className={authUi.button}>
        {role === 'student' ? 'Create student account' : 'Create teacher account'}
      </button>
    </form>
  )
}
