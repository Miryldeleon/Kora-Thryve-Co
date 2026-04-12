'use client'

import { supabase } from '@/lib/supabase/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

type LessonState = {
  surface: 'materials' | 'whiteboard'
  moduleId: string | null
  page: number
  zoom: number
  scrollTopRatio: number
  scrollLeftRatio: number
}

type TeachingToolsProps = {
  bookingId: string
  isTeacher: boolean
  folders: ToolFolder[]
  modules: ToolModule[]
  className?: string
}

type SnapshotPayload = {
  lesson: LessonState
  whiteboardSnapshot: string | null
}

const CHANNEL_EVENT = {
  REQUEST_SYNC: 'REQUEST_SYNC',
  STATE_SNAPSHOT: 'STATE_SNAPSHOT',
  LESSON_STATE: 'LESSON_STATE',
  WHITEBOARD_SNAPSHOT: 'WHITEBOARD_SNAPSHOT',
  WHITEBOARD_CLEAR: 'WHITEBOARD_CLEAR',
} as const

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

export default function TeachingTools({
  bookingId,
  isTeacher,
  folders,
  modules,
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
  const [drawMode, setDrawMode] = useState<'draw' | 'erase'>('draw')
  const [lineWidth, setLineWidth] = useState(3)
  const [pageInput, setPageInput] = useState('1')
  const [totalPages, setTotalPages] = useState(1)
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

  const broadcastEvent = useCallback(
    async (event: string, payload: Record<string, unknown>) => {
      if (!channelRef.current) return
      await channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      })
    },
    []
  )

  const applyWhiteboardSnapshot = useCallback((dataUrl: string | null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (!dataUrl) {
      setWhiteboardSnapshot(null)
      whiteboardSnapshotRef.current = null
      return
    }

    const image = new Image()
    image.onload = () => {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      setWhiteboardSnapshot(dataUrl)
      whiteboardSnapshotRef.current = dataUrl
    }
    image.src = dataUrl
  }, [])

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
    }
    await broadcastEvent(CHANNEL_EVENT.STATE_SNAPSHOT, payload)
  }, [broadcastEvent, isTeacher])

  const setLessonAndBroadcast = useCallback(
    (nextLesson: LessonState) => {
      const normalized: LessonState = {
        surface: nextLesson.surface === 'whiteboard' ? 'whiteboard' : 'materials',
        moduleId: nextLesson.moduleId,
        page: clampPage(nextLesson.page),
        zoom: clampZoom(nextLesson.zoom),
        scrollTopRatio: clampRatio(nextLesson.scrollTopRatio),
        scrollLeftRatio: clampRatio(nextLesson.scrollLeftRatio),
      }
      setLessonState(normalized)
      setPageInput(String(normalized.page))
      lessonRef.current = normalized

      if (isTeacher) {
        void broadcastEvent(CHANNEL_EVENT.LESSON_STATE, normalized)
      }
    },
    [broadcastEvent, isTeacher]
  )

  useEffect(() => {
    lessonRef.current = lessonState
  }, [lessonState])

  useEffect(() => {
    whiteboardSnapshotRef.current = whiteboardSnapshot
  }, [whiteboardSnapshot])

  useEffect(() => {
    const channel = supabase.channel(`session-tools-${bookingId}`, {
      config: { broadcast: { self: true } },
    })
    channelRef.current = channel

    channel.on('broadcast', { event: CHANNEL_EVENT.REQUEST_SYNC }, () => {
      void sendFullSnapshot()
    })

    channel.on('broadcast', { event: CHANNEL_EVENT.STATE_SNAPSHOT }, ({ payload }) => {
      if (isTeacher) return
      const next = payload as SnapshotPayload
      if (!next?.lesson) return
      const normalized: LessonState = {
        surface: next.lesson.surface === 'whiteboard' ? 'whiteboard' : 'materials',
        moduleId: next.lesson.moduleId,
        page: clampPage(next.lesson.page),
        zoom: clampZoom(next.lesson.zoom),
        scrollTopRatio: clampRatio(next.lesson.scrollTopRatio),
        scrollLeftRatio: clampRatio(next.lesson.scrollLeftRatio),
      }
      setLessonState(normalized)
      setPageInput(String(normalized.page))
      lessonRef.current = normalized
      applyWhiteboardSnapshot(next.whiteboardSnapshot ?? null)
    })

    channel.on('broadcast', { event: CHANNEL_EVENT.LESSON_STATE }, ({ payload }) => {
      if (isTeacher) return
      const next = payload as LessonState
      if (!next) return
      const normalized: LessonState = {
        surface: next.surface === 'whiteboard' ? 'whiteboard' : 'materials',
        moduleId: next.moduleId,
        page: clampPage(next.page),
        zoom: clampZoom(next.zoom),
        scrollTopRatio: clampRatio(next.scrollTopRatio),
        scrollLeftRatio: clampRatio(next.scrollLeftRatio),
      }
      setLessonState(normalized)
      setPageInput(String(normalized.page))
      lessonRef.current = normalized
    })

    channel.on('broadcast', { event: CHANNEL_EVENT.WHITEBOARD_SNAPSHOT }, ({ payload }) => {
      if (isTeacher) return
      const next = payload as { dataUrl?: string | null }
      applyWhiteboardSnapshot(next?.dataUrl ?? null)
    })

    channel.on('broadcast', { event: CHANNEL_EVENT.WHITEBOARD_CLEAR }, () => {
      if (isTeacher) return
      applyWhiteboardSnapshot(null)
    })

    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      if (isTeacher) {
        void sendFullSnapshot()
      } else {
        void broadcastEvent(CHANNEL_EVENT.REQUEST_SYNC, {})
      }
    })

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [applyWhiteboardSnapshot, bookingId, broadcastEvent, isTeacher, sendFullSnapshot])

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

  const openModule = () => {
    if (!isTeacher || !effectiveSelectedModuleId) return
    setTotalPages(1)
    setLessonAndBroadcast({
      surface: 'materials',
      moduleId: effectiveSelectedModuleId,
      page: 1,
      zoom: lessonRef.current.zoom,
      scrollTopRatio: 0,
      scrollLeftRatio: 0,
    })
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
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
              Lesson Materials
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
        ) : (
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-300">
            Active: {lessonState.surface === 'materials' ? 'Lesson Materials' : 'Whiteboard'}
          </span>
        )}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        {lessonState.surface === 'materials' && (
          <div
            className={`grid h-full min-h-0 overflow-hidden rounded-xl border border-slate-800 bg-[#0f1621] ${
              isTeacher ? 'xl:grid-cols-[minmax(0,1fr)_228px]' : 'grid-cols-1'
            }`}
          >
            <div
              className={`flex min-h-0 flex-col border-b border-slate-800 ${
                isTeacher ? 'xl:border-b-0 xl:border-r xl:border-slate-800' : ''
              }`}
            >
              <div className="min-h-0 flex-1 p-2.5 lg:p-3">
                {!presentedModule && (
                  <div className="flex h-full min-h-[500px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center text-sm text-slate-600">
                    {isTeacher
                      ? 'Choose a module, then click Present in the tools rail.'
                      : 'Waiting for the teacher to present a lesson material.'}
                  </div>
                )}

                {presentedModule && (
                  <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_22px_58px_-36px_rgba(15,23,42,0.62)]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{presentedModule.title}</p>
                        <p className="text-xs text-slate-500">
                          Page {lessonState.page}
                          {isTeacher ? ` | Zoom ${lessonState.zoom}%` : ' | Synced view'}
                        </p>
                        <p className="text-xs text-slate-500">Folder: {presentedFolderName}</p>
                      </div>
                      {!isTeacher && (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-600">
                          Read-only
                        </span>
                      )}
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <ControlledPdfStage
                        fileUrl={presentedModule.signedUrl}
                        page={lessonState.page}
                        zoom={lessonState.zoom}
                        isTeacher={isTeacher}
                        scrollTopRatio={lessonState.scrollTopRatio}
                        scrollLeftRatio={lessonState.scrollLeftRatio}
                        onTotalPagesChange={setTotalPages}
                        onScrollRatioChange={handleTeacherMaterialScroll}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isTeacher && (
              <aside className="min-h-0 overflow-y-auto bg-[#0b1119] p-2.5">
                <>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#c7a87f]">
                    Tools
                  </p>
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
                    <div className="grid grid-cols-2 gap-2">
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
          <div
            className={`grid h-full min-h-0 overflow-hidden rounded-xl border border-slate-800 bg-[#0f1621] ${
              isTeacher ? 'xl:grid-cols-[minmax(0,1fr)_228px]' : 'grid-cols-1'
            }`}
          >
            <div
              className={`flex min-h-[660px] flex-col border-b border-slate-800 p-2.5 xl:min-h-0 ${
                isTeacher ? 'xl:border-b-0 xl:border-r xl:border-slate-800' : ''
              }`}
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

            {isTeacher && (
              <aside className="min-h-0 overflow-y-auto bg-[#0b1119] p-2.5">
                <>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#c7a87f]">
                    Whiteboard Tools
                  </p>
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
