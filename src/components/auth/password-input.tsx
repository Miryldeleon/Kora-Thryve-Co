'use client'

import { ChangeEventHandler, useId, useState } from 'react'
import { authUi } from './auth-shell'

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.7a3 3 0 0 0 4.2 4.2" />
        <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6 0 10 7 10 7a17.2 17.2 0 0 1-4 4.8" />
        <path d="M6.7 6.7A17.2 17.2 0 0 0 2 12s4 7 10 7a10.7 10.7 0 0 0 2.1-.2" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

type PasswordInputProps = {
  autoComplete: string
  label: string
  name: string
  onChange?: ChangeEventHandler<HTMLInputElement>
  required?: boolean
  value?: string
}

export function PasswordInput({
  autoComplete,
  label,
  name,
  onChange,
  required = true,
  value,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const inputId = useId()

  return (
    <label htmlFor={inputId} className="text-sm text-slate-600">
      {label}
      <span className="relative mt-2 block">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={onChange}
          className={`${authUi.input} mt-0 pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center rounded-r-2xl text-slate-400 transition hover:text-slate-600 focus:outline-none"
        >
          <EyeIcon hidden={visible} />
        </button>
      </span>
    </label>
  )
}
