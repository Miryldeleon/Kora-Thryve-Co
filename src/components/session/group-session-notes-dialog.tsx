'use client'

import { useEffect, useState } from 'react'
import { brandUi } from '@/lib/ui/branding'
import SessionNotesPanel from './session-notes-panel'

type GroupSessionNotesDialogProps = {
  sessionId: string
  sessionLabel: string
  isTeacher: boolean
}

type NotesResponse = {
  notes?: string
  error?: string
}

export default function GroupSessionNotesDialog({
  sessionId,
  sessionLabel,
  isTeacher,
}: GroupSessionNotesDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    async function loadNotes() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch(
          `/api/group-session-notes?${new URLSearchParams({ sessionId }).toString()}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        )
        const result = (await response.json()) as NotesResponse

        if (!response.ok) {
          if (!cancelled) setErrorMessage(result.error || 'Unable to load notes right now.')
          return
        }

        if (!cancelled) setNotes(result.notes ?? '')
      } catch {
        if (!cancelled) setErrorMessage('Unable to load notes right now.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadNotes()

    return () => {
      cancelled = true
    }
  }, [isOpen, sessionId])

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={brandUi.secondaryButton}>
        {isTeacher ? 'Edit Notes' : 'View Notes'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-4 sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`group-session-notes-title-${sessionId}`}
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {isTeacher ? 'Teacher notes' : 'Session notes'}
                </p>
                <h2
                  id={`group-session-notes-title-${sessionId}`}
                  className="mt-1 text-xl font-semibold text-slate-900"
                >
                  Session Notes
                </h2>
                <p className="mt-1 text-sm text-slate-500">{sessionLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            {isLoading ? (
              <p className={brandUi.mutedCard}>Loading notes...</p>
            ) : errorMessage ? (
              <p className={brandUi.errorAlert}>{errorMessage}</p>
            ) : (
              <SessionNotesPanel
                key={`${sessionId}-${isTeacher ? 'teacher' : 'student'}-${notes}`}
                resourceId={sessionId}
                initialNotes={notes}
                isTeacher={isTeacher}
                isCompletedReviewMode={false}
                apiPath="/api/group-session-notes"
                resourceParam="sessionId"
              />
            )}
          </section>
        </div>
      )}
    </>
  )
}
