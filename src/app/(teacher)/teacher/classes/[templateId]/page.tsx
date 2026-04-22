import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { formatIsoCalendarDate } from '@/lib/group-classes/date'
import { brandUi } from '@/lib/ui/branding'

type TeacherClassDetailPageProps = {
  params: Promise<{
    templateId: string
  }>
}

type TeacherGroupClassRpcRow = {
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

type ClassSession = {
  id: string
  dateLabel: string
  timeLabel: string
  status: string
  roomName: string
  participantCount: number
  href: string
  sortValue: number
}

function classStatusBadgeClass(status: string) {
  if (status === 'scheduled' || status === 'confirmed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (status === 'completed') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function formatGroupDate(sessionDate: string) {
  return formatIsoCalendarDate(sessionDate, { dateStyle: 'medium' })
}

function formatGroupTime(startTimeLocal: string, endTimeLocal: string) {
  return `${startTimeLocal} - ${endTimeLocal}`
}

function toLocalSessionSortValue(sessionDate: string, startTimeLocal: string) {
  const normalized = `${sessionDate}${startTimeLocal}`.replace(/[^0-9]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
}

export default async function TeacherClassDetailPage({ params }: TeacherClassDetailPageProps) {
  const { supabase } = await requireApprovedTeacher()
  const { templateId } = await params

  const { data: groupClassData, error: groupClassError } = await supabase.rpc(
    'get_teacher_classes_page_group_sessions'
  )
  if (groupClassError) {
    throw new Error(groupClassError.message)
  }

  const classRows = ((groupClassData ?? []) as TeacherGroupClassRpcRow[]).filter(
    (row) => row.template_id === templateId
  )

  if (classRows.length === 0) {
    notFound()
  }

  const classInfo = classRows[0]
  const sessions: ClassSession[] = classRows
    .filter(
      (
        row
      ): row is TeacherGroupClassRpcRow & {
        session_id: string
        session_date: string
        start_time_local: string
        end_time_local: string
        status: string
        meeting_room_name: string
      } =>
        row.session_id !== null &&
        row.session_date !== null &&
        row.start_time_local !== null &&
        row.end_time_local !== null &&
        row.status !== null &&
        row.meeting_room_name !== null
    )
    .map((row) => ({
      id: row.session_id,
      dateLabel: formatGroupDate(row.session_date),
      timeLabel: formatGroupTime(row.start_time_local, row.end_time_local),
      status: row.status,
      roomName: row.meeting_room_name,
      participantCount: row.participant_count ?? 0,
      href: `/group-session/${row.session_id}`,
      sortValue: toLocalSessionSortValue(row.session_date, row.start_time_local),
    }))
    .sort((a, b) => a.sortValue - b.sortValue)

  const description = classInfo.template_description?.trim() || 'No class description yet.'
  const enrolledStudentNames = classInfo.enrolled_student_names ?? []

  return (
    <main className={brandUi.page}>
      <div className={brandUi.container}>
        <Link href="/teacher/classes" className={brandUi.secondaryButton}>
          Back to Classes
        </Link>

        <article className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="min-h-44 bg-[#9cae82] px-6 py-8 text-white">
            <p className="text-xs uppercase tracking-[0.22em] text-white/80">Kora Thryve Group Class</p>
            <h1 className="mt-10 max-w-3xl text-4xl font-semibold tracking-tight">{classInfo.template_title}</h1>
          </div>
          <div className="grid gap-4 p-6 lg:grid-cols-[1.4fr_0.9fr]">
            <section>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Description</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
            </section>
            <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Schedule</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{classInfo.schedule_summary}</p>
              <p className="mt-1 text-xs text-slate-600">Timezone: {classInfo.template_timezone}</p>
            </section>
          </div>
        </article>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
          <section className={brandUi.section}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={brandUi.sectionTitle}>Enrolled Students</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                {classInfo.active_student_count}
              </span>
            </div>
            {enrolledStudentNames.length === 0 ? (
              <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No enrolled students yet.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {enrolledStudentNames.map((studentName, index) => (
                  <span
                    key={`${studentName}-${index}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                  >
                    {studentName}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className={brandUi.section}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={brandUi.sectionTitle}>Upcoming Session Rooms</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                {sessions.length} upcoming
              </span>
            </div>

            {sessions.length === 0 ? (
              <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No generated sessions yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {sessions.map((session) => (
                  <article key={session.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {session.dateLabel} | {session.timeLabel}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">Participants: {session.participantCount}</p>
                        <p className="mt-1 break-all text-xs text-slate-500">Room: {session.roomName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] ${classStatusBadgeClass(
                            session.status
                          )}`}
                        >
                          {session.status}
                        </span>
                        <Link href={session.href} className={brandUi.secondaryButton}>
                          Open Session
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
