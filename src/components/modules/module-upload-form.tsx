'use client'

import { useState, type ReactNode } from 'react'
import {
  isPdfFile,
  MAX_MODULE_UPLOAD_SIZE_BYTES,
  MODULE_UPLOAD_SIZE_ERROR_MESSAGE,
} from '@/lib/modules/config'

type ModuleUploadFormProps = {
  action: (formData: FormData) => void | Promise<void>
  children: ReactNode
  className?: string
}

export default function ModuleUploadForm({ action, children, className }: ModuleUploadFormProps) {
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        const fileInput = event.currentTarget.elements.namedItem('file')
        const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] ?? null : null

        setError(null)

        if (!file) return

        if (!isPdfFile(file)) {
          event.preventDefault()
          setError('Only PDF files are allowed')
          return
        }

        if (file.size > MAX_MODULE_UPLOAD_SIZE_BYTES) {
          event.preventDefault()
          setError(MODULE_UPLOAD_SIZE_ERROR_MESSAGE)
        }
      }}
    >
      {error && (
        <p className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {children}
    </form>
  )
}
