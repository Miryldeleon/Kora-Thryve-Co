export type LessonState = {
  surface: 'materials' | 'whiteboard'
  moduleId: string | null
  page: number
  zoom: number
  scrollTopRatio: number
  scrollLeftRatio: number
}

export type AnnotationTool = 'pen' | 'highlighter' | 'eraser'

export type AnnotationPoint = {
  x: number
  y: number
}

export type AnnotationStroke = {
  id: string
  page: number
  tool: AnnotationTool
  color: string
  strokeWidth: number
  points: AnnotationPoint[]
  createdAt: string
  createdBy: string
}

export type TeachingAnnotations = Record<string, Record<string, AnnotationStroke[]>>

export type TeachingStateSnapshot = {
  lesson: LessonState
  whiteboardSnapshot: string | null
  annotations: TeachingAnnotations
}

export const EMPTY_TEACHING_ANNOTATIONS: TeachingAnnotations = {}

export function isLessonState(value: unknown): value is LessonState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LessonState>
  return (
    (candidate.surface === 'materials' || candidate.surface === 'whiteboard') &&
    (typeof candidate.moduleId === 'string' || candidate.moduleId === null) &&
    typeof candidate.page === 'number' &&
    typeof candidate.zoom === 'number' &&
    typeof candidate.scrollTopRatio === 'number' &&
    typeof candidate.scrollLeftRatio === 'number'
  )
}

export function isAnnotationPoint(value: unknown): value is AnnotationPoint {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AnnotationPoint>
  return typeof candidate.x === 'number' && typeof candidate.y === 'number'
}

export function isAnnotationStroke(value: unknown): value is AnnotationStroke {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AnnotationStroke>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.page === 'number' &&
    (candidate.tool === 'pen' || candidate.tool === 'highlighter' || candidate.tool === 'eraser') &&
    typeof candidate.color === 'string' &&
    typeof candidate.strokeWidth === 'number' &&
    Array.isArray(candidate.points) &&
    candidate.points.every((point) => isAnnotationPoint(point)) &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.createdBy === 'string'
  )
}

export function isTeachingAnnotations(value: unknown): value is TeachingAnnotations {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  return Object.values(value as Record<string, unknown>).every((moduleAnnotations) => {
    if (!moduleAnnotations || typeof moduleAnnotations !== 'object' || Array.isArray(moduleAnnotations)) {
      return false
    }

    return Object.values(moduleAnnotations as Record<string, unknown>).every((pageAnnotations) => {
      return Array.isArray(pageAnnotations) && pageAnnotations.every((stroke) => isAnnotationStroke(stroke))
    })
  })
}

export function dedupeAnnotationStrokes(strokes: AnnotationStroke[]) {
  const seen = new Set<string>()
  const deduped: AnnotationStroke[] = []

  for (const stroke of strokes) {
    if (seen.has(stroke.id)) continue
    seen.add(stroke.id)
    deduped.push(stroke)
  }

  return deduped
}

export function dedupeTeachingAnnotations(annotations: TeachingAnnotations) {
  const normalized: TeachingAnnotations = {}

  for (const [moduleId, pageMap] of Object.entries(annotations)) {
    const normalizedPageMap: Record<string, AnnotationStroke[]> = {}

    for (const [pageNumber, strokes] of Object.entries(pageMap)) {
      const deduped = dedupeAnnotationStrokes(strokes)
      if (deduped.length > 0) {
        normalizedPageMap[pageNumber] = deduped
      }
    }

    if (Object.keys(normalizedPageMap).length > 0) {
      normalized[moduleId] = normalizedPageMap
    }
  }

  return normalized
}
