export const TEACHER_MODULES_BUCKET = 'teacher-modules'
export const MAX_MODULE_UPLOAD_SIZE_MB = 200
export const MAX_MODULE_UPLOAD_SIZE_BYTES = MAX_MODULE_UPLOAD_SIZE_MB * 1024 * 1024
export const MODULE_UPLOAD_SIZE_ERROR_MESSAGE = `PDF file must be ${MAX_MODULE_UPLOAD_SIZE_MB}MB or smaller.`

const PDF_MIME_TYPES = new Set(['application/pdf'])

export function isPdfFile(file: File) {
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf')
  const hasPdfMimeType = PDF_MIME_TYPES.has(file.type)
  return hasPdfExtension || hasPdfMimeType
}
