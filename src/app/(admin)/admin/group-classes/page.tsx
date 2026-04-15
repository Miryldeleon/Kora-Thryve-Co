import { requireAdminAccess } from '@/lib/auth/admin'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { adminSignOut } from '../actions'
import {
  createRecurringClass,
  deleteRecurringClass,
  unenrollStudent,
} from './actions'

type AdminGroupClassesPageProps = {
  searchParams: Promise<{
    success?: string
    error?: string
  }>
}

type GroupClassTemplate = {
  id: string
  title: string
  description: string | null
  teacher_id: string
  duration_minutes: number
  timezone: string
  is_active: boolean
  created_at: string
}

type GroupClassRecurrenceRule = {
  id: string
  template_id: string
  weekday: number
  week_of_month: number
  start_time_local: string
  end_time_local: string
  effective_from: string
  effective_to: string | null
  is_active: boolean
}

type GroupClassEnrollment = {
  id: string
  template_id: string
  student_id: string
  status: 'active' | 'paused' | 'removed' | string
  is_active: boolean
}

type GroupClassSession = {
  id: string
  template_id: string
  session_date: string
  start_time_local: string
  end_time_local: string
  status: 'scheduled' | 'completed' | 'cancelled' | string
  meeting_room_name: string
  is_active: boolean
}

type GroupClassSessionParticipant = {
  id: string
  session_id: string
  is_active: boolean
}

type ProfileOption = {
  id: string
  full_name: string | null
  email: string | null
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const

const WEEK_OF_MONTH_OPTIONS = [
  { value: 1, label: '1st week' },
  { value: 2, label: '2nd week' },
  { value: 3, label: '3rd week' },
  { value: 4, label: '4th week' },
  { value: 5, label: '5th week' },
] as const

function profileLabel(profile: ProfileOption) {
  return profile.full_name?.trim() || profile.email || profile.id
}

function summarizeSchedule(rule: GroupClassRecurrenceRule) {
  const weekday = WEEKDAY_OPTIONS.find((item) => item.value === rule.weekday)?.label || 'Unknown day'
  const week = WEEK_OF_MONTH_OPTIONS.find((item) => item.value === rule.week_of_month)?.label || 'Week'
  return week + ', ' + weekday + ', ' + rule.start_time_local + ' - ' + rule.end_time_local
}

function formatRuleWindowDate(isoDate: string) {
  return formatIsoCalendarDate(isoDate, { dateStyle: 'medium' })
}

function statusBadgeClass(status: string) {
  if (status === 'active') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'paused') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (status === 'removed') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

export default async function AdminGroupClassesPage({ searchParams }: AdminGroupClassesPageProps) {
  const { supabase } = await requireAdminAccess()
  const { success, error } = await searchParams

  const { data: classData, error: classError } = await supabase
    .from('group_class_templates')
    .select('id, title, description, teacher_id, duration_minutes, timezone, is_active, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (classError) {
    throw new Error(classError.message)
  }

  const { data: scheduleData, error: scheduleError } = await supabase
    .from('group_class_recurrence_rules')
    .select(
      'id, template_id, weekday, week_of_month, start_time_local, end_time_local, effective_from, effective_to, is_active'
    )
    .eq('is_active', true)
    .order('effective_from', { ascending: true })

  if (scheduleError) {
    throw new Error(scheduleError.message)
  }

  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from('group_class_enrollments')
    .select('id, template_id, student_id, status, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (enrollmentError) {
    throw new Error(enrollmentError.message)
  }

  const { data: teacherData, error: teacherError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'teacher')
    .eq('approval_status', 'approved')
    .order('full_name', { ascending: true })

  if (teacherError) {
    throw new Error(teacherError.message)
  }

  const { data: studentData, error: studentError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'student')
    .eq('approval_status', 'approved')
    .order('full_name', { ascending: true })

  if (studentError) {
    throw new Error(studentError.message)
  }

  const todayIsoDate = new Date().toISOString().slice(0, 10)
  const { data: sessionData, error: sessionError } = await supabase
    .from('group_class_sessions')
    .select('id, template_id, session_date, start_time_local, end_time_local, status, meeting_room_name, is_active')
    .eq('is_active', true)
    .gte('session_date', todayIsoDate)
    .order('session_date', { ascending: true })
    .order('start_time_local', { ascending: true })

  if (sessionError) {
    throw new Error(sessionError.message)
  }

  const classes = (classData ?? []) as GroupClassTemplate[]
  const schedules = (scheduleData ?? []) as GroupClassRecurrenceRule[]
  const enrollments = (enrollmentData ?? []) as GroupClassEnrollment[]
  const teachers = (teacherData ?? []) as ProfileOption[]
  const students = (studentData ?? []) as ProfileOption[]
  const sessions = (sessionData ?? []) as GroupClassSession[]

  const sessionIds = sessions.map((session) => session.id)
  let participants: GroupClassSessionParticipant[] = []

  if (sessionIds.length > 0) {
    const { data: participantData, error: participantError } = await supabase
      .from('group_class_session_participants')
      .select('id, session_id, is_active')
      .eq('is_active', true)
      .in('session_id', sessionIds)

    if (participantError) {
      throw new Error(participantError.message)
    }

    participants = (participantData ?? []) as GroupClassSessionParticipant[]
  }

  const teacherById = new Map(teachers.map((teacher) => [teacher.id, profileLabel(teacher)]))
  const studentById = new Map(students.map((student) => [student.id, profileLabel(student)]))

  const scheduleByClass = new Map<string, GroupClassRecurrenceRule[]>()
  for (const schedule of schedules) {
    const current = scheduleByClass.get(schedule.template_id) ?? []
    current.push(schedule)
    scheduleByClass.set(schedule.template_id, current)
  }

  const enrollmentByClass = new Map<string, GroupClassEnrollment[]>()
  for (const enrollment of enrollments) {
    const current = enrollmentByClass.get(enrollment.template_id) ?? []
    current.push(enrollment)
    enrollmentByClass.set(enrollment.template_id, current)
  }

  const sessionsByClass = new Map<string, GroupClassSession[]>()
  for (const session of sessions) {
    const current = sessionsByClass.get(session.template_id) ?? []
    current.push(session)
    sessionsByClass.set(session.template_id, current)
  }

  const participantCountBySession = new Map<string, number>()
  for (const participant of participants) {
    participantCountBySession.set(
      participant.session_id,
      (participantCountBySession.get(participant.session_id) ?? 0) + 1
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kora Thryve</p>
            <h1 className="mt-2 text-3xl font-semibold">Recurring Classes</h1>
            <p className="mt-2 text-sm text-slate-600">
              Create recurring classes, assign teachers, set schedules, and enroll students.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/admin/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Dashboard
            </a>
            <a
              href="/admin/approvals"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Approvals
            </a>
            <a
              href="/admin/modules"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Modules
            </a>
            <form action={adminSignOut}>
              <button
                type="submit"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {success && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create Recurring Class</h2>
          <form action={createRecurringClass} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="return_to" value="/admin/group-classes" />

            <label className="text-sm text-slate-600">
              Class Name
              <input
                type="text"
                name="title"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="English Level 3-4"
              />
            </label>

            <label className="text-sm text-slate-600">
              Assigned Teacher
              <select
                name="teacher_id"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {profileLabel(teacher)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-600 md:col-span-2">
              Description (optional)
              <textarea
                name="description"
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Class overview and learning goals"
              />
            </label>

            <label className="text-sm text-slate-600">
              Weekday
              <select
                name="weekday"
                required
                defaultValue={6}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="text-sm text-slate-600">
              <legend>Weeks of Month</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {WEEK_OF_MONTH_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      name="week_of_months"
                      value={option.value}
                      defaultChecked={option.value === 1 || option.value === 3}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="text-sm text-slate-600">
              Start Time
              <input
                type="time"
                name="start_time_local"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-600">
              End Time
              <input
                type="time"
                name="end_time_local"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-600">
              Effective From
              <input
                type="date"
                name="effective_from"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-600">
              Effective To (optional)
              <input
                type="date"
                name="effective_to"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-600 md:col-span-2">
              Timezone
              <input
                type="text"
                name="timezone"
                defaultValue="Asia/Manila"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <fieldset className="text-sm text-slate-600 md:col-span-2">
              <legend>Enroll Students (optional)</legend>
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2">
                {students.length === 0 && (
                  <p className="px-2 py-1 text-sm text-slate-500">No approved students available.</p>
                )}
                {students.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
                  >
                    <span className="truncate">{profileLabel(student)}</span>
                    <input type="checkbox" name="student_ids" value={student.id} />
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Create Recurring Class
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Existing Recurring Classes</h2>
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500">
              {classes.length} class{classes.length === 1 ? '' : 'es'}
            </span>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              No recurring classes yet.
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((item) => {
                const classSchedules = scheduleByClass.get(item.id) ?? []
                const activeSchedules = classSchedules.filter((row) => row.is_active)
                const scheduleSummary =
                  activeSchedules.length > 0
                    ? activeSchedules.map((row) => summarizeSchedule(row)).join(' | ')
                    : 'No schedule yet'

                const classEnrollments = enrollmentByClass.get(item.id) ?? []
                const activeEnrollments = classEnrollments.filter((row) => row.status === 'active')
                const classSessions = (sessionsByClass.get(item.id) ?? []).slice(0, 10)

                return (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                        <p className="mt-2 text-sm text-slate-600">
                          Teacher: {teacherById.get(item.teacher_id) || item.teacher_id}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Duration: {item.duration_minutes} min | Timezone: {item.timezone}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Active student count: {activeEnrollments.length}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${
                            item.is_active
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <form action={deleteRecurringClass}>
                          <input type="hidden" name="class_id" value={item.id} />
                          <input type="hidden" name="return_to" value="/admin/group-classes" />
                          <button
                            type="submit"
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                          >
                            Delete Class
                          </button>
                        </form>
                      </div>
                    </div>

                    {item.description && (
                      <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {item.description}
                      </p>
                    )}

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <h4 className="text-sm font-semibold text-slate-900">Schedule</h4>
                        <p className="mt-2 text-sm text-slate-700">{scheduleSummary}</p>
                        {activeSchedules.map((row) => (
                          <p key={row.id} className="mt-1 text-xs text-slate-600">
                            Effective: {formatRuleWindowDate(row.effective_from)}
                            {row.effective_to ? ' to ' + formatRuleWindowDate(row.effective_to) : ' onward'}
                          </p>
                        ))}
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <h4 className="text-sm font-semibold text-slate-900">Enrolled Students</h4>
                        <div className="mt-2 space-y-2">
                          {classEnrollments.length === 0 && (
                            <p className="text-sm text-slate-600">No enrolled students yet.</p>
                          )}
                          {classEnrollments.map((row) => (
                            <div
                              key={row.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            >
                              <span className="font-medium text-slate-900">
                                {studentById.get(row.student_id) || row.student_id}
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] ${statusBadgeClass(
                                    row.status
                                  )}`}
                                >
                                  {row.status}
                                </span>
                                <form action={unenrollStudent}>
                                  <input type="hidden" name="enrollment_id" value={row.id} />
                                  <input type="hidden" name="return_to" value="/admin/group-classes" />
                                  <button
                                    type="submit"
                                    className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700"
                                  >
                                    Remove
                                  </button>
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <h4 className="text-sm font-semibold text-slate-900">Upcoming Generated Sessions</h4>
                      <div className="mt-2 space-y-2">
                        {classSessions.length === 0 && (
                          <p className="text-sm text-slate-600">
                            No generated sessions yet. Use &quot;Generate Sessions (60 days)&quot;.
                          </p>
                        )}
                        {classSessions.map((session) => (
                          <div
                            key={session.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          >
                            <p className="font-medium text-slate-900">
                              {formatIsoCalendarDate(session.session_date, { dateStyle: 'medium' })} |{' '}
                              {session.start_time_local} - {session.end_time_local}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              Status: {session.status} | Participants:{' '}
                              {participantCountBySession.get(session.id) ?? 0}
                            </p>
                            <p className="mt-1 break-all text-xs text-slate-500">
                              Room: {session.meeting_room_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
