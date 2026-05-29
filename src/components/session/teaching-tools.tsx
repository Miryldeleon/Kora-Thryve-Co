'use client'

import { supabase } from '@/lib/supabase/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AnnotationPoint,
  AnnotationStroke,
  AnnotationTool,
  LessonState,
  TeachingAnnotations,
  TeachingStateSnapshot,
} from '@/lib/session/teaching-state'
import {
  EMPTY_TEACHING_ANNOTATIONS,
  dedupeAnnotationStrokes,
  dedupeTeachingAnnotations,
  isTeachingAnnotations,
} from '@/lib/session/teaching-state'
import ControlledPdfStage from './controlled-pdf-stage'

type ToolModule = {
  id: string
  folder_id: string | null
  title: string
  description: string | null
  teacher_name: string | null
  signedUrl: string | null
}

type ToolFolder = {
  id: string
  name: string
}

type TeachingToolsProps = {
  sessionId: string
  isTeacher: boolean
  currentUserId: string
  folders: ToolFolder[]
  modules: ToolModule[]
  stateApiPath?: string
  stateResourceParam?: string
  className?: string
}

type SnapshotPayload = TeachingStateSnapshot

type TeachingStateResponse = Partial<SnapshotPayload> & {
  error?: string
}

const TEACHING_STATE_FALLBACK_POLL_MS = 15000

const CHANNEL_EVENT = {
  REQUEST_SYNC: 'REQUEST_SYNC',
  STATE_SNAPSHOT: 'STATE_SNAPSHOT',
  LESSON_STATE: 'LESSON_STATE',
  ANNOTATIONS_STATE: 'ANNOTATIONS_STATE',
  ANNOTATION_DRAFT: 'ANNOTATION_DRAFT',
  WHITEBOARD_SNAPSHOT: 'WHITEBOARD_SNAPSHOT',
  WHITEBOARD_CLEAR: 'WHITEBOARD_CLEAR',
} as const

const ANNOTATION_COLORS = ['#1f2937', '#dc2626', '#2563eb', '#059669', '#ca8a04'] as const
const ANNOTATION_STROKE_SIZES = [3, 5, 7] as const

function clampPage(value: number) {
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
}

function clampZoom(value: number) {
  if (!Number.isFinite(value)) return 100
  return Math.min(200, Math.max(50, Math.floor(value)))
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function isDebugLoggingEnabled() {
  return process.env.NODE_ENV !== 'production'
}

export default function TeachingTools({
  sessionId,
  isTeacher,
  currentUserId,
  folders,
  modules,
  stateApiPath,
  stateResourceParam = 'sessionId',
  className,
}: TeachingToolsProps) {
  const [lessonState, setLessonState] = useState<LessonState>({
    surface: 'materials',
    moduleId: null,
    page: 1,
    zoom: 100,
    scrollTopRatio: 0,
    scrollLeftRatio: 0,
  })
  const [selectedModuleId, setSelectedModuleId] = useState<string>('')
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<TeachingAnnotations>(EMPTY_TEACHING_ANNOTATIONS)
  const [draftStroke, setDraftStroke] = useState<AnnotationStroke | null>(null)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('pen')
  const [annotationColor, setAnnotationColor] = useState<(typeof ANNOTATION_COLORS)[number]>(
    ANNOTATION_COLORS[0]
  )
  const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState<(typeof ANNOTATION_STROKE_SIZES)[number]>(
    ANNOTATION_STROKE_SIZES[0]
  )
  const [drawMode, setDrawMode] = useState<'draw' | 'erase'>('draw')
  const [lineWidth, setLineWidth] = useState(3)
  const [pageInput, setPageInput] = useState('1')
  const [totalPages, setTotalPages] = useState(1)
  const [teacherToolsOpen, setTeacherToolsOpen] = useState(false)
  const channelName = useMemo(() => `session-tools-${sessionId}`, [sessionId])
  const folderNameById = useMemo(() => {
    const map = new Map<string, string>()
    folders.forEach((folder) => map.set(folder.id, folder.name))
    return map
  }, [folders])
  const hasUngroupedModules = useMemo(
    () => modules.some((module) => !module.folder_id || !folderNameById.has(module.folder_id)),
    [folderNameById, modules]
  )
  const folderFilterOptions = useMemo(() => {
    const base = folders.map((folder) => ({ id: folder.id, name: folder.name }))
    if (hasUngroupedModules) {
      base.unshift({ id: '__ungrouped__', name: 'Ungrouped' })
    }
    return base
  }, [folders, hasUngroupedModules])
  const effectiveSelectedFolderId = useMemo(() => {
    const exists = folderFilterOptions.some((option) => option.id === selectedFolderId)
    if (exists) return selectedFolderId
    return folderFilterOptions[0]?.id || ''
  }, [folderFilterOptions, selectedFolderId])
  const selectableModules = useMemo(() => {
    if (!effectiveSelectedFolderId) return modules
    if (effectiveSelectedFolderId === '__ungrouped__') {
      return modules.filter((module) => !module.folder_id || !folderNameById.has(module.folder_id))
    }
    return modules.filter((module) => module.folder_id === effectiveSelectedFolderId)
  }, [effectiveSelectedFolderId, folderNameById, modules])
  const effectiveSelectedModuleId = useMemo(() => {
    const exists = selectableModules.some((module) => module.id === selectedModuleId)
    if (exists) return selectedModuleId
    return selectableModules[0]?.id || ''
  }, [selectableModules, selectedModuleId])

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lessonRef = useRef(lessonState)
  const whiteboardSnapshotRef = useRef<string | null>(whiteboardSnapshot)
  const annotationsRef = useRef<TeachingAnnotations>(annotations)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasWrapRef = useRef<HTMLDivElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const presentedModule = useMemo(
    () => modules.find((module) => module.id === lessonState.moduleId) ?? null,
    [lessonState.moduleId, modules]
  )
  const selectedModule = useMemo(
    () => selectableModules.find((module) => module.id === effectiveSelectedModuleId) ?? null,
    [effectiveSelectedModuleId, selectableModules]
  )
  const presentedFolderName =
    !presentedModule?.folder_id ? 'Ungrouped' : folderNameById.get(presentedModule.folder_id) ?? 'Ungrouped'
  const canAnnotateMaterials =
    isTeacher && lessonState.surface === 'materials' && Boolean(lessonState.moduleId && presentedModule)
  const currentPageAnnotations = useMemo(() => {
    if (!lessonState.moduleId) return []
    return dedupeAnnotationStrokes(annotations[lessonState.moduleId]?.[String(lessonState.page)] ?? [])
  }, [annotations, lessonState.moduleId, lessonState.page])

  const logDebug = useCallback(
    (message: string, details?: Record<string, unknown>) => {
      if (!isDebugLoggingEnabled()) return
      console.log(`[teaching-tools][${isTeacher ? 'teacher' : 'student'}] ${message}`, {
        sessionId,
        channelName,
        ...details,
      })
    },
    [channelName, isTeacher, sessionId]
  )

  useEffect(() => {
    if (isTeacher) return
    window.dispatchEvent(
      new CustomEvent('kora:teaching-surface-change', {
        detail: {
          sessionId,
          surface: lessonState.surface,
        },
      })
    )
  }, [isTeacher, lessonState.surface, sessionId])

  const broadcastEvent = useCallback(
    async (event: string, payload: Record<string, unknown>) => {
      if (!channelRef.current) return
      logDebug('broadcast send', { event, payload })
      await channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      })
    },
    [logDebug]
  )

  const normalizeLessonState = useCallback((nextLesson: LessonState): LessonState => {
    return {
      surface: nextLesson.surface === 'whiteboard' ? 'whiteboard' : 'materials',
      moduleId: nextLesson.moduleId,
      page: clampPage(nextLesson.page),
      zoom: clampZoom(nextLesson.zoom),
      scrollTopRatio: clampRatio(nextLesson.scrollTopRatio),
      scrollLeftRatio: clampRatio(nextLesson.scrollLeftRatio),
    }
  }, [])

  const normalizeAnnotations = useCallback((value: unknown): TeachingAnnotations => {
    if (!isTeachingAnnotations(value)) return EMPTY_TEACHING_ANNOTATIONS
    return dedupeTeachingAnnotations(value)
  }, [])

  const updateAnnotationsState = useCallback((nextAnnotations: TeachingAnnotations) => {
    const normalized = dedupeTeachingAnnotations(nextAnnotations)
    setAnnotations(normalized)
    annotationsRef.current = normalized
  }, [])

  const broadcastAnnotationsState = useCallback(
    (nextAnnotations: TeachingAnnotations) => {
      if (!isTeacher) return
      void broadcastEvent(CHANNEL_EVENT.ANNOTATIONS_STATE, { annotations: nextAnnotations })
    },
    [broadcastEvent, isTeacher]
  )

  const applyWhiteboardSnapshot = useCallback((dataUrl: string | null) => {
    setWhiteboardSnapshot(dataUrl)
    whiteboardSnapshotRef.current = dataUrl

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (!dataUrl) {
      return
    }

    const image = new Image()
    image.onload = () => {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    }
    image.src = dataUrl
  }, [])

  const applySnapshot = useCallback(
    (snapshot: SnapshotPayload) => {
      const normalized = normalizeLessonState(snapshot.lesson)
      setLessonState(normalized)
      setPageInput(String(normalized.page))
      lessonRef.current = normalized
      updateAnnotationsState(normalizeAnnotations(snapshot.annotations))
      setDraftStroke(null)
      applyWhiteboardSnapshot(snapshot.whiteboardSnapshot ?? null)
    },
    [applyWhiteboardSnapshot, normalizeAnnotations, normalizeLessonState, updateAnnotationsState]
  )

  const persistSnapshot = useCallback(
    async (snapshot: SnapshotPayload) => {
      if (!isTeacher || !stateApiPath) return

      logDebug('persist teaching state', {
        stateApiPath,
        stateResourceParam,
        snapshot,
      })

      const response = await fetch(stateApiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          [stateResourceParam]: sessionId,
          lesson: snapshot.lesson,
          whiteboardSnapshot: snapshot.whiteboardSnapshot,
          annotations: snapshot.annotations,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as TeachingStateResponse | null
        logDebug('persist teaching state failed', {
          status: response.status,
          payload,
        })
      }
    },
    [isTeacher, logDebug, sessionId, stateApiPath, stateResourceParam]
  )

  const syncCanvasSnapshot = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const snapshot = canvas.toDataURL('image/png')
    setWhiteboardSnapshot(snapshot)
    whiteboardSnapshotRef.current = snapshot
    if (isTeacher) {
      void broadcastEvent(CHANNEL_EVENT.WHITEBOARD_SNAPSHOT, { dataUrl: snapshot })
    }
  }, [broadcastEvent, isTeacher])

  const sendFullSnapshot = useCallback(async () => {
    if (!isTeacher) return
    const payload: SnapshotPayload = {
      lesson: lessonRef.current,
      whiteboardSnapshot: whiteboardSnapshotRef.current,
      annotations: annotationsRef.current,
    }
    await broadcastEvent(CHANNEL_EVENT.STATE_SNAPSHOT, payload)
    await persistSnapshot(payload)
  }, [broadcastEvent, isTeacher, persistSnapshot])

  const setLessonAndBroadcast = useCallback(
    (nextLesson: LessonState) => {
      const normalized = normalizeLessonState(nextLesson)
      setDraftStroke(null)
      setLessonState(normalized)
      setPageInput(String(normalized.page))
      lessonRef.current = normalized

      if (isTeacher) {
        void broadcastEvent(CHANNEL_EVENT.LESSON_STATE, normalized)
      }
    },
    [broadcastEvent, isTeacher, normalizeLessonState]
  )

  useEffect(() => {
    lessonRef.current = lessonState
  }, [lessonState])

  useEffect(() => {
    whiteboardSnapshotRef.current = whiteboardSnapshot
  }, [whiteboardSnapshot])

  useEffect(() => {
    annotationsRef.current = annotations
  }, [annotations])

  useEffect(() => {
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    })
    channelRef.current = channel
    logDebug('channel created', { subscriptionCount: 1 })

    channel.on('broadcast', { event: CHANNEL_EVENT.REQUEST_SYNC }, () => {
      logDebug('received request sync')
      void sendFullSnapshot()
    })

    channel.on('broadcast', { event: CHANNEL_EVENT.STATE_SNAPSHOT }, ({ payload }) => {
      if (isTeacher) return
      const next = payload as SnapshotPayload
      if (!next?.lesson) return
      logDebug('student received state snapshot', { payload: next })
      applySnapshot(next)
    })

    channel.on('broadcast', { event: CHANNEL_EVENT.LESSON_STATE }, ({ payload }) => {
      if (isTeacher) return
      const next = payload as LessonState
      if (!next) return
      logDebug('student received lesson state', { payload: next })
      const normalized = normalizeLessonState(next)
      setDraftStroke(null)
      setLessonState(normalized)
      setPageInput(String(normalized.page))
      lessonRef.current = normalized
    })

    channel.on('broadcast', { event: CHANNEL_EVENT.ANNOTATIONS_STATE }, ({ payload }) => {
      if (isTeacher) return
      const next = payload as { annotations?: unknown }
      const normalized = normalizeAnnotations(next?.annotations)
      const committedStrokeIds = new Set(
        Object.values(normalized).flatMap((pageMap) =>
          Object.values(pageMap).flatMap((strokes) => strokes.map((stroke) => stroke.id))
        )
      )
      logDebug('student received annotations state', {
        moduleCount: Object.keys(normalized).length,
      })
      updateAnnotationsState(normalized)
      setDraftStroke((current) => (current && committedStrokeIds.has(current.id) ? null : current))
    })

    channel.on('broadcast', { event: CHANNEL_EVENT.ANNOTATION_DRAFT }, ({ payload }) => {
      if (isTeacher) return
      const next = payload as { stroke?: unknown }
      setDraftStroke(next?.stroke && typeof next.stroke === 'object' ? (next.stroke as AnnotationStroke) : null)
    })

    channel.on('broadcast', { event: CHANNEL_EVENT.WHITEBOARD_SNAPSHOT }, ({ payload }) => {
      if (isTeacher) return
      const next = payload as { dataUrl?: string | null }
      logDebug('student received whiteboard snapshot', {
        hasDataUrl: Boolean(next?.dataUrl),
      })
      applyWhiteboardSnapshot(next?.dataUrl ?? null)
    })

    channel.on('broadcast', { event: CHANNEL_EVENT.WHITEBOARD_CLEAR }, () => {
      if (isTeacher) return
      logDebug('student received whiteboard clear')
      applyWhiteboardSnapshot(null)
    })

    channel.subscribe((status) => {
      logDebug('channel subscribe status', { status })
      if (status !== 'SUBSCRIBED') return
      if (isTeacher) {
        void sendFullSnapshot()
      } else {
        void broadcastEvent(CHANNEL_EVENT.REQUEST_SYNC, {})
      }
    })

    return () => {
      logDebug('channel removed')
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [
    applySnapshot,
    applyWhiteboardSnapshot,
    broadcastEvent,
    channelName,
    isTeacher,
    logDebug,
    normalizeLessonState,
    sendFullSnapshot,
    normalizeAnnotations,
    updateAnnotationsState,
  ])

  useEffect(() => {
    if (isTeacher || !stateApiPath) return

    let cancelled = false
    let intervalId: number | null = null

    const loadTeachingState = async () => {
      try {
        const response = await fetch(
          `${stateApiPath}?${new URLSearchParams({
            [stateResourceParam]: sessionId,
            ts: String(Date.now()),
          }).toString()}`,
          {
            method: 'GET',
            cache: 'no-store',
            credentials: 'include',
          }
        )
        const payload = (await response.json()) as TeachingStateResponse
        logDebug('initial hydrated teaching state', {
          stateApiPath,
          payload,
          ok: response.ok,
        })
        if (!response.ok || !payload.lesson || cancelled) return
        applySnapshot({
          lesson: payload.lesson,
          whiteboardSnapshot: payload.whiteboardSnapshot ?? null,
          annotations: normalizeAnnotations(payload.annotations),
        })
      } catch (error) {
        logDebug('teaching state hydration failed', {
          stateApiPath,
          error: error instanceof Error ? error.message : 'unknown error',
        })
        // Realtime remains the primary in-room transport; polling will try again.
      }
    }

    void loadTeachingState()
    intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadTeachingState()
      }
    }, TEACHING_STATE_FALLBACK_POLL_MS)

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadTeachingState()
      }
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      cancelled = true
      if (intervalId) window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [applySnapshot, isTeacher, logDebug, normalizeAnnotations, sessionId, stateApiPath, stateResourceParam])

  useEffect(() => {
    if (!isTeacher) return
    // Keep student views resilient if a realtime broadcast is missed during UI/layout transitions.
    void sendFullSnapshot()
  }, [
    isTeacher,
    sendFullSnapshot,
    lessonState.surface,
    lessonState.moduleId,
    lessonState.page,
    lessonState.zoom,
    lessonState.scrollTopRatio,
    lessonState.scrollLeftRatio,
    whiteboardSnapshot,
    annotations,
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = canvasWrapRef.current
    if (!canvas || !wrap) return

    const resizeCanvas = () => {
      const width = Math.max(520, Math.floor(wrap.clientWidth))
      const height = Math.max(420, Math.floor(wrap.clientHeight))
      const previousSnapshot = canvas.toDataURL('image/png')
      canvas.width = width
      canvas.height = height
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      applyWhiteboardSnapshot(whiteboardSnapshotRef.current || previousSnapshot)
    }

    resizeCanvas()
    const observer = new ResizeObserver(() => resizeCanvas())
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [applyWhiteboardSnapshot, lessonState.surface])

  const getPointerPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isTeacher) return
    const point = getPointerPoint(event)
    if (!point) return
    drawingRef.current = true
    lastPointRef.current = point
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isTeacher || !drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const point = getPointerPoint(event)
    const previous = lastPointRef.current
    if (!point || !previous) return

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = drawMode === 'erase' ? Math.max(10, lineWidth * 4) : lineWidth
    ctx.strokeStyle = drawMode === 'erase' ? '#ffffff' : '#1f2937'

    ctx.beginPath()
    ctx.moveTo(previous.x, previous.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()

    lastPointRef.current = point
  }

  const finishDrawing = () => {
    if (!isTeacher || !drawingRef.current) return
    drawingRef.current = false
    lastPointRef.current = null
    syncCanvasSnapshot()
  }

  const clearWhiteboard = () => {
    if (!isTeacher) return
    applyWhiteboardSnapshot(null)
    void broadcastEvent(CHANNEL_EVENT.WHITEBOARD_CLEAR, {})
  }

  const setAnnotationsAndBroadcast = useCallback(
    (nextAnnotations: TeachingAnnotations) => {
      updateAnnotationsState(nextAnnotations)
      setDraftStroke(null)
      broadcastAnnotationsState(nextAnnotations)
    },
    [broadcastAnnotationsState, updateAnnotationsState]
  )

  const updateModulePageAnnotations = useCallback(
    (
      moduleId: string,
      page: number,
      updater: (strokes: AnnotationStroke[]) => AnnotationStroke[]
    ) => {
      const pageKey = String(page)
      const moduleAnnotations = annotationsRef.current[moduleId] ?? {}
      const nextPageStrokes = dedupeAnnotationStrokes(updater(moduleAnnotations[pageKey] ?? []))
      const nextModuleAnnotations = { ...moduleAnnotations }

      if (nextPageStrokes.length > 0) {
        nextModuleAnnotations[pageKey] = nextPageStrokes
      } else {
        delete nextModuleAnnotations[pageKey]
      }

      const nextAnnotations = { ...annotationsRef.current }
      if (Object.keys(nextModuleAnnotations).length > 0) {
        nextAnnotations[moduleId] = nextModuleAnnotations
      } else {
        delete nextAnnotations[moduleId]
      }

      setAnnotationsAndBroadcast(nextAnnotations)
    },
    [setAnnotationsAndBroadcast]
  )

  useEffect(() => {
    if (!isDebugLoggingEnabled()) return
    const strokeIds = currentPageAnnotations.map((stroke) => stroke.id)
    const duplicateIds = strokeIds.filter((id, index) => strokeIds.indexOf(id) !== index)

    logDebug('annotation page stats', {
      moduleId: lessonState.moduleId,
      page: lessonState.page,
      committedStrokeCount: currentPageAnnotations.length,
      draftStrokeId: draftStroke?.id ?? null,
      duplicateIds,
    })
  }, [currentPageAnnotations, draftStroke?.id, lessonState.moduleId, lessonState.page, logDebug])

  const handleAnnotationDraftChange = useCallback(
    (stroke: AnnotationStroke | null) => {
      setDraftStroke(stroke)
      if (!isTeacher) return
      void broadcastEvent(CHANNEL_EVENT.ANNOTATION_DRAFT, { stroke })
    },
    [broadcastEvent, isTeacher]
  )

  const handleAnnotationCommit = useCallback(
    (stroke: AnnotationStroke) => {
      if (!isTeacher || !lessonRef.current.moduleId || stroke.points.length === 0) return
      updateModulePageAnnotations(lessonRef.current.moduleId, stroke.page, (strokes) => [...strokes, stroke])
    },
    [isTeacher, updateModulePageAnnotations]
  )

  const handleAnnotationErase = useCallback(
    (point: AnnotationPoint, radius: number) => {
      if (!isTeacher || !lessonRef.current.moduleId) return

      updateModulePageAnnotations(lessonRef.current.moduleId, lessonRef.current.page, (strokes) =>
        strokes.filter(
          (stroke) =>
            !stroke.points.some((strokePoint) => {
              const dx = strokePoint.x - point.x
              const dy = strokePoint.y - point.y
              return Math.sqrt(dx * dx + dy * dy) <= radius
            })
        )
      )
    },
    [isTeacher, updateModulePageAnnotations]
  )

  const clearCurrentPageAnnotations = useCallback(() => {
    if (!isTeacher || !lessonRef.current.moduleId) return
    updateModulePageAnnotations(lessonRef.current.moduleId, lessonRef.current.page, () => [])
  }, [isTeacher, updateModulePageAnnotations])

  const clearAllModuleAnnotations = useCallback(() => {
    if (!isTeacher || !lessonRef.current.moduleId) return
    const nextAnnotations = { ...annotationsRef.current }
    delete nextAnnotations[lessonRef.current.moduleId]
    setAnnotationsAndBroadcast(nextAnnotations)
  }, [isTeacher, setAnnotationsAndBroadcast])

  const openModule = () => {
    if (!isTeacher || !effectiveSelectedModuleId) return
    setTotalPages(1)
    const nextState = {
      surface: 'materials',
      moduleId: effectiveSelectedModuleId,
      page: 1,
      zoom: lessonRef.current.zoom,
      scrollTopRatio: 0,
      scrollLeftRatio: 0,
    } satisfies LessonState
    logDebug('teacher present payload', {
      selectedFolderId: effectiveSelectedFolderId,
      selectedModuleId: effectiveSelectedModuleId,
      nextState,
    })
    setLessonAndBroadcast(nextState)
  }

  const closeModule = () => {
    if (!isTeacher) return
    setTotalPages(1)
    setLessonAndBroadcast({
      surface: 'materials',
      moduleId: null,
      page: 1,
      zoom: lessonRef.current.zoom,
      scrollTopRatio: 0,
      scrollLeftRatio: 0,
    })
  }

  const goToPage = (page: number) => {
    if (!isTeacher || !lessonRef.current.moduleId) return
    setLessonAndBroadcast({
      surface: 'materials',
      moduleId: lessonRef.current.moduleId,
      page: Math.max(1, Math.min(page, Math.max(1, totalPages))),
      zoom: lessonRef.current.zoom,
      scrollTopRatio: 0,
      scrollLeftRatio: 0,
    })
  }

  const changeZoom = (nextZoom: number) => {
    if (!isTeacher || !lessonRef.current.moduleId) return
    setLessonAndBroadcast({
      surface: 'materials',
      moduleId: lessonRef.current.moduleId,
      page: lessonRef.current.page,
      zoom: nextZoom,
      scrollTopRatio: 0,
      scrollLeftRatio: 0,
    })
  }

  const setActiveSurface = (surface: 'materials' | 'whiteboard') => {
    if (!isTeacher) return
    setLessonAndBroadcast({
      surface,
      moduleId: lessonRef.current.moduleId,
      page: lessonRef.current.page,
      zoom: lessonRef.current.zoom,
      scrollTopRatio: lessonRef.current.scrollTopRatio,
      scrollLeftRatio: lessonRef.current.scrollLeftRatio,
    })
  }

  const handleTeacherMaterialScroll = ({
    scrollTopRatio,
    scrollLeftRatio,
  }: {
    scrollTopRatio: number
    scrollLeftRatio: number
  }) => {
    if (!isTeacher || !lessonRef.current.moduleId) return
    const next = {
      surface: 'materials' as const,
      moduleId: lessonRef.current.moduleId,
      page: lessonRef.current.page,
      zoom: lessonRef.current.zoom,
      scrollTopRatio,
      scrollLeftRatio,
    }

    const hasMeaningfulChange =
      Math.abs(next.scrollTopRatio - lessonRef.current.scrollTopRatio) > 0.01 ||
      Math.abs(next.scrollLeftRatio - lessonRef.current.scrollLeftRatio) > 0.01

    if (!hasMeaningfulChange) return
    setLessonAndBroadcast(next)
  }

  const wrapperClass =
    className ||
    'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'

  return (
    <section className={`${wrapperClass} flex min-h-0 flex-col`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5 sm:pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-100">
            Teaching Tools
          </h2>
          {!isTeacher && (
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
              Student View
            </span>
          )}
        </div>
        {isTeacher ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            <div className="flex gap-1.5 rounded-xl border border-slate-700 bg-slate-900/70 p-1">
              <button
                type="button"
                onClick={() => setActiveSurface('materials')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  lessonState.surface === 'materials'
                    ? 'bg-[#b8966b] text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Presentation
              </button>
              <button
                type="button"
                onClick={() => setActiveSurface('whiteboard')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  lessonState.surface === 'whiteboard'
                    ? 'bg-[#b8966b] text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Whiteboard
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTeacherToolsOpen((current) => !current)}
              className="rounded-xl border border-[#9f8562]/70 bg-[#b8966b] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#a9875d] sm:py-2"
            >
              Teaching Tools
            </button>
          </div>
        ) : (
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-300">
            Active: {lessonState.surface === 'materials' ? 'Lesson Materials' : 'Whiteboard'}
          </span>
        )}
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-hidden sm:mt-3">
        {lessonState.surface === 'materials' && (
          <div className="relative grid h-full min-h-0 overflow-hidden rounded-xl border border-slate-800 bg-[#080d14]">
            <div
              className="flex min-h-0 flex-col"
            >
              <div className="min-h-0 flex-1 p-1 sm:p-1.5 lg:p-2">
                {!presentedModule && (
                  <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-6 text-center text-sm text-slate-300 sm:min-h-[320px] lg:min-h-[460px]">
                    {isTeacher
                      ? 'Choose a module, then click Present in the tools rail.'
                      : 'Waiting for the teacher to present a lesson material.'}
                  </div>
                )}

                {presentedModule && (
                  <div className="relative flex h-full min-h-0 min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-[#080d14]">
                    <div className="pointer-events-none absolute left-2 right-2 top-2 z-10 flex items-start justify-between gap-2">
                      <div className="min-w-0 rounded-lg border border-slate-800/80 bg-slate-950/75 px-2.5 py-1.5 text-slate-100 shadow-lg shadow-black/20 backdrop-blur-sm">
                        <p className="truncate text-xs font-semibold sm:text-sm">
                          {presentedModule.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Page {lessonState.page}
                          {isTeacher ? ` | Zoom ${lessonState.zoom}%` : ' | Following teacher'}
                          {presentedFolderName ? ` | ${presentedFolderName}` : ''}
                        </p>
                      </div>
                      {!isTeacher && (
                        <span className="shrink-0 rounded-full border border-slate-700 bg-slate-950/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-300 backdrop-blur-sm">
                          Read-only
                        </span>
                      )}
                    </div>
                    <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                      <ControlledPdfStage
                        fileUrl={presentedModule.signedUrl}
                        page={lessonState.page}
                        zoom={lessonState.zoom}
                        isTeacher={isTeacher}
                        scrollTopRatio={lessonState.scrollTopRatio}
                        scrollLeftRatio={lessonState.scrollLeftRatio}
                        onTotalPagesChange={setTotalPages}
                        onScrollRatioChange={handleTeacherMaterialScroll}
                        annotations={currentPageAnnotations}
                        draftStroke={draftStroke?.page === lessonState.page ? draftStroke : null}
                        annotationMode={annotationMode}
                        annotationTool={annotationTool}
                        annotationColor={annotationColor}
                        annotationStrokeWidth={annotationStrokeWidth}
                        onDraftStrokeChange={handleAnnotationDraftChange}
                        onStrokeCommit={handleAnnotationCommit}
                        onEraseAtPoint={handleAnnotationErase}
                        currentUserId={currentUserId}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isTeacher && teacherToolsOpen && (
              <aside className="absolute inset-y-0 right-0 z-20 min-h-0 w-full max-w-[330px] overflow-y-auto border-l border-slate-800 bg-[#0b1119] p-2.5 shadow-2xl shadow-black/50">
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#c7a87f]">
                      Presentation Tools
                    </p>
                    <button
                      type="button"
                      onClick={() => setTeacherToolsOpen(false)}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-2 space-y-2.5">
                    <label className="block text-[11px] text-slate-400">Folder</label>
                    <select
                      value={effectiveSelectedFolderId}
                      onChange={(event) => {
                        setSelectedFolderId(event.target.value)
                        setSelectedModuleId('')
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                    >
                      {folderFilterOptions.length === 0 && <option value="">No folders available</option>}
                      {folderFilterOptions.map((folderOption) => (
                        <option key={folderOption.id} value={folderOption.id}>
                          {folderOption.name}
                        </option>
                      ))}
                    </select>
                    <label className="block text-[11px] text-slate-400">Selected module</label>
                    <select
                      value={effectiveSelectedModuleId}
                      onChange={(event) => setSelectedModuleId(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                    >
                      {selectableModules.length === 0 && <option value="">No modules in this folder</option>}
                      {selectableModules.map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={openModule}
                      disabled={!selectedModule}
                      className="w-full rounded-lg border border-[#9f8562] bg-[#b8966b] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Present
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => goToPage(lessonState.page - 1)}
                        disabled={!presentedModule}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => goToPage(lessonState.page + 1)}
                        disabled={!presentedModule}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="number"
                        min={1}
                        value={pageInput}
                        onChange={(event) => setPageInput(event.target.value)}
                        disabled={!presentedModule}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => goToPage(Number(pageInput))}
                        disabled={!presentedModule}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 disabled:opacity-50"
                      >
                        Jump
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Page {lessonState.page} of {Math.max(1, totalPages)}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => changeZoom(100)}
                        disabled={!presentedModule}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 disabled:opacity-50"
                      >
                        Fit
                      </button>
                      <button
                        type="button"
                        onClick={() => changeZoom(lessonState.zoom - 10)}
                        disabled={!presentedModule}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 disabled:opacity-50"
                      >
                        - Zoom
                      </button>
                      <button
                        type="button"
                        onClick={() => changeZoom(lessonState.zoom + 10)}
                        disabled={!presentedModule}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 disabled:opacity-50"
                      >
                        + Zoom
                      </button>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300">
                          Annotations
                        </p>
                        <button
                          type="button"
                          onClick={() => setAnnotationMode((current) => !current)}
                          disabled={!canAnnotateMaterials}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                            annotationMode && canAnnotateMaterials
                              ? 'bg-[#b8966b] text-white'
                              : 'border border-slate-700 bg-slate-900 text-slate-200 disabled:opacity-50'
                          }`}
                        >
                          {annotationMode ? 'Annotate On' : 'Annotate Off'}
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(['pen', 'highlighter', 'eraser'] as const).map((tool) => (
                          <button
                            key={tool}
                            type="button"
                            onClick={() => setAnnotationTool(tool)}
                            disabled={!canAnnotateMaterials}
                            className={`rounded-lg px-2 py-2 text-[11px] font-medium capitalize transition ${
                              annotationTool === tool
                                ? 'bg-slate-200 text-slate-950'
                                : 'border border-slate-700 bg-slate-900 text-slate-200 disabled:opacity-50'
                            }`}
                          >
                            {tool}
                          </button>
                        ))}
                      </div>
                      <label className="mt-2 block text-[11px] text-slate-400">Color</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {ANNOTATION_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setAnnotationColor(color)}
                            disabled={!canAnnotateMaterials || annotationTool === 'eraser'}
                            aria-label={`Select annotation color ${color}`}
                            className={`h-7 w-7 rounded-full border-2 transition ${
                              annotationColor === color ? 'border-white' : 'border-slate-700'
                            } disabled:opacity-40`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <label className="mt-2 block text-[11px] text-slate-400">Stroke size</label>
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        {ANNOTATION_STROKE_SIZES.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setAnnotationStrokeWidth(size)}
                            disabled={!canAnnotateMaterials}
                            className={`rounded-lg px-2 py-2 text-[11px] font-medium transition ${
                              annotationStrokeWidth === size
                                ? 'bg-slate-200 text-slate-950'
                                : 'border border-slate-700 bg-slate-900 text-slate-200 disabled:opacity-50'
                            }`}
                          >
                            {size}px
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          onClick={clearCurrentPageAnnotations}
                          disabled={!canAnnotateMaterials || currentPageAnnotations.length === 0}
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-medium text-slate-200 disabled:opacity-50"
                        >
                          Clear This Page
                        </button>
                        <button
                          type="button"
                          onClick={clearAllModuleAnnotations}
                          disabled={!canAnnotateMaterials || !(lessonState.moduleId && annotations[lessonState.moduleId])}
                          className="rounded-lg border border-rose-700/60 bg-rose-900/20 px-3 py-2 text-[11px] font-medium text-rose-200 disabled:opacity-50"
                        >
                          Clear All Pages
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeModule}
                      disabled={!presentedModule}
                      className="w-full rounded-lg border border-rose-700/60 bg-rose-900/30 px-3 py-2 text-xs font-medium text-rose-200 disabled:opacity-50"
                    >
                      Close
                    </button>
                  </div>
                </>
              </aside>
            )}
          </div>
        )}

        {lessonState.surface === 'whiteboard' && (
          <div className="relative grid h-full min-h-0 overflow-hidden rounded-xl border border-slate-800 bg-[#0f1621]">
            <div
              className="flex min-h-[240px] flex-col border-b border-slate-800 p-2.5 sm:min-h-[420px] lg:min-h-[660px] xl:min-h-0 xl:border-b-0"
            >
              {!isTeacher && (
                <div className="mb-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300">
                  Read-only whiteboard sync
                </div>
              )}
              <div
                ref={canvasWrapRef}
                className="min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_58px_-36px_rgba(15,23,42,0.62)]"
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishDrawing}
                  onPointerLeave={finishDrawing}
                  className={`block ${isTeacher ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
                />
              </div>
            </div>

            {isTeacher && teacherToolsOpen && (
              <aside className="absolute inset-y-0 right-0 z-20 min-h-0 w-full max-w-[300px] overflow-y-auto border-l border-slate-800 bg-[#0b1119] p-2.5 shadow-2xl shadow-black/50">
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#c7a87f]">
                      Whiteboard Tools
                    </p>
                    <button
                      type="button"
                      onClick={() => setTeacherToolsOpen(false)}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200"
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => setDrawMode('draw')}
                      className={`w-full rounded-lg border px-3 py-2 text-xs font-medium ${
                        drawMode === 'draw'
                          ? 'border-[#9f8562] bg-[#b8966b] text-white'
                          : 'border-slate-700 bg-slate-900 text-slate-200'
                      }`}
                    >
                      Draw
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawMode('erase')}
                      className={`w-full rounded-lg border px-3 py-2 text-xs font-medium ${
                        drawMode === 'erase'
                          ? 'border-[#9f8562] bg-[#b8966b] text-white'
                          : 'border-slate-700 bg-slate-900 text-slate-200'
                      }`}
                    >
                      Erase
                    </button>
                    <label className="block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200">
                      Brush Size
                      <input
                        type="range"
                        min={2}
                        max={12}
                        value={lineWidth}
                        onChange={(event) => setLineWidth(Number(event.target.value))}
                        className="mt-2 w-full"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={clearWhiteboard}
                      className="w-full rounded-lg border border-rose-700/60 bg-rose-900/30 px-3 py-2 text-xs font-medium text-rose-200"
                    >
                      Clear Board
                    </button>
                  </div>
                </>
              </aside>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
