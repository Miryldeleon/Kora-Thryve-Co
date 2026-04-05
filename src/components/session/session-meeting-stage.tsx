'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import JitsiEmbed from '@/components/session/jitsi-embed'

type SessionMeetingStageProps = {
  bookingId: string
  isTeacher: boolean
  initialTeacherJoined: boolean
  jitsi: {
    domain: string
    appId?: string | null
    roomPrefix?: string | null
    authToken?: string | null
    roomName: string
    displayName: string
    meetingLabel?: string
    participantRole?: 'teacher' | 'student'
    className?: string
    compact?: boolean
  }
}

type AttendanceStatusResponse = {
  teacherHasJoined: boolean
  teacherJoinedAt: string | null
  teacherHasJoinedFalseReason?: string | null
}

const STUDENT_POLL_INTERVAL_MS = 5000
const ATTENDANCE_POST_MAX_ATTEMPTS = 3
const ATTENDANCE_POST_RETRY_DELAY_MS = 1000

export default function SessionMeetingStage({
  bookingId,
  isTeacher,
  initialTeacherJoined,
  jitsi,
}: SessionMeetingStageProps) {
  const [teacherHasJoined, setTeacherHasJoined] = useState(initialTeacherJoined)
  const [isCheckingStatus, setIsCheckingStatus] = useState(!isTeacher && !initialTeacherJoined)
  const [statusError, setStatusError] = useState<string | null>(null)

  const canEnterLiveMeeting = useMemo(() => isTeacher || teacherHasJoined, [isTeacher, teacherHasJoined])
  const isDevelopment = process.env.NODE_ENV !== 'production'

  const markJoined = useCallback(async () => {
    if (isDevelopment) {
      console.log('[session-meeting-stage] teacher conference joined callback fired', {
        bookingId,
        isTeacher,
      })
    }

    for (let attempt = 1; attempt <= ATTENDANCE_POST_MAX_ATTEMPTS; attempt += 1) {
      try {
        if (isDevelopment) {
          console.log('[session-meeting-stage] teacher attendance/session-start POST sent', {
            bookingId,
            attempt,
            maxAttempts: ATTENDANCE_POST_MAX_ATTEMPTS,
          })
        }

        const response = await fetch('/api/session-attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ bookingId }),
        })
        const payload = (await response.json().catch(() => null)) as { error?: string } | null

        if (!response.ok) {
          if (isDevelopment) {
            console.log('[session-meeting-stage] teacher attendance POST failure response', {
              bookingId,
              attempt,
              status: response.status,
              error: payload?.error ?? 'Unknown error',
            })
          }
          if (attempt === ATTENDANCE_POST_MAX_ATTEMPTS) {
            setStatusError(payload?.error || 'Unable to record session join activity.')
            return
          }
          await new Promise((resolve) => {
            window.setTimeout(resolve, ATTENDANCE_POST_RETRY_DELAY_MS * attempt)
          })
          continue
        }

        if (isDevelopment) {
          console.log('[session-meeting-stage] teacher attendance POST success response', {
            bookingId,
            attempt,
            status: response.status,
            payload,
          })
        }
        setStatusError(null)
        return
      } catch {
        if (isDevelopment) {
          console.log('[session-meeting-stage] teacher attendance POST threw', {
            bookingId,
            attempt,
          })
        }
        if (attempt === ATTENDANCE_POST_MAX_ATTEMPTS) {
          setStatusError('Unable to record session join activity.')
          return
        }
        await new Promise((resolve) => {
          window.setTimeout(resolve, ATTENDANCE_POST_RETRY_DELAY_MS * attempt)
        })
      }
    }
  }, [bookingId, isDevelopment, isTeacher])

  const loadTeacherPresence = useCallback(async () => {
    if (isTeacher || teacherHasJoined) return

    if (isDevelopment) {
      console.log('[session-meeting-stage] student gate fetch start', {
        bookingId,
        teacherHasJoined,
      })
    }
    setIsCheckingStatus(true)
    try {
      const response = await fetch(
        `/api/session-attendance?bookingId=${encodeURIComponent(bookingId)}&ts=${Date.now()}`,
        {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        }
      )

      if (!response.ok) {
        const rawBody = await response.text()
        const payload = JSON.parse(rawBody || '{}') as { error?: string }
        if (isDevelopment) {
          console.log('[session-meeting-stage] student gate fetch failure response', {
            bookingId,
            status: response.status,
            rawBody,
            error: payload.error ?? 'Unknown error',
          })
        }
        setStatusError(payload.error || 'Unable to check teacher availability right now.')
        return
      }

      const rawBody = await response.text()
      const payload = JSON.parse(rawBody || '{}') as AttendanceStatusResponse
      if (isDevelopment) {
        console.log('[session-meeting-stage] student gate fetch result', {
          bookingId,
          rawBody,
          teacherHasJoined: payload.teacherHasJoined,
          teacherJoinedAt: payload.teacherJoinedAt,
          teacherHasJoinedFalseReason: payload.teacherHasJoinedFalseReason ?? null,
        })
        if (payload.teacherJoinedAt && !payload.teacherHasJoined) {
          console.log('[session-meeting-stage] teacherHasJoined false while attendance exists', {
            bookingId,
            teacherJoinedAt: payload.teacherJoinedAt,
            teacherHasJoinedFalseReason: payload.teacherHasJoinedFalseReason ?? 'No reason provided',
          })
        }
      }
      setTeacherHasJoined(Boolean(payload.teacherHasJoined))
      setStatusError(null)
    } catch {
      if (isDevelopment) {
        console.log('[session-meeting-stage] student gate fetch threw', { bookingId })
      }
      setStatusError('Unable to check teacher availability right now.')
    } finally {
      setIsCheckingStatus(false)
    }
  }, [bookingId, isDevelopment, isTeacher, teacherHasJoined])

  useEffect(() => {
    if (!isDevelopment || isTeacher || teacherHasJoined) return
    console.log('[session-meeting-stage] student gate active', { bookingId, teacherHasJoined })
  }, [bookingId, isDevelopment, isTeacher, teacherHasJoined])

  useEffect(() => {
    if (!isDevelopment || !isTeacher) return
    console.log('[session-meeting-stage] teacher path rendering Jitsi iframe', {
      bookingId,
      canEnterLiveMeeting,
      teacherHasJoined,
    })
  }, [bookingId, canEnterLiveMeeting, isDevelopment, isTeacher, teacherHasJoined])

  useEffect(() => {
    if (isTeacher || teacherHasJoined) return

    void loadTeacherPresence()
    const timer = window.setInterval(() => {
      void loadTeacherPresence()
    }, STUDENT_POLL_INTERVAL_MS)
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void loadTeacherPresence()
      }
    }
    window.addEventListener('focus', onVisibilityOrFocus)
    document.addEventListener('visibilitychange', onVisibilityOrFocus)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onVisibilityOrFocus)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
    }
  }, [isTeacher, loadTeacherPresence, teacherHasJoined])

  if (!canEnterLiveMeeting) {
    return (
      <div className="flex min-h-[380px] flex-1 flex-col items-center justify-center rounded-2xl border border-slate-700 bg-[#131a24] px-5 text-center text-sm text-slate-300 lg:min-h-0">
        <p className="text-base font-medium text-slate-100">Waiting for your teacher to start the session</p>
        <p className="mt-2 max-w-md text-sm text-slate-300">
          Your live room unlocks as soon as the teacher joins. Keep this page open and you will enter
          automatically.
        </p>
        {isCheckingStatus && <p className="mt-3 text-xs text-slate-400">Checking session status...</p>}
        {statusError && <p className="mt-3 text-xs text-rose-300">{statusError}</p>}
        <button
          type="button"
          onClick={() => {
            void loadTeacherPresence()
          }}
          className="mt-4 inline-flex rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-slate-800"
        >
          Check again
        </button>
      </div>
    )
  }

  return <JitsiEmbed {...jitsi} onConferenceJoined={markJoined} />
}
