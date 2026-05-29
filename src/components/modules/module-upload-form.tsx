'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
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

type UploadFileInfo = {
  name: string
  size: number
}

function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

export default function ModuleUploadForm({ action, children, className }: ModuleUploadFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('Uploading...')
  const [fileInfo, setFileInfo] = useState<UploadFileInfo | null>(null)
  const submittingRef = useRef(false)
  const roundedProgress = Math.round(progress)

  useEffect(() => {
    if (!isUploading) return

    const timer = window.setInterval(() => {
      setProgress((current) => {
        const increment = current < 35 ? 4 : current < 70 ? 2 : 0.7
        const next = Math.min(88, current + increment)

        if (next >= 80) {
          setStatusText('Saving...')
        } else if (next >= 18) {
          setStatusText('Uploading...')
        }

        return next
      })
    }, 650)

    return () => window.clearInterval(timer)
  }, [isUploading])

  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        const fileInput = event.currentTarget.elements.namedItem('file')
        const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] ?? null : null
        const submitButtons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button[type="submit"]')

        setError(null)

        if (submittingRef.current) {
          event.preventDefault()
          return
        }

        if (!file) return

        if (!isPdfFile(file)) {
          event.preventDefault()
          setError('Only PDF files are allowed')
          return
        }

        if (file.size > MAX_MODULE_UPLOAD_SIZE_BYTES) {
          event.preventDefault()
          setError(MODULE_UPLOAD_SIZE_ERROR_MESSAGE)
          return
        }

        submittingRef.current = true
        submitButtons.forEach((button) => {
          button.disabled = true
          button.dataset.originalText = button.textContent ?? ''
          button.textContent = 'Uploading...'
        })
        setFileInfo({ name: file.name, size: file.size })
        setStatusText('Uploading...')
        setProgress(12)
        setIsUploading(true)
      }}
    >
      {error && (
        <p className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {children}
      {isUploading && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="module-upload-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0f1622] p-5 text-slate-100 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between gap-4">
              <h2 id="module-upload-title" className="text-lg font-semibold">
                Uploading module
              </h2>
              <span className="rounded-full border border-sky-700/60 bg-sky-900/30 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-sky-200">
                In progress
              </span>
            </div>

            {fileInfo && (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-100">{fileInfo.name}</p>
                <p className="mt-1 text-xs text-slate-400">{formatFileSize(fileInfo.size)}</p>
              </div>
            )}

            <div className="mt-4">
              <div className="flex items-center gap-3">
                <div
                  role="progressbar"
                  aria-label="Module upload progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={roundedProgress}
                  className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#9cae82] via-[#cfb083] to-sky-400 transition-[width] duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="min-w-11 text-right text-sm font-semibold text-slate-100">
                  {roundedProgress}%
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-300" aria-live="polite">
                {statusText}
              </p>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
