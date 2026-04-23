import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  deriveGroupAttendanceState,
  formatAttendanceJoinTime,
  GROUP_ATTENDANCE_GRACE_MINUTES,
  type AttendanceCellState,
} from '@/lib/group-classes/attendance'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { brandUi } from '@/lib/ui/branding'

type TeacherClassInfoRow = {
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

type AttendanceSheetRow = {
  template_id: string
  template_title: string
  template_description: string | null
  template_timezone: string
  teacher_id: string
  teacher_name: string
  schedule_summary: string
  session_id: string
  session_date: string
  start_time_local: string
  end_time_local: string
  session_status: string
  scheduled_start_at: string
  participant_user_id: string
  participant_role: 'teacher' | 'student'
  participant_name: string
  first_joined_at: string | null
}

type MatrixSession = {
  id: string
  dateLabel: string
  timeLabel: string
  status: string
  scheduledStartAt: string
  sortValue: number
}

type MatrixParticipant = {
  userId: string
  role: 'teacher' | 'student'
  name: string
}

type CellData = {
  state: AttendanceCellState
  firstJoinedAt: string | null
}

function sessionSortValue(sessionDate: string, startTimeLocal: string) {
  const normalized = `${sessionDate}${startTimeLocal}`.replace(/[^0-9]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
}

function cellDisplay(cell: CellData) {
  if (cell.state === 'present') {
    return {
      icon: '✓',
      label: 'Present',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }
  if (cell.state === 'late') {
    return {
      icon: '◷',
      label: 'Late',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }
  if (cell.state === 'absent') {
    return {
      icon: '✕',
      label: 'Absent',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    }
  }
  if (cell.state === 'cancelled') {
    return {
      icon: '—',
      label: 'Cancelled',
      className: 'border-slate-200 bg-slate-100 text-slate-500',
    }
  }
  return {
    icon: '…',
    label: 'Upcoming',
    className: 'border-slate-200 bg-slate-50 text-slate-500',
  }
}

export default async function TeacherAttendanceDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>
}) {
  const { supabase } = await requireApprovedTeacher()
  const { templateId } = await params

  const { data: classData, error: classError } = await supabase.rpc(
    'get_teacher_group_class_details',
    { target_template_id: templateId }
  )
  if (classError) {
    throw new Error(classError.message)
  }

  const classRows = (classData ?? []) as TeacherClassInfoRow[]

  if (classRows.length === 0) {
    notFound()
  }

  const classInfo = classRows[0]
  const { data: sheetData, error: sheetError } = await supabase.rpc(
    'get_teacher_group_class_attendance_sheet',
    { target_template_id: templateId }
  )

  if (sheetError) {
    throw new Error(sheetError.message)
  }

  const rows = (sheetData ?? []) as AttendanceSheetRow[]

  const sessions: MatrixSession[] = Array.from(
    new Map(
      rows.map((row) => [
        row.session_id,
        {
          id: row.session_id,
          dateLabel: formatIsoCalendarDate(row.session_date, { dateStyle: 'medium' }),
          timeLabel: `${row.start_time_local} - ${row.end_time_local}`,
          status: row.session_status,
          scheduledStartAt: row.scheduled_start_at,
          sortValue: sessionSortValue(row.session_date, row.start_time_local),
        } satisfies MatrixSession,
      ])
    ).values()
  ).sort((a, b) => a.sortValue - b.sortValue)

  const participants: MatrixParticipant[] = Array.from(
    new Map(
      rows.map((row) => [
        `${row.participant_role}:${row.participant_user_id}`,
        {
          userId: row.participant_user_id,
          role: row.participant_role,
          name: row.participant_name,
        } satisfies MatrixParticipant,
      ])
    ).values()
  ).sort((a, b) => {
    if (a.role !== b.role) return a.role === 'teacher' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const cells = new Map<string, CellData>()
  for (const row of rows) {
    cells.set(`${row.participant_user_id}:${row.session_id}`, {
      state: deriveGroupAttendanceState({
        firstJoinedAt: row.first_joined_at,
        scheduledStartAt: row.scheduled_start_at,
        sessionStatus: row.session_status,
      }),
      firstJoinedAt: row.first_joined_at,
    })
  }

  const description = classInfo.template_description?.trim() || 'No class description yet.'

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <Link href="/teacher/attendance" className={brandUi.secondaryButton}>
          Back to Attendance
        </Link>

        <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-h-40 bg-[#9cae82] px-6 py-8 text-white">
            <p className="text-xs uppercase tracking-[0.22em] text-white/80">Teacher Attendance Sheet</p>
            <h1 className="mt-8 max-w-3xl text-4xl font-semibold tracking-tight">{classInfo.template_title}</h1>
          </div>
          <div className="grid gap-4 p-6 lg:grid-cols-[1.3fr_0.9fr]">
            <section>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Description</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
            </section>
            <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Summary</p>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <p>Teacher: {rows[0]?.teacher_name ?? 'Teacher'}</p>
                <p>Schedule: {classInfo.schedule_summary}</p>
                <p>Students: {classInfo.active_student_count}</p>
                <p>Grace period: {GROUP_ATTENDANCE_GRACE_MINUTES} minutes</p>
              </div>
            </section>
          </div>
        </article>

        <section className={`${brandUi.section} mt-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={brandUi.sectionTitle}>Legend</h2>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                cellDisplay({ state: 'present', firstJoinedAt: null }),
                cellDisplay({ state: 'late', firstJoinedAt: null }),
                cellDisplay({ state: 'absent', firstJoinedAt: null }),
                cellDisplay({ state: 'upcoming', firstJoinedAt: null }),
              ].map((item) => (
                <span
                  key={item.label}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${item.className}`}
                >
                  <span className="text-sm font-semibold">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className={`${brandUi.section} mt-6 overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 min-w-[220px] border-b border-r border-slate-200 bg-white px-4 py-3 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                    Participant
                  </th>
                  {sessions.map((session) => (
                    <th
                      key={session.id}
                      className="min-w-[150px] border-b border-slate-200 bg-white px-3 py-3 text-left align-top"
                    >
                      <p className="text-sm font-semibold text-slate-900">{session.dateLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">{session.timeLabel}</p>
                      <p className="mt-1.5 text-[11px] uppercase tracking-[0.1em] text-slate-400">
                        {session.status}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.map((participant) => (
                  <tr key={`${participant.role}:${participant.userId}`}>
                    <th
                      className={`sticky left-0 z-10 border-b border-r border-slate-200 px-4 py-3.5 text-left ${
                        participant.role === 'teacher' ? 'bg-[#faf6ef]' : 'bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{participant.name}</p>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] ${
                              participant.role === 'teacher'
                                ? 'border-[#d9ccb9] bg-white text-[#8b7758]'
                                : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}
                          >
                            {participant.role}
                          </span>
                        </div>
                      </div>
                    </th>
                    {sessions.map((session) => {
                      const cell = cells.get(`${participant.userId}:${session.id}`) ?? {
                        state: deriveGroupAttendanceState({
                          firstJoinedAt: null,
                          scheduledStartAt: session.scheduledStartAt,
                          sessionStatus: session.status,
                        }),
                        firstJoinedAt: null,
                      }
                      const ui = cellDisplay(cell)

                      return (
                        <td
                          key={`${participant.userId}:${session.id}`}
                          className="border-b border-slate-200 px-3 py-3.5 align-top"
                        >
                          <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${ui.className}`}>
                            <span className="text-sm font-semibold">{ui.icon}</span>
                            <span className="text-[11px] font-medium uppercase tracking-[0.08em]">
                              {ui.label}
                            </span>
                          </div>
                          {cell.firstJoinedAt && (
                            <p className="mt-1.5 text-xs text-slate-500">
                              {formatAttendanceJoinTime(cell.firstJoinedAt)}
                            </p>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sessions.length === 0 && (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No generated sessions yet for this class.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
