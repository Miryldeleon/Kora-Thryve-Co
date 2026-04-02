'use client'

import { FormEvent, useState } from 'react'
import { brandUi } from '@/lib/ui/branding'

type SessionNotesFormProps = {
  bookingId: string
  initialNotes: string
  onSaved?: (nextNotes: string) => void
}

export default function SessionNotesForm({
  bookingId,
  initialNotes,
  onSaved,
}: SessionNotesFormProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/session-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          notes,
        }),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setErrorMessage(result.error || 'Unable to save notes right now.')
        return
      }

      setSuccessMessage('Session notes saved.')
      onSaved?.(notes)
    } catch {
      setErrorMessage('Unable to save notes right now.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      {successMessage && <p className={brandUi.successAlert}>{successMessage}</p>}
      {errorMessage && <p className={brandUi.errorAlert}>{errorMessage}</p>}
      <textarea
        name="notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Write session notes and whiteboard ideas here..."
        className={`${brandUi.textarea} min-h-[240px] border-slate-200/70 bg-slate-50/70 p-4`}
      />
      <button type="submit" disabled={isSaving} className={`mt-3 ${brandUi.primaryButton}`}>
        {isSaving ? 'Saving...' : 'Save Notes'}
      </button>
    </form>
  )
}
