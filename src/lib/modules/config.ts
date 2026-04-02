export const TEACHER_MODULES_BUCKET = 'teacher-modules'
export const MAX_PDF_FILE_SIZE_BYTES = 15 * 1024 * 1024

const PDF_MIME_TYPES = new Set(['application/pdf'])

export function isPdfFile(file: File) {
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf')
  const hasPdfMimeType = PDF_MIME_TYPES.has(file.type)
  return hasPdfExtension || hasPdfMimeType
}
