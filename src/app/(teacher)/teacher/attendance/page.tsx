import Link from 'next/link'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { brandUi } from '@/lib/ui/branding'

type TeacherAttendancePageRow = {
  template_id: string
  template_title: string
  template_description: string | null
  template_timezone: string
  schedule_summary: string
  enrolled_student_names: string[]
  active_student_count: number
  session_id: string | null
  session_date: string | null
  start_time_local: string | null
  end_time_local: string | null
  status: string | null
  meeting_room_name: string | null
  participant_count: number | null
}

type AttendanceClassCard = {
  templateId: string
  className: string
  scheduleSummary: string
  totalStudents: number
  sessionCount: number
  nextSessionLabel: string
  sortValue: number
}

function toSessionSortValue(sessionDate: string | null, startTimeLocal: string | null) {
  if (!sessionDate || !startTimeLocal) return Number.MAX_SAFE_INTEGER
  const normalized = `${sessionDate}${startTimeLocal}`.replace(/[^0-9]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
}

function formatNextSessionLabel(sessionDate: string | null, startTimeLocal: string | null, endTimeLocal: string | null) {
  if (!sessionDate || !startTimeLocal || !endTimeLocal) return 'No scheduled sessions yet'
  return `${formatIsoCalendarDate(sessionDate, { dateStyle: 'medium' })} | ${startTimeLocal} - ${endTimeLocal}`
}

export default async function TeacherAttendancePage() {
  const { supabase } = await requireApprovedTeacher()

  const { data, error } = await supabase.rpc('get_teacher_attendance_classes')
  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as TeacherAttendancePageRow[]
  const classes: AttendanceClassCard[] = Array.from(
    new Map(
      rows.map((row) => {
        const existing = rows
          .filter((candidate) => candidate.template_id === row.template_id)
          .sort(
            (a, b) =>
              toSessionSortValue(a.session_date, a.start_time_local) -
              toSessionSortValue(b.session_date, b.start_time_local)
          )
        const nextSession = existing[0]

        return [
          row.template_id,
          {
            templateId: row.template_id,
            className: row.template_title,
            scheduleSummary: row.schedule_summary.trim() || 'No schedule yet',
            totalStudents: row.active_student_count,
            sessionCount: existing.filter((item) => item.session_id !== null).length,
            nextSessionLabel: formatNextSessionLabel(
              nextSession?.session_date ?? null,
              nextSession?.start_time_local ?? null,
              nextSession?.end_time_local ?? null
            ),
            sortValue: toSessionSortValue(
              nextSession?.session_date ?? null,
              nextSession?.start_time_local ?? null
            ),
          } satisfies AttendanceClassCard,
        ]
      })
    ).values()
  ).sort((a, b) => a.sortValue - b.sortValue || a.className.localeCompare(b.className))

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <header className={brandUi.header}>
          <p className={brandUi.eyebrow}>Teacher Attendance</p>
          <h1 className={brandUi.title}>Group Class Attendance</h1>
          <p className={brandUi.subtitle}>
            Open a class to review first-join attendance across all generated group sessions.
          </p>
        </header>

        {classes.length === 0 ? (
          <section className={brandUi.section}>
            <p className="text-sm text-slate-600">No active group classes are available yet.</p>
          </section>
        ) : (
          <section className={brandUi.section}>
            <div className="space-y-3">
            {classes.map((item) => (
              <Link
                key={item.templateId}
                href={`/teacher/attendance/${item.templateId}`}
                className={`${brandUi.card} block transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-indigo-700">▦</span>
                      <h2 className="text-base font-semibold text-slate-900">{item.className}</h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">Next: {item.nextSessionLabel}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.totalStudents} student{item.totalStudents === 1 ? '' : 's'} | {item.sessionCount}{' '}
                      session{item.sessionCount === 1 ? '' : 's'}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500" title={item.scheduleSummary}>
                      {item.scheduleSummary}
                    </p>
                  </div>
                  <span className={`${brandUi.secondaryButton} shrink-0`}>
                    Open Attendance Sheet
                  </span>
                </div>
              </Link>
            ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
