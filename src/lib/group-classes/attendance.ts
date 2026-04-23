export const GROUP_ATTENDANCE_GRACE_MINUTES = 10

export type AttendanceCellState = 'present' | 'late' | 'absent' | 'upcoming' | 'cancelled'

export function deriveGroupAttendanceState({
  firstJoinedAt,
  scheduledStartAt,
  sessionStatus,
  now = new Date(),
  graceMinutes = GROUP_ATTENDANCE_GRACE_MINUTES,
}: {
  firstJoinedAt: string | null
  scheduledStartAt: string
  sessionStatus: string
  now?: Date
  graceMinutes?: number
}): AttendanceCellState {
  if (sessionStatus === 'cancelled') return 'cancelled'

  const scheduledStartMs = Date.parse(scheduledStartAt)
  if (!Number.isFinite(scheduledStartMs)) {
    return firstJoinedAt ? 'present' : 'absent'
  }

  if (!firstJoinedAt) {
    return scheduledStartMs > now.getTime() ? 'upcoming' : 'absent'
  }

  const firstJoinedMs = Date.parse(firstJoinedAt)
  if (!Number.isFinite(firstJoinedMs)) return 'absent'

  const lateCutoffMs = scheduledStartMs + graceMinutes * 60 * 1000
  return firstJoinedMs <= lateCutoffMs ? 'present' : 'late'
}

export function formatAttendanceJoinTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
