export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g
const RESOURCE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export function sanitizeText(value: unknown, options: { maxLength: number; trim?: boolean }) {
  const rawValue = typeof value === 'string' ? value : String(value ?? '')
  const withoutControls = rawValue.replace(CONTROL_CHARACTER_PATTERN, '')
  const normalized = options.trim === false ? withoutControls : withoutControls.trim()
  return normalized.slice(0, options.maxLength)
}

export function parseResourceId(value: unknown, label: string): ValidationResult<string> {
  const resourceId = sanitizeText(value, { maxLength: 160 })

  if (!resourceId) {
    return { ok: false, error: `Missing ${label}.` }
  }

  if (!RESOURCE_ID_PATTERN.test(resourceId)) {
    return { ok: false, error: `Invalid ${label}.` }
  }

  return { ok: true, value: resourceId }
}

export function parseNotes(value: unknown): ValidationResult<string> {
  const notes = sanitizeText(value, { maxLength: 20000, trim: false })

  if (typeof value === 'string' && value.length > 20000) {
    return { ok: false, error: 'Notes are too long.' }
  }

  return { ok: true, value: notes }
}

export function parseProfileUpdatePayload(body: unknown) {
  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const ageInput = payload.age
  const parsedAge =
    ageInput === null || ageInput === undefined || ageInput === ''
      ? null
      : Math.floor(Number(ageInput))

  if (parsedAge !== null && (!Number.isFinite(parsedAge) || parsedAge < 1 || parsedAge > 120)) {
    return { ok: false as const, error: 'Age must be between 1 and 120.' }
  }

  return {
    ok: true as const,
    value: {
      full_name: sanitizeText(payload.full_name, { maxLength: 120 }) || null,
      age: parsedAge,
      location: sanitizeText(payload.location, { maxLength: 120 }) || null,
    },
  }
}
