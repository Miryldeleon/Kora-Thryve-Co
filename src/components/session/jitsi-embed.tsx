'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type JitsiEmbedProps = {
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
  onConferenceJoined?: () => void
}

type SessionState = 'connecting' | 'waiting' | 'live' | 'issue' | 'ended'

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => {
      addListener: (event: string, handler: (...args: unknown[]) => void) => void
      dispose: () => void
      getNumberOfParticipants?: () => number
    }
  }
}

function normalizeRoomName(roomName: string) {
  return roomName
    .replace(/[^a-zA-Z0-9/_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160)
}

function normalizeDisplayName(displayName: string) {
  const clean = displayName.replace(/\s+/g, ' ').trim()
  if (!clean) return 'Kora Thryve Participant'
  return clean.slice(0, 60)
}

function statusUi(state: SessionState) {
  if (state === 'connecting') {
    return {
      label: 'Connecting',
      hint: 'Preparing your session room...',
      className: 'border-amber-700/60 bg-amber-900/40 text-amber-100',
    }
  }
  if (state === 'waiting') {
    return {
      label: 'Waiting for others',
      hint: 'You are in the room. Waiting for another participant.',
      className: 'border-slate-600 bg-slate-800 text-slate-100',
    }
  }
  if (state === 'live') {
    return {
      label: 'Live',
      hint: 'Session is active.',
      className: 'border-emerald-700/60 bg-emerald-900/40 text-emerald-100',
    }
  }
  if (state === 'issue') {
    return {
      label: 'Reconnecting / Issue detected',
      hint: 'There may be a camera, mic, or connection issue.',
      className: 'border-rose-700/60 bg-rose-900/40 text-rose-100',
    }
  }
  return {
    label: 'Call ended',
    hint: 'You left the conference.',
    className: 'border-slate-600 bg-slate-800 text-slate-100',
  }
}

export default function JitsiEmbed({
  domain,
  appId,
  roomPrefix,
  authToken,
  roomName,
  displayName,
  meetingLabel,
  participantRole,
  className,
  compact = false,
  onConferenceJoined,
}: JitsiEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const apiRef = useRef<{
    addListener: (event: string, handler: (...args: unknown[]) => void) => void
    dispose: () => void
    getNumberOfParticipants?: () => number
  } | null>(null)

  const [sessionState, setSessionState] = useState<SessionState>('connecting')
  const [issueText, setIssueText] = useState<string | null>(null)
  const [remoteParticipants, setRemoteParticipants] = useState(0)
  const [instanceKey, setInstanceKey] = useState(0)
  const hasReportedJoinRef = useRef(false)

  const safeDisplayName = useMemo(() => normalizeDisplayName(displayName), [displayName])
  const meetingDomain = useMemo(() => domain.trim(), [domain])
  const roomWithPrefix = useMemo(() => {
    const safeRoom = normalizeRoomName(roomName)
    if (!roomPrefix) return safeRoom
    return `${normalizeRoomName(roomPrefix)}-${safeRoom}`.slice(0, 160)
  }, [roomName, roomPrefix])
  const meetingPath = useMemo(() => {
    if (!appId) return roomWithPrefix
    return `${normalizeRoomName(appId)}/${roomWithPrefix}`
  }, [appId, roomWithPrefix])
  const openInNewTabUrl = useMemo(() => {
    const tokenQuery = authToken ? `?jwt=${encodeURIComponent(authToken)}` : ''
    return `https://${meetingDomain}/${meetingPath}${tokenQuery}`
  }, [authToken, meetingDomain, meetingPath])
  const isPublicMeetInstance = useMemo(() => meetingDomain === 'meet.jit.si', [meetingDomain])
  const status = statusUi(sessionState)
  const isDevelopment = process.env.NODE_ENV !== 'production'

  useEffect(() => {
    let cancelled = false
    let scriptEl: HTMLScriptElement | null = null
    let sizeObserver: ResizeObserver | null = null

    if (!meetingDomain || !containerRef.current) return
    if (isDevelopment) {
      console.log('[jitsi-embed] iframe mount requested', {
        meetingDomain,
        meetingPath,
        participantRole,
        hasJwt: Boolean(authToken),
      })
    }

    const cleanup = () => {
      apiRef.current?.dispose()
      apiRef.current = null
    }

    const init = () => {
      if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return

      const hasStableSize =
        containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0
      if (!hasStableSize) {
        if (!sizeObserver) {
          sizeObserver = new ResizeObserver(() => {
            if (!containerRef.current) return
            if (containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
              sizeObserver?.disconnect()
              sizeObserver = null
              init()
            }
          })
          sizeObserver.observe(containerRef.current)
        }
        return
      }

      cleanup()
      containerRef.current.innerHTML = ''
      setSessionState('connecting')
      setIssueText(null)
      setRemoteParticipants(0)
      hasReportedJoinRef.current = false

      const api = new window.JitsiMeetExternalAPI(meetingDomain, {
        roomName: meetingPath,
        parentNode: containerRef.current,
        userInfo: { displayName: safeDisplayName },
        configOverwrite: {
          prejoinPageEnabled: true,
        },
        jwt: authToken || undefined,
      })

      apiRef.current = api
      if (isDevelopment) {
        console.log('[jitsi-embed] api ready', {
          meetingDomain,
          meetingPath,
          participantRole,
        })
      }

      api.addListener('videoConferenceJoined', () => {
        const total = api.getNumberOfParticipants?.() ?? 1
        const remote = Math.max(0, total - 1)
        setRemoteParticipants(remote)
        setSessionState(remote > 0 ? 'live' : 'waiting')
        if (isDevelopment) {
          console.log('[jitsi-embed] videoConferenceJoined', {
            meetingDomain,
            meetingPath,
            participantRole,
          })
        }
        if (!hasReportedJoinRef.current) {
          hasReportedJoinRef.current = true
          onConferenceJoined?.()
        }
      })

      api.addListener('participantJoined', () => {
        setRemoteParticipants((current) => {
          const next = current + 1
          setSessionState('live')
          return next
        })
      })

      api.addListener('participantLeft', () => {
        setRemoteParticipants((current) => {
          const next = Math.max(0, current - 1)
          setSessionState(next > 0 ? 'live' : 'waiting')
          return next
        })
      })

      api.addListener('readyToClose', () => {
        if (isDevelopment) {
          console.log('[jitsi-embed] readyToClose', { meetingPath, participantRole })
        }
        setSessionState('ended')
      })

      api.addListener('videoConferenceLeft', () => {
        if (isDevelopment) {
          console.log('[jitsi-embed] videoConferenceLeft', { meetingPath, participantRole })
        }
        setSessionState('ended')
      })

      api.addListener('participantRoleChanged', (...args) => {
        if (isDevelopment) {
          const maybePayload = args[0] as { role?: string } | undefined
          console.log('[jitsi-embed] participantRoleChanged', {
            meetingPath,
            participantRole,
            jitsiRole: maybePayload?.role ?? 'unknown',
            raw: args,
          })
        }
      })

      api.addListener('conferenceCreatedTimestamp', (...args) => {
        if (isDevelopment) {
          console.log('[jitsi-embed] conferenceCreatedTimestamp', {
            meetingPath,
            participantRole,
            raw: args,
          })
        }
      })

      api.addListener('peerConnectionFailure', (...args) => {
        if (isDevelopment) {
          console.log('[jitsi-embed] peerConnectionFailure', {
            meetingPath,
            participantRole,
            raw: args,
          })
        }
      })

      api.addListener('authStatusChanged', (...args) => {
        if (isDevelopment) {
          console.log('[jitsi-embed] authStatusChanged', {
            meetingPath,
            participantRole,
            raw: args,
          })
        }
      })

      api.addListener('conferenceFailed', (...args) => {
        if (isDevelopment) {
          console.log('[jitsi-embed] conferenceFailed', {
            meetingPath,
            participantRole,
            raw: args,
          })
        }
      })

      api.addListener('suspendDetected', (...args) => {
        if (isDevelopment) {
          console.log('[jitsi-embed] suspendDetected', { meetingPath, participantRole, raw: args })
        }
      })

      api.addListener('cameraError', () => {
        if (isDevelopment) {
          console.log('[jitsi-embed] cameraError', { meetingPath, participantRole })
        }
        setSessionState('issue')
        setIssueText('Camera access issue detected. Check browser permissions.')
      })

      api.addListener('micError', () => {
        if (isDevelopment) {
          console.log('[jitsi-embed] micError', { meetingPath, participantRole })
        }
        setSessionState('issue')
        setIssueText('Microphone access issue detected. Check browser permissions.')
      })

      api.addListener('errorOccurred', (...args) => {
        const maybeError = args[0] as { message?: string } | undefined
        if (isDevelopment) {
          console.log('[jitsi-embed] errorOccurred', {
            meetingPath,
            participantRole,
            message: maybeError?.message ?? 'unknown',
            raw: args,
          })
        }
        setSessionState('issue')
        setIssueText(maybeError?.message || 'A session issue was detected.')
      })
    }

    if (window.JitsiMeetExternalAPI) {
      if (isDevelopment) {
        console.log('[jitsi-embed] external_api already present', {
          meetingDomain,
          participantRole,
        })
      }
      init()
    } else {
      scriptEl = document.createElement('script')
      scriptEl.src = `https://${meetingDomain}/external_api.js`
      scriptEl.async = true
      scriptEl.onload = () => {
        if (isDevelopment) {
          console.log('[jitsi-embed] external_api loaded', {
            meetingDomain,
            participantRole,
          })
        }
        init()
      }
      scriptEl.onerror = () => {
        if (!cancelled) {
          if (isDevelopment) {
            console.log('[jitsi-embed] external_api failed to load', {
              meetingDomain,
              participantRole,
            })
          }
          setSessionState('issue')
          setIssueText('Unable to load Jitsi session tools for this domain.')
        }
      }
      document.head.appendChild(scriptEl)
    }

    return () => {
      cancelled = true
      cleanup()
      sizeObserver?.disconnect()
      if (scriptEl?.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl)
      }
    }
  }, [
    authToken,
    instanceKey,
    isDevelopment,
    meetingDomain,
    meetingPath,
    onConferenceJoined,
    participantRole,
    safeDisplayName,
  ])

  if (!meetingDomain) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Live session is not configured. Set `NEXT_PUBLIC_JITSI_DOMAIN` to enable Jitsi.
      </div>
    )
  }

  return (
    <div
      className={[
        'rounded-2xl border border-slate-800 bg-[#0f1520]',
        compact ? 'flex min-h-[620px] flex-col' : 'mt-4',
        className ?? '',
      ].join(' ')}
    >
      <div className="border-b border-slate-800 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em] ${status.className}`}
            >
              {status.label}
            </span>
            {participantRole && (
              <span className="inline-flex rounded-full border border-slate-600 bg-slate-900/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-200">
                {participantRole}
              </span>
            )}
            {remoteParticipants > 0 && (
              <span className="text-xs text-slate-300">Participants: {remoteParticipants + 1}</span>
            )}
          </div>
          <a
            href={openInNewTabUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg border border-slate-600 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800/70"
          >
            Open in New Tab
          </a>
        </div>
        {(sessionState !== 'live' || issueText) && (
          <p className="mt-1.5 text-xs text-slate-400">{issueText || status.hint}</p>
        )}
        {meetingLabel && <p className="mt-1 text-xs text-slate-400">Session: {meetingLabel}</p>}
        {isPublicMeetInstance && sessionState !== 'live' && (
          <p className="mt-1 text-xs text-slate-400">
            Public Jitsi mode: teacher should join first so students can enter smoothly.
          </p>
        )}
        {sessionState === 'connecting' && (
          <p className="mt-1 text-xs text-slate-400">
            If prejoin is visible below, continue by clicking Join in the embedded room.
          </p>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-b-2xl bg-[#030712]">
        <div
          ref={containerRef}
          className={compact ? 'h-[60vh] min-h-[500px] max-h-[860px] w-full' : 'h-[520px] w-full'}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 px-3 py-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          {(sessionState === 'ended' || sessionState === 'issue') && (
            <button
              type="button"
              onClick={() => setInstanceKey((value) => value + 1)}
              className="inline-flex rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-slate-800"
            >
              Rejoin in page
            </button>
          )}
        </div>
      </div>

      {isDevelopment && (
        <div className="px-4 pb-3 text-[11px] text-slate-400">
          Domain: <span className="font-medium text-slate-500">{meetingDomain}</span> | Room:{' '}
          <span className="font-medium text-slate-500">{meetingPath}</span>
        </div>
      )}
    </div>
  )
}
