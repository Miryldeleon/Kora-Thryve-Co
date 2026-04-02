import { formatDateTimeRange } from '@/lib/booking/format'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { brandUi } from '@/lib/ui/branding'
import { createAvailabilitySlot, deleteAvailabilitySlot } from './actions'

type TeacherAvailabilityPageProps = {
  searchParams: Promise<{
    success?: string
    error?: string
  }>
}

type TeacherSlot = {
  id: string
  starts_at: string
  ends_at: string
  is_booked: boolean
}

function availabilityBadgeClass(isBooked: boolean) {
  if (isBooked) return 'border-slate-200 bg-slate-100 text-slate-700'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

export default async function TeacherAvailabilityPage({
  searchParams,
}: TeacherAvailabilityPageProps) {
  const { supabase, user } = await requireApprovedTeacher()
  const { success, error } = await searchParams

  const { data, error: slotsError } = await supabase
    .from('teacher_availability_slots')
    .select('id, starts_at, ends_at, is_booked')
    .eq('teacher_id', user.id)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  if (slotsError) {
    throw new Error(slotsError.message)
  }

  const slots = (data ?? []) as TeacherSlot[]
  const availableDays = new Set(
    slots.map((slot) => new Date(slot.starts_at).toLocaleDateString('en-US'))
  ).size
  const slotsBooked = slots.filter((slot) => slot.is_booked).length
  const totalHours = Math.round(
    slots.reduce((sum, slot) => {
      const start = new Date(slot.starts_at).getTime()
      const end = new Date(slot.ends_at).getTime()
      return sum + (end - start) / (1000 * 60 * 60)
    }, 0)
  )

  return (
    <div className={brandUi.container}>
      <header className={brandUi.header}>
        <p className={brandUi.eyebrow}>Kora Thryve</p>
        <h1 className={brandUi.title}>Manage Availability</h1>
        <p className={brandUi.subtitle}>Set your teaching schedule for students to book sessions.</p>
      </header>

      {success && <p className={brandUi.successAlert}>{success}</p>}
      {error && <p className={brandUi.errorAlert}>{error}</p>}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className={brandUi.card}>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Available Days</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{availableDays}</p>
        </article>
        <article className={brandUi.card}>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Hours per Week</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{totalHours}</p>
        </article>
        <article className={brandUi.card}>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Slots Booked</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{slotsBooked}</p>
        </article>
      </section>

      <section className={brandUi.section}>
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:col-span-2">
            <h2 className={brandUi.sectionTitle}>Weekly Schedule</h2>
            <form action={createAvailabilitySlot} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="text-sm text-slate-600">
                Start time
                <input type="datetime-local" name="starts_at" className={brandUi.input} required />
              </label>
              <label className="text-sm text-slate-600">
                End time
                <input type="datetime-local" name="ends_at" className={brandUi.input} required />
              </label>
              <div className="flex items-end">
                <button type="submit" className={brandUi.primaryButton}>
                  + Add Time Slot
                </button>
              </div>
            </form>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className={brandUi.sectionTitle}>Booking Settings</h2>
            <p className="mt-2 text-sm text-slate-600">
              Keep your bookings up to date and review class changes quickly.
            </p>
            <div className="mt-4 grid gap-2">
              <a href="/teacher/bookings" className={brandUi.secondaryButton}>
                Review Bookings
              </a>
              <a href="/teacher/modules" className={brandUi.secondaryButton}>
                Update Modules
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className={brandUi.section}>
        <h2 className={brandUi.sectionTitle}>Scheduled Slots</h2>
        <div className="mt-5 space-y-3">
          {slots.length === 0 && <p className={brandUi.mutedCard}>No upcoming slots yet.</p>}

          {slots.map((slot) => (
            <article key={slot.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDateTimeRange(slot.starts_at, slot.ends_at)}
                  </p>
                  <p className="mt-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${availabilityBadgeClass(
                        slot.is_booked
                      )}`}
                    >
                      {slot.is_booked ? 'Booked' : 'Free'}
                    </span>
                  </p>
                </div>
                <form action={deleteAvailabilitySlot}>
                  <input type="hidden" name="slot_id" value={slot.id} />
                  <button
                    type="submit"
                    disabled={slot.is_booked}
                    className={`${brandUi.dangerButton} disabled:cursor-not-allowed disabled:bg-rose-300`}
                  >
                    Delete
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
