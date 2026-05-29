'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  isPdfFile,
  MAX_MODULE_UPLOAD_SIZE_BYTES,
  MODULE_UPLOAD_SIZE_ERROR_MESSAGE,
  TEACHER_MODULES_BUCKET,
} from '@/lib/modules/config'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

type ModuleUploadFormProps = {
  action: (input: UploadedModuleMetadataInput) => Promise<UploadedModuleMetadataResult>
  children: ReactNode
  className?: string
}

type UploadedModuleMetadataInput = {
  title: string
  description: string
  folderId: string | null
  fileName: string
  fileSize: number
  fileType: string
  storagePath: string
  returnPath: string | null
}

type UploadedModuleMetadataResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string }

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
  const [uploadFailed, setUploadFailed] = useState(false)
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

  const setUploadControlsDisabled = (form: HTMLFormElement, disabled: boolean) => {
    const submitButtons = form.querySelectorAll<HTMLButtonElement>('button[type="submit"]')
    submitButtons.forEach((button) => {
      button.disabled = disabled
      if (disabled) {
        button.dataset.originalText = button.textContent ?? ''
        button.textContent = 'Uploading...'
      } else if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText
      }
    })

    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]')
    if (fileInput) {
      fileInput.disabled = disabled
    }
  }

  const failUpload = (message: string, form: HTMLFormElement) => {
    submittingRef.current = false
    setUploadFailed(true)
    setStatusText('Upload failed')
    setError(message)
    setUploadControlsDisabled(form, false)
  }

  const getUploadErrorMessage = (errorValue: unknown) => {
    if (errorValue instanceof Error && errorValue.message) {
      return errorValue.message
    }

    return 'Upload failed'
  }

  return (
    <form
      className={className}
      onSubmit={async (event) => {
        event.preventDefault()

        const form = event.currentTarget
        const fileInput = event.currentTarget.elements.namedItem('file')
        const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] ?? null : null
        const formData = new FormData(form)
        const title = String(formData.get('title') ?? '').trim()
        const description = String(formData.get('description') ?? '').trim()
        const folderIdRaw = String(formData.get('folder_id') ?? '').trim()
        const returnPath = String(formData.get('return_to') ?? '').trim() || null

        setError(null)
        setUploadFailed(false)

        if (submittingRef.current) {
          return
        }

        if (!file) {
          setError('Please upload a PDF file')
          return
        }

        if (!isPdfFile(file)) {
          setError('Only PDF files are allowed')
          return
        }

        if (file.size > MAX_MODULE_UPLOAD_SIZE_BYTES) {
          setError(MODULE_UPLOAD_SIZE_ERROR_MESSAGE)
          return
        }

        submittingRef.current = true
        setUploadControlsDisabled(form, true)
        setFileInfo({ name: file.name, size: file.size })
        setStatusText('Uploading...')
        setProgress(12)
        setIsUploading(true)
        setUploadFailed(false)

        const supabase = createBrowserSupabaseClient()
        let uploadedStoragePath: string | null = null

        try {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser()

          if (userError || !user) {
            failUpload('Please sign in again before uploading.', form)
            return
          }

          const moduleId = crypto.randomUUID()
          const storagePath = `${user.id}/${moduleId}.pdf`

          console.info('[module-upload] direct storage upload started', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            storagePath,
          })

          const { error: storageError } = await supabase.storage
            .from(TEACHER_MODULES_BUCKET)
            .upload(storagePath, file, {
              contentType: 'application/pdf',
              upsert: false,
            })

          if (storageError) {
            console.error('[module-upload] direct storage upload failed', {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              storagePath,
              error: storageError.message,
              statusCode: 'statusCode' in storageError ? storageError.statusCode : undefined,
            })
            failUpload(storageError.message || 'Upload failed', form)
            return
          }

          uploadedStoragePath = storagePath
          setStatusText('Saving...')
          setProgress(92)

          const result = await action({
            title,
            description,
            folderId: folderIdRaw || null,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/pdf',
            storagePath,
            returnPath,
          })

          if (!result.ok) {
            failUpload(result.error, form)
            return
          }

          setStatusText('Upload complete')
          setProgress(100)
          window.setTimeout(() => {
            window.location.assign(result.redirectTo)
          }, 500)
        } catch (uploadError) {
          if (uploadedStoragePath) {
            const { error: cleanupError } = await supabase.storage
              .from(TEACHER_MODULES_BUCKET)
              .remove([uploadedStoragePath])

            if (cleanupError) {
              console.error('[module-upload] client cleanup failed after upload error', {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                storagePath: uploadedStoragePath,
                error: cleanupError.message,
                statusCode: 'statusCode' in cleanupError ? cleanupError.statusCode : undefined,
              })
            }
          }

          console.error('[module-upload] upload flow failed', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            storagePath: uploadedStoragePath,
            error: getUploadErrorMessage(uploadError),
          })
          failUpload(getUploadErrorMessage(uploadError), form)
        }
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
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] ${
                  uploadFailed
                    ? 'border-rose-700/60 bg-rose-900/30 text-rose-200'
                    : 'border-sky-700/60 bg-sky-900/30 text-sky-200'
                }`}
              >
                {uploadFailed ? 'Failed' : 'In progress'}
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
              {uploadFailed && error && <p className="mt-2 text-sm text-rose-200">{error}</p>}
              {uploadFailed && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUploading(false)
                    setUploadFailed(false)
                    setProgress(0)
                    setStatusText('Uploading...')
                  }}
                  className="mt-4 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
