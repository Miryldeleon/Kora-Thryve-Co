'use client'

import { useState } from 'react'
import { signUpWithEmailPassword } from '@/app/(marketing)/signup/actions'
import { authUi } from './auth-shell'
import { PasswordInput } from './password-input'

type RoleSignupFormProps = {
  role: 'student' | 'teacher'
  classOptions?: StudentSignupClassOption[]
  classesError?: string | null
}

export type StudentSignupClassOption = {
  templateId: string
  label: string
}

export function RoleSignupForm({
  role,
  classOptions = [],
  classesError = null,
}: RoleSignupFormProps) {
  const isStudent = role === 'student'
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const classSelectionUnavailable = isStudent && (classOptions.length === 0 || Boolean(classesError))
  const classSelectionMissing = isStudent && selectedClassIds.length === 0
  const submitDisabled = classSelectionUnavailable || classSelectionMissing

  function toggleClass(templateId: string) {
    setSelectedClassIds((current) =>
      current.includes(templateId)
        ? current.filter((value) => value !== templateId)
        : [...current, templateId]
    )
  }

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
      {isStudent && (
        <fieldset className="text-sm text-slate-600">
          <legend>Group Classes</legend>
          <div className="mt-2 grid gap-2">
            {classOptions.map((option) => {
              const checked = selectedClassIds.includes(option.templateId)

              return (
                <label
                  key={option.templateId}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                    checked
                      ? 'border-[#cfb083] bg-[#fbf6ee]'
                      : 'border-[#ddd7cc] bg-white hover:border-[#cfb083]'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="group_class_template_ids"
                    value={option.templateId}
                    checked={checked}
                    disabled={classSelectionUnavailable}
                    onChange={() => toggleClass(option.templateId)}
                    className="mt-1 h-4 w-4 rounded border-[#ddd7cc] text-[#cfb083]"
                  />
                  <span className="leading-6 text-slate-700">{option.label}</span>
                </label>
              )
            })}
          </div>
          {classesError ? (
            <span className="mt-2 block text-xs text-rose-600">{classesError}</span>
          ) : classOptions.length === 0 ? (
            <span className="mt-2 block text-xs text-slate-500">
              No active group classes are open for signup right now. Please check back later.
            </span>
          ) : selectedClassIds.length === 0 ? (
            <span className="mt-2 block text-xs text-slate-500">
              Select at least one group class to continue.
            </span>
          ) : null}
        </fieldset>
      )}
      <button
        type="submit"
        className={`${authUi.button} disabled:cursor-not-allowed disabled:opacity-60`}
        disabled={submitDisabled}
      >
        {role === 'student' ? 'Create student account' : 'Create teacher account'}
      </button>
    </form>
  )
}
