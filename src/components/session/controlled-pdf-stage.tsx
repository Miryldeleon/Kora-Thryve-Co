'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type ControlledPdfStageProps = {
  fileUrl: string | null
  page: number
  zoom: number
  isTeacher: boolean
  scrollTopRatio: number
  scrollLeftRatio: number
  onScrollRatioChange?: (next: { scrollTopRatio: number; scrollLeftRatio: number }) => void
  onTotalPagesChange?: (pages: number) => void
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

export default function ControlledPdfStage({
  fileUrl,
  page,
  zoom,
  isTeacher,
  scrollTopRatio,
  scrollLeftRatio,
  onScrollRatioChange,
  onTotalPagesChange,
}: ControlledPdfStageProps) {
  const [pdfDocument, setPdfDocument] = useState<PdfDocumentLike | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ignoreNextScrollRef = useRef(false)
  const emitTimeoutRef = useRef<number | null>(null)
  const pendingScrollRef = useRef({ scrollTopRatio: 0, scrollLeftRatio: 0 })

  const clampedZoom = useMemo(() => Math.min(250, Math.max(50, Math.floor(zoom))), [zoom])

  useEffect(() => {
    let cancelled = false
    let task:
      | {
          promise: Promise<PdfDocumentLike>
          destroy?: () => void
        }
      | null = null

    if (!fileUrl) {
      setPdfDocument(null)
      setErrorText(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorText(null)

    ;(async () => {
      try {
        const pdfjs = (await import('pdfjs-dist/build/pdf.mjs')) as unknown as PdfJsLike
        if (!workerConfigured) {
          const version = pdfjs.version || '5.5.207'
          pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
          workerConfigured = true
        }

        task = pdfjs.getDocument({ url: fileUrl, disableWorker: false })
        const loaded = await task.promise
        if (cancelled) return
        setPdfDocument(loaded)
        onTotalPagesChange?.(loaded.numPages)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Unable to load PDF.'
        setErrorText(message)
        setPdfDocument(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
      task?.destroy?.()
    }
  }, [fileUrl, onTotalPagesChange])

  useEffect(() => {
    let cancelled = false

    if (!pdfDocument || !canvasRef.current) return

    ;(async () => {
      try {
        const targetPage = clampInt(page, 1, pdfDocument.numPages)
        const canvas = canvasRef.current
        if (!canvas) return
        const context = canvas.getContext('2d')
        if (!context) return

        const pdfPage = await pdfDocument.getPage(targetPage)
        if (cancelled) return

        const scale = clampedZoom / 100
        const viewport = pdfPage.getViewport({ scale })
        const devicePixelRatio = window.devicePixelRatio || 1

        canvas.width = Math.floor(viewport.width * devicePixelRatio)
        canvas.height = Math.floor(viewport.height * devicePixelRatio)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)

        await pdfPage.render({
          canvasContext: context,
          viewport,
          transform:
            devicePixelRatio === 1
              ? undefined
              : [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0],
        }).promise
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unable to render PDF page.'
          setErrorText(message)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [clampedZoom, page, pdfDocument])

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

  if (!fileUrl) {
    return (
      <div className="flex h-full min-h-[520px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center text-sm text-slate-600">
        No material is currently presented.
      </div>
    )
  }

  if (errorText) {
    return (
      <div className="flex h-full min-h-[520px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-6 text-center text-sm text-rose-700">
        {errorText}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isLoading && (
        <p className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Loading material...
        </p>
      )}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`min-h-0 flex-1 rounded-xl border border-slate-200 bg-white ${
          isTeacher ? 'overflow-auto' : 'overflow-hidden'
        }`}
      >
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  )
}
