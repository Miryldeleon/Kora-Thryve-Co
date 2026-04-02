'use client'

import { FormEvent, useState } from 'react'
import { brandUi } from '@/lib/ui/branding'

type ProfileFormProps = {
  initialFullName: string
  initialAge: number | null
  initialLocation: string | null
  email: string
  role: 'teacher' | 'student'
}

export default function ProfileForm({
  initialFullName,
  initialAge,
  initialLocation,
  email,
  role,
}: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName)
  const [age, setAge] = useState(initialAge?.toString() ?? '')
  const [location, setLocation] = useState(initialLocation ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [successText, setSuccessText] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setSuccessText(null)
    setErrorText(null)

    try {
      const parsedAge = age.trim() ? Number(age.trim()) : null
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          age: parsedAge,
          location,
        }),
      })
      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setErrorText(result.error || 'Unable to save profile.')
        return
      }

      setSuccessText('Profile updated successfully.')
    } catch {
      setErrorText('Unable to save profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={brandUi.section}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={brandUi.sectionTitle}>Profile Details</h2>
        <span className="inline-flex rounded-full border border-[#d9ccb9] bg-[#f7f3ed] px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-[#8b7758]">
          {role}
        </span>
      </div>

      {successText && <p className={brandUi.successAlert}>{successText}</p>}
      {errorText && <p className={brandUi.errorAlert}>{errorText}</p>}

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-600">
          Full Name
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={brandUi.input}
            placeholder="Your full name"
          />
        </label>

        <label className="text-sm text-slate-600">
          Email
          <input value={email} className={`${brandUi.input} bg-slate-100`} readOnly />
        </label>

        <label className="text-sm text-slate-600">
          Age
          <input
            type="number"
            min={1}
            max={120}
            value={age}
            onChange={(event) => setAge(event.target.value)}
            className={brandUi.input}
            placeholder="e.g. 16"
          />
        </label>

        <label className="text-sm text-slate-600">
          Location
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className={brandUi.input}
            placeholder="City / Country"
          />
        </label>

        <div className="md:col-span-2">
          <button type="submit" className={brandUi.primaryButton} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </section>
  )
}
