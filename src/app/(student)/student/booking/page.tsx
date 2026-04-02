import { formatDateTimeRange } from '@/lib/booking/format'
import { requireApprovedStudent } from '@/lib/auth/student'
import { bookingStatusBadgeClass, brandUi } from '@/lib/ui/branding'
import { createClient } from '@supabase/supabase-js'
import { createBooking } from './actions'

type StudentBookingPageProps = {
  searchParams: Promise<{
    teacher?: string
    success?: string
    error?: string
  }>
}

type AvailableSlot = {
  id: string
  teacher_id: string
  teacher_name: string | null
  starts_at: string
  ends_at: string
}

type ApprovedTeacher = {
  id: string
  full_name: string | null
  email: string | null
}

type StudentSession = {
  id: string
  teacher_name: string | null
  starts_at: string
  ends_at: string
  status: string
}

function isConfirmedStatus(status: string) {
  return status.trim().toLowerCase() === 'confirmed'
}

function isCompletedStatus(status: string) {
  return status.trim().toLowerCase() === 'completed'
}

async function fetchApprovedTeachers(
  supabase: Awaited<ReturnType<typeof requireApprovedStudent>>['supabase']
) {
  const baseQuery = supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'teacher')
    .eq('approval_status', 'approved')
    .order('full_name', { ascending: true })

  const { data, error } = await baseQuery

  if (error) {
    return {
      teachers: [] as ApprovedTeacher[],
      errorMessage: error.message,
    }
  }

  if ((data ?? []).length > 0) {
    return {
      teachers: (data ?? []) as ApprovedTeacher[],
      errorMessage: null as string | null,
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      teachers: (data ?? []) as ApprovedTeacher[],
      errorMessage: null as string | null,
    }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: adminData, error: adminError } = await adminClient
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'teacher')
    .eq('approval_status', 'approved')
    .order('full_name', { ascending: true })

  if (adminError) {
    return {
      teachers: [] as ApprovedTeacher[],
      errorMessage: adminError.message,
    }
  }

  return {
    teachers: (adminData ?? []) as ApprovedTeacher[],
    errorMessage: null as string | null,
  }
}

export default async function StudentBookingPage({
  searchParams,
}: StudentBookingPageProps) {
  const { supabase, user } = await requireApprovedStudent()
  const { teacher, success, error } = await searchParams

  const { teachers: approvedTeachers, errorMessage: teachersErrorMessage } =
    await fetchApprovedTeachers(supabase)
  const teacherOptions = approvedTeachers.map((teacherRow) => ({
    id: teacherRow.id,
    name: teacherRow.full_name?.trim() || teacherRow.email || '',
  }))

  const selectedTeacherId = teacher || teacherOptions[0]?.id || ''
  let filteredSlots: AvailableSlot[] = []
  let slotsErrorMessage: string | null = null

  if (selectedTeacherId && !teachersErrorMessage) {
    const { data: slotsData, error: slotsError } = await supabase
      .from('teacher_availability_slots')
      .select('id, teacher_id, teacher_name, starts_at, ends_at')
      .eq('teacher_id', selectedTeacherId)
      .eq('is_booked', false)
      .order('starts_at', { ascending: true })

    if (slotsError) {
      slotsErrorMessage = slotsError.message
    } else {
      filteredSlots = (slotsData ?? []) as AvailableSlot[]
    }
  }

  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, teacher_name, starts_at, ends_at, status')
    .eq('student_id', user.id)
    .order('starts_at', { ascending: true })

  if (bookingsError) {
    throw new Error(bookingsError.message)
  }

  const mySessions = (bookingsData ?? []) as StudentSession[]
  const selectedTeacherName =
    teacherOptions.find((option) => option.id === selectedTeacherId)?.name || 'Teacher'
  const nextAvailableSlot = filteredSlots[0] ?? null

  return (
    <div className={brandUi.container}>
      <div className={brandUi.header}>
        <p className={brandUi.eyebrow}>Kora Thryve</p>
        <h1 className={brandUi.title}>Book a Session</h1>
        <p className={brandUi.subtitle}>Choose an approved teacher and reserve a free time slot.</p>
      </div>

      {success && <p className={brandUi.successAlert}>{success}</p>}
      {error && <p className={brandUi.errorAlert}>{error}</p>}
      {teachersErrorMessage && <p className={brandUi.errorAlert}>{teachersErrorMessage}</p>}
      {slotsErrorMessage && <p className={brandUi.errorAlert}>{slotsErrorMessage}</p>}

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <article className={brandUi.section}>
          <h2 className={brandUi.sectionTitle}>Select Teacher</h2>
          <p className="mt-2 text-sm text-slate-600">Pick your teacher to load available schedule slots.</p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
            Teachers loaded: {teacherOptions.length}
          </p>
          {teacherOptions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No approved teachers found</p>
          ) : (
            <form className="mt-4 grid gap-3">
              <label className="text-sm text-slate-600">
                Teacher
                <select name="teacher" defaultValue={selectedTeacherId} className={brandUi.input}>
                  {teacherOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={brandUi.secondaryButton}>
                Show Available Times
              </button>
            </form>
          )}

          {selectedTeacherId && (
            <div className="mt-6 rounded-xl border border-[#e7e2d9] bg-[#faf6ef] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8b7758]">Booking Summary</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Teacher: {selectedTeacherName}</p>
              <p className="mt-1 text-sm text-slate-600">
                {nextAvailableSlot
                  ? formatDateTimeRange(nextAvailableSlot.starts_at, nextAvailableSlot.ends_at)
                  : 'Select a timeslot to confirm your booking.'}
              </p>
            </div>
          )}
        </article>

        <article className={brandUi.section}>
          <h2 className={brandUi.sectionTitle}>Available Time Slots</h2>
          <p className="mt-2 text-sm text-slate-600">Choose a slot to confirm your class booking.</p>
          <div className="mt-5 space-y-3">
            {teacherOptions.length > 0 &&
              filteredSlots.length === 0 &&
              !slotsErrorMessage &&
              selectedTeacherId && (
                <p className="text-sm text-slate-600">No free slots available for this teacher</p>
              )}
            {filteredSlots.map((slot) => (
              <article
                key={slot.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {slot.teacher_name || 'Teacher'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDateTimeRange(slot.starts_at, slot.ends_at)}
                  </p>
                </div>
                <form action={createBooking}>
                  <input type="hidden" name="slot_id" value={slot.id} />
                  <input type="hidden" name="teacher_filter" value={selectedTeacherId} />
                  <button type="submit" className={brandUi.primaryButton}>
                    Confirm Booking
                  </button>
                </form>
              </article>
            ))}
          </div>
        </article>
      </section>

      {success && nextAvailableSlot && (
        <section className={brandUi.section}>
          <h2 className={brandUi.sectionTitle}>Booking Confirmed</h2>
          <p className="mt-2 text-sm text-slate-600">
            Teacher: {selectedTeacherName} | {formatDateTimeRange(nextAvailableSlot.starts_at, nextAvailableSlot.ends_at)}
          </p>
          <a href="#my-booked-sessions" className={`mt-4 ${brandUi.primaryButton}`}>
            View My Booked Sessions
          </a>
        </section>
      )}

      <section id="my-booked-sessions" className={brandUi.section}>
        <h2 className={brandUi.sectionTitle}>My Booked Sessions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {mySessions.length === 0 && <p className={brandUi.mutedCard}>You have no bookings yet.</p>}
          {mySessions.map((session) => (
            <article key={session.id} className={brandUi.card}>
              <p className="text-lg font-semibold">{session.teacher_name || 'Teacher'}</p>
              <p className="mt-2 text-sm text-slate-600">
                {formatDateTimeRange(session.starts_at, session.ends_at)}
              </p>
              <p className="mt-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${bookingStatusBadgeClass(
                    session.status
                  )}`}
                >
                  {session.status}
                </span>
              </p>
              {(isConfirmedStatus(session.status) || isCompletedStatus(session.status)) && (
                <a href={`/session/${session.id}`} className={`mt-4 ${brandUi.primaryButton}`}>
                  {isCompletedStatus(session.status) ? 'View Session' : 'Join Session'}
                </a>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
