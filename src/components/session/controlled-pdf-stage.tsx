'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AnnotationPoint,
  AnnotationStroke,
  AnnotationTool,
} from '@/lib/session/teaching-state'
import { dedupeAnnotationStrokes } from '@/lib/session/teaching-state'

const VIEWER_FALLBACK_MESSAGE =
  'This lesson page could not be displayed on this device. Please refresh the page or try another browser.'

type ControlledPdfStageProps = {
  fileUrl: string | null
  page: number
  zoom: number
  isTeacher: boolean
  scrollTopRatio: number
  scrollLeftRatio: number
  onScrollRatioChange?: (next: { scrollTopRatio: number; scrollLeftRatio: number }) => void
  onTotalPagesChange?: (pages: number) => void
  annotations?: AnnotationStroke[]
  draftStroke?: AnnotationStroke | null
  annotationMode?: boolean
  annotationTool?: AnnotationTool
  annotationColor?: string
  annotationStrokeWidth?: number
  onDraftStrokeChange?: (stroke: AnnotationStroke | null) => void
  onStrokeCommit?: (stroke: AnnotationStroke) => void
  onEraseAtPoint?: (point: AnnotationPoint, radius: number) => void
  currentUserId?: string
}

type PdfCanvasLayerProps = {
  fileUrl: string | null
  page: number
  zoom: number
  isTeacher: boolean
  containerSize: { width: number; height: number }
  onTotalPagesChange?: (pages: number) => void
  onViewportChange: (viewport: { width: number; height: number }) => void
  onLoadingChange: (isLoading: boolean) => void
  onErrorChange: (errorText: string | null) => void
}

type PdfRenderTaskLike = {
  promise: Promise<void>
  cancel?: () => void
}

type PdfDocumentLike = {
  numPages: number
  getPage: (pageNumber: number) => Promise<{
    getViewport: (params: { scale: number }) => { width: number; height: number }
    render: (params: {
      canvasContext: CanvasRenderingContext2D
      viewport: { width: number; height: number }
      transform?: [number, number, number, number, number, number]
    }) => { promise: Promise<void> }
  }>
  destroy?: () => void
}

type PdfJsLike = {
  version?: string
  GlobalWorkerOptions: {
    workerSrc: string
  }
  getDocument: (params: { url: string; disableWorker: boolean }) => {
    promise: Promise<PdfDocumentLike>
    destroy?: () => void
  }
}

let workerConfigured = false

function isDebugLoggingEnabled() {
  return process.env.NODE_ENV !== 'production'
}

function ensureUint8ArrayToHex() {
  if (typeof Uint8Array === 'undefined' || typeof Uint8Array.prototype.toHex === 'function') {
    return
  }

  Object.defineProperty(Uint8Array.prototype, 'toHex', {
    configurable: true,
    writable: true,
    value: function toHex(this: Uint8Array) {
      let result = ''

      for (const value of this) {
        result += value.toString(16).padStart(2, '0')
      }

      return result
    },
  })
}

function getFriendlyPdfErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase()
    if (normalizedMessage.includes('tohex')) {
      return VIEWER_FALLBACK_MESSAGE
    }
  }

  return VIEWER_FALLBACK_MESSAGE
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.floor(value)))
}

const PdfCanvasLayer = memo(function PdfCanvasLayer({
  fileUrl,
  page,
  zoom,
  isTeacher,
  containerSize,
  onTotalPagesChange,
  onViewportChange,
  onLoadingChange,
  onErrorChange,
}: PdfCanvasLayerProps) {
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentLike | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<PdfRenderTaskLike | null>(null)
  const renderCountRef = useRef(0)

  const clampedZoom = useMemo(() => Math.min(250, Math.max(50, Math.floor(zoom))), [zoom])
  renderCountRef.current += 1

  useEffect(() => {
    let cancelled = false
    let task:
      | {
          promise: Promise<PdfDocumentLike>
          destroy?: () => void
        }
      | null = null

    if (isDebugLoggingEnabled()) {
      console.log('[controlled-pdf-stage] canvas layer render', {
        role: isTeacher ? 'teacher' : 'student',
        renderCount: renderCountRef.current,
        fileUrlPresent: Boolean(fileUrl),
        page,
        zoom: clampedZoom,
      })
    }

    if (!fileUrl) {
      setPdfDocument(null)
      onErrorChange(null)
      onLoadingChange(false)
      onViewportChange({ width: 0, height: 0 })
      return
    }

    onLoadingChange(true)
    onErrorChange(null)
    onViewportChange({ width: 0, height: 0 })

    if (isDebugLoggingEnabled()) {
      console.log('[controlled-pdf-stage] document load start', {
        role: isTeacher ? 'teacher' : 'student',
        fileUrl,
      })
    }

    ;(async () => {
      try {
        ensureUint8ArrayToHex()

        const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsLike
        if (!workerConfigured) {
          const version = pdfjs.version || '5.5.207'
          pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`
          workerConfigured = true
        }

        task = pdfjs.getDocument({ url: fileUrl, disableWorker: false })
        const loaded = await task.promise
        if (cancelled) return
        setPdfDocument(loaded)
        onTotalPagesChange?.(loaded.numPages)

        if (isDebugLoggingEnabled()) {
          console.log('[controlled-pdf-stage] document load success', {
            role: isTeacher ? 'teacher' : 'student',
            fileUrl,
            pages: loaded.numPages,
          })
        }
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load lesson material PDF.', error)
        onErrorChange(getFriendlyPdfErrorMessage(error))
        setPdfDocument(null)
        onLoadingChange(false)
      }
    })()

    return () => {
      cancelled = true
      task?.destroy?.()
    }
  }, [clampedZoom, fileUrl, isTeacher, onErrorChange, onLoadingChange, onTotalPagesChange, onViewportChange, page])

  useEffect(() => {
    let cancelled = false

    if (!pdfDocument || !canvasRef.current) return
    if (containerSize.width <= 0 || containerSize.height <= 0) return

    ;(async () => {
      try {
        renderTaskRef.current?.cancel?.()

        const targetPage = clampInt(page, 1, pdfDocument.numPages)
        const canvas = canvasRef.current
        if (!canvas) return
        const context = canvas.getContext('2d')
        if (!context) return

        const pdfPage = await pdfDocument.getPage(targetPage)
        if (cancelled) return

        const baseViewport = pdfPage.getViewport({ scale: 1 })
        const fitScale = Math.max(
          0.2,
          Math.min(
            containerSize.width / baseViewport.width,
            containerSize.height / baseViewport.height
          )
        )
        const scale = fitScale * (clampedZoom / 100)
        const viewport = pdfPage.getViewport({ scale })
        const devicePixelRatio = window.devicePixelRatio || 1

        if (isDebugLoggingEnabled()) {
          console.log('[controlled-pdf-stage] page render start', {
            role: isTeacher ? 'teacher' : 'student',
            page: targetPage,
            zoom: clampedZoom,
            fitScale,
            containerWidth: containerSize.width,
            containerHeight: containerSize.height,
            fileUrl,
          })
        }

        canvas.width = Math.floor(viewport.width * devicePixelRatio)
        canvas.height = Math.floor(viewport.height * devicePixelRatio)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        onViewportChange({
          width: Math.floor(viewport.width),
          height: Math.floor(viewport.height),
        })
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)

        const renderTask = pdfPage.render({
          canvasContext: context,
          viewport,
          transform:
            devicePixelRatio === 1
              ? undefined
              : [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0],
        })
        renderTaskRef.current = renderTask
        await renderTask.promise

        if (!cancelled) {
          onLoadingChange(false)
          if (isDebugLoggingEnabled()) {
            console.log('[controlled-pdf-stage] page render success', {
              role: isTeacher ? 'teacher' : 'student',
              page: targetPage,
              width: Math.floor(viewport.width),
              height: Math.floor(viewport.height),
            })
          }
        }
      } catch (error) {
        const isCancelledError =
          error instanceof Error &&
          (error.name === 'RenderingCancelledException' ||
            error.message.toLowerCase().includes('rendering cancelled'))

        if (cancelled || isCancelledError) return
        console.error('Failed to render lesson material PDF page.', error)
        onErrorChange(getFriendlyPdfErrorMessage(error))
        onLoadingChange(false)
      }
    })()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel?.()
      renderTaskRef.current = null
    }
  }, [
    clampedZoom,
    containerSize.height,
    containerSize.width,
    fileUrl,
    isTeacher,
    onErrorChange,
    onLoadingChange,
    onViewportChange,
    page,
    pdfDocument,
  ])

  return <canvas ref={canvasRef} className="block max-w-none" />
},
(prev, next) =>
  prev.fileUrl === next.fileUrl &&
  prev.page === next.page &&
  prev.zoom === next.zoom &&
  prev.isTeacher === next.isTeacher &&
  prev.containerSize.width === next.containerSize.width &&
  prev.containerSize.height === next.containerSize.height &&
  prev.onTotalPagesChange === next.onTotalPagesChange &&
  prev.onViewportChange === next.onViewportChange &&
  prev.onLoadingChange === next.onLoadingChange &&
  prev.onErrorChange === next.onErrorChange
)

export default function ControlledPdfStage({
  fileUrl,
  page,
  zoom,
  isTeacher,
  scrollTopRatio,
  scrollLeftRatio,
  onScrollRatioChange,
  onTotalPagesChange,
  annotations = [],
  draftStroke = null,
  annotationMode = false,
  annotationTool = 'pen',
  annotationColor = '#1f2937',
  annotationStrokeWidth = 4,
  onDraftStrokeChange,
  onStrokeCommit,
  onEraseAtPoint,
  currentUserId = 'teacher',
}: ControlledPdfStageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [pageViewport, setPageViewport] = useState({ width: 0, height: 0 })
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pageSurfaceRef = useRef<HTMLDivElement | null>(null)
  const ignoreNextScrollRef = useRef(false)
  const emitTimeoutRef = useRef<number | null>(null)
  const pendingScrollRef = useRef({ scrollTopRatio: 0, scrollLeftRatio: 0 })
  const isAnnotatingRef = useRef(false)
  const clampedZoom = useMemo(() => Math.min(250, Math.max(50, Math.floor(zoom))), [zoom])
  const renderedAnnotations = useMemo(() => {
    const committed = dedupeAnnotationStrokes(annotations)

    if (!draftStroke) return committed
    if (committed.some((stroke) => stroke.id === draftStroke.id)) return committed

    return [...committed, draftStroke]
  }, [annotations, draftStroke])

  useEffect(() => {
    if (!isDebugLoggingEnabled()) return

    const committedIds = annotations.map((stroke) => stroke.id)
    const duplicateIds = committedIds.filter((id, index) => committedIds.indexOf(id) !== index)

    if (duplicateIds.length > 0) {
      console.log('[controlled-pdf-stage] duplicate committed stroke ids detected', {
        duplicateIds,
        isTeacher,
        page,
      })
    }

    console.log('[controlled-pdf-stage] annotation render stats', {
      isTeacher,
      page,
      committedStrokeCount: annotations.length,
      renderedStrokeCount: renderedAnnotations.length,
      draftStrokeId: draftStroke?.id ?? null,
      fileUrlPresent: Boolean(fileUrl),
    })
  }, [annotations, draftStroke, fileUrl, isTeacher, page, renderedAnnotations.length])

  useEffect(() => {
    onDraftStrokeChange?.(null)
    isAnnotatingRef.current = false
  }, [fileUrl, onDraftStrokeChange, page])

  useEffect(() => {
    if (isTeacher) return
    const container = containerRef.current
    if (!container) return

    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight)
    const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth)
    ignoreNextScrollRef.current = true
    container.scrollTop = maxTop * clampRatio(scrollTopRatio)
    container.scrollLeft = maxLeft * clampRatio(scrollLeftRatio)
  }, [isTeacher, page, scrollLeftRatio, scrollTopRatio, clampedZoom])

  useEffect(() => {
    return () => {
      if (emitTimeoutRef.current) {
        window.clearTimeout(emitTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const nextSize = {
        width: Math.floor(container.clientWidth),
        height: Math.floor(container.clientHeight),
      }

      setContainerSize((current) => {
        if (current.width === nextSize.width && current.height === nextSize.height) {
          return current
        }

        return nextSize
      })
    }

    const frame = window.requestAnimationFrame(updateSize)
    window.addEventListener('resize', updateSize)
    window.addEventListener('orientationchange', updateSize)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateSize)
      observer.observe(container)
    }

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('orientationchange', updateSize)
      observer?.disconnect()
    }
  }, [])

  const handleScroll = () => {
    if (!isTeacher || !onScrollRatioChange) return
    if (ignoreNextScrollRef.current) {
      ignoreNextScrollRef.current = false
      return
    }

    const container = containerRef.current
    if (!container) return

    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight)
    const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth)

    pendingScrollRef.current = {
      scrollTopRatio: maxTop > 0 ? container.scrollTop / maxTop : 0,
      scrollLeftRatio: maxLeft > 0 ? container.scrollLeft / maxLeft : 0,
    }

    if (emitTimeoutRef.current) {
      window.clearTimeout(emitTimeoutRef.current)
    }

    emitTimeoutRef.current = window.setTimeout(() => {
      onScrollRatioChange({
        scrollTopRatio: clampRatio(pendingScrollRef.current.scrollTopRatio),
        scrollLeftRatio: clampRatio(pendingScrollRef.current.scrollLeftRatio),
      })
    }, 140)
  }

  const buildStrokeFromPoint = (point: AnnotationPoint) => ({
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    page,
    tool: annotationTool,
    color: annotationColor,
    strokeWidth: annotationStrokeWidth,
    points: [point],
    createdAt: new Date().toISOString(),
    createdBy: currentUserId,
  })

  const getNormalizedPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const surface = pageSurfaceRef.current
    if (!surface || pageViewport.width <= 0 || pageViewport.height <= 0) return null

    const bounds = surface.getBoundingClientRect()
    const relativeX = event.clientX - bounds.left
    const relativeY = event.clientY - bounds.top

    return {
      x: clampRatio(relativeX / pageViewport.width),
      y: clampRatio(relativeY / pageViewport.height),
    }
  }

  const handleAnnotationPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isTeacher || !annotationMode) return

    const point = getNormalizedPoint(event)
    if (!point) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    if (annotationTool === 'eraser') {
      const radius = Math.max(14, annotationStrokeWidth * 3) / Math.max(pageViewport.width, pageViewport.height)
      onEraseAtPoint?.(point, radius)
      return
    }

    isAnnotatingRef.current = true
    onDraftStrokeChange?.(buildStrokeFromPoint(point))
  }

  const handleAnnotationPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isTeacher || !annotationMode) return

    const point = getNormalizedPoint(event)
    if (!point) return

    if (annotationTool === 'eraser') {
      if (event.buttons !== 1) return
      const radius = Math.max(14, annotationStrokeWidth * 3) / Math.max(pageViewport.width, pageViewport.height)
      onEraseAtPoint?.(point, radius)
      return
    }

    if (!isAnnotatingRef.current || !draftStroke) return

    onDraftStrokeChange?.({
      ...draftStroke,
      points: [...draftStroke.points, point],
    })
  }

  const finishAnnotation = () => {
    if (!isTeacher || !annotationMode || annotationTool === 'eraser') return
    if (!isAnnotatingRef.current || !draftStroke) return

    isAnnotatingRef.current = false
    onStrokeCommit?.(draftStroke)
    onDraftStrokeChange?.(null)
  }

  const buildPolylinePoints = (stroke: AnnotationStroke) =>
    stroke.points.map((point) => `${point.x * pageViewport.width},${point.y * pageViewport.height}`).join(' ')

  const getStrokeStyle = (stroke: AnnotationStroke) => {
    if (stroke.tool === 'highlighter') {
      return {
        stroke: stroke.color,
        strokeWidth: stroke.strokeWidth,
        strokeOpacity: 0.32,
      }
    }

    return {
      stroke: stroke.color,
      strokeWidth: stroke.strokeWidth,
      strokeOpacity: 1,
    }
  }

  if (!fileUrl) {
    return (
      <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-6 text-center text-sm text-slate-300 sm:min-h-[420px]">
        No material is currently presented.
      </div>
    )
  }

  if (errorText) {
    return (
      <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl border border-rose-800/60 bg-rose-950/30 px-6 text-center text-sm text-rose-100 sm:min-h-[420px]">
        {errorText}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      {isLoading && (
        <p className="mb-1.5 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300">
          Loading material...
        </p>
      )}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex min-h-[260px] flex-1 items-center justify-center rounded-xl bg-[#080d14] sm:min-h-[420px] ${
          isTeacher ? 'overflow-auto' : 'overflow-hidden'
        }`}
      >
        <div
          ref={pageSurfaceRef}
          className="relative mx-auto"
          style={{
            width: pageViewport.width > 0 ? `${pageViewport.width}px` : undefined,
            height: pageViewport.height > 0 ? `${pageViewport.height}px` : undefined,
          }}
        >
          <PdfCanvasLayer
            fileUrl={fileUrl}
            page={page}
            zoom={zoom}
            isTeacher={isTeacher}
            containerSize={containerSize}
            onTotalPagesChange={onTotalPagesChange}
            onViewportChange={setPageViewport}
            onLoadingChange={setIsLoading}
            onErrorChange={setErrorText}
          />
          {pageViewport.width > 0 && pageViewport.height > 0 && (
            <svg
              className={`absolute inset-0 ${
                isTeacher && annotationMode ? 'touch-none' : 'pointer-events-none'
              }`}
              width={pageViewport.width}
              height={pageViewport.height}
              viewBox={`0 0 ${pageViewport.width} ${pageViewport.height}`}
              onPointerDown={handleAnnotationPointerDown}
              onPointerMove={handleAnnotationPointerMove}
              onPointerUp={finishAnnotation}
              onPointerCancel={finishAnnotation}
              onPointerLeave={() => {
                if (annotationTool === 'eraser') return
                if (!isAnnotatingRef.current) return
                finishAnnotation()
              }}
            >
              {renderedAnnotations.map((stroke) => {
                const { stroke: strokeColor, strokeWidth, strokeOpacity } = getStrokeStyle(stroke)
                if (stroke.points.length === 1) {
                  const [point] = stroke.points
                  return (
                    <circle
                      key={stroke.id}
                      cx={point.x * pageViewport.width}
                      cy={point.y * pageViewport.height}
                      r={Math.max(2, strokeWidth / 2)}
                      fill={strokeColor}
                      fillOpacity={strokeOpacity}
                    />
                  )
                }

                return (
                  <polyline
                    key={stroke.id}
                    points={buildPolylinePoints(stroke)}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )
              })}
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
