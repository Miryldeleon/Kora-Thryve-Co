'use client'

import { useEffect, useRef, useState } from 'react'
import { brandUi } from '@/lib/ui/branding'
import SessionNotesForm from './session-notes-form'

type SessionNotesPanelProps = {
  resourceId: string
  initialNotes: string
  isTeacher: boolean
  isCompletedReviewMode: boolean
  apiPath?: string
  resourceParam?: string
}

type NotesResponse = {
  notes?: string
  error?: string
}

export default function SessionNotesPanel({
  resourceId,
  initialNotes,
  isTeacher,
  isCompletedReviewMode,
  apiPath = '/api/session-notes',
  resourceParam = 'bookingId',
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
        const response = await fetch(
          `${apiPath}?${new URLSearchParams({ [resourceParam]: resourceId }).toString()}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        )
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
  }, [apiPath, isEditable, resourceId, resourceParam])

  const handleSaved = (nextNotes: string) => {
    lastNotesRef.current = nextNotes
    setNotes(nextNotes)
  }

  if (isEditable) {
    return (
      <SessionNotesForm
        resourceId={resourceId}
        initialNotes={notes}
        apiPath={apiPath}
        resourceParam={resourceParam}
        onSaved={handleSaved}
      />
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
