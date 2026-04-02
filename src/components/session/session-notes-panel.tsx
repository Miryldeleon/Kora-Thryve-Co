'use client'

import { useEffect, useRef, useState } from 'react'
import { brandUi } from '@/lib/ui/branding'
import SessionNotesForm from './session-notes-form'

type SessionNotesPanelProps = {
  bookingId: string
  initialNotes: string
  isTeacher: boolean
  isCompletedReviewMode: boolean
}

type NotesResponse = {
  notes?: string
  error?: string
}

export default function SessionNotesPanel({
  bookingId,
  initialNotes,
  isTeacher,
  isCompletedReviewMode,
}: SessionNotesPanelProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [loadError, setLoadError] = useState<string | null>(null)
  const lastNotesRef = useRef(initialNotes)
  const isEditable = isTeacher && !isCompletedReviewMode

  useEffect(() => {
    if (isEditable) return

    let cancelled = false
    let intervalId: number | null = null

    const refreshNotes = async () => {
      try {
        const response = await fetch(`/api/session-notes?bookingId=${encodeURIComponent(bookingId)}`, {
          method: 'GET',
          cache: 'no-store',
        })
        const result = (await response.json()) as NotesResponse

        if (!response.ok) {
          if (!cancelled) setLoadError(result.error || 'Unable to load latest notes.')
          return
        }

        const nextNotes = result.notes ?? ''
        if (!cancelled && nextNotes !== lastNotesRef.current) {
          lastNotesRef.current = nextNotes
          setNotes(nextNotes)
        }
        if (!cancelled) setLoadError(null)
      } catch {
        if (!cancelled) setLoadError('Unable to load latest notes.')
      }
    }

    void refreshNotes()
    intervalId = window.setInterval(() => {
      void refreshNotes()
    }, 4000)

    return () => {
      cancelled = true
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [bookingId, isEditable])

  const handleSaved = (nextNotes: string) => {
    lastNotesRef.current = nextNotes
    setNotes(nextNotes)
  }

  if (isEditable) {
    return (
      <SessionNotesForm bookingId={bookingId} initialNotes={notes} onSaved={handleSaved} />
    )
  }

  return (
    <>
      {loadError && <p className={brandUi.errorAlert}>{loadError}</p>}
      {notes.trim() ? (
        <div className="mt-4 min-h-[240px] whitespace-pre-wrap rounded-xl border border-slate-200/70 bg-slate-50/80 p-5 text-sm text-slate-700">
          {notes}
        </div>
      ) : (
        <p className={brandUi.mutedCard}>No session notes have been shared yet.</p>
      )}
    </>
  )
}
