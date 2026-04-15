function parseIsoDateParts(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  return { year, month, day }
}

function toIsoDateFromUtcDate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDaysToIsoDate(isoDate: string, days: number) {
  const parts = parseIsoDateParts(isoDate)
  if (!parts) return isoDate

  const utcNoon = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0))
  utcNoon.setUTCDate(utcNoon.getUTCDate() + days)
  return toIsoDateFromUtcDate(utcNoon)
}

export function getTodayIsoDateForTimezone(timezone: string, now: Date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(now)
    const year = parts.find((part) => part.type === 'year')?.value
    const month = parts.find((part) => part.type === 'month')?.value
    const day = parts.find((part) => part.type === 'day')?.value

    if (!year || !month || !day) {
      return now.toISOString().slice(0, 10)
    }

    const yearNum = Number.parseInt(year, 10)
    const monthNum = Number.parseInt(month, 10)
    const dayNum = Number.parseInt(day, 10)
    if (
      !Number.isFinite(yearNum) ||
      !Number.isFinite(monthNum) ||
      !Number.isFinite(dayNum) ||
      monthNum < 1 ||
      monthNum > 12 ||
      dayNum < 1 ||
      dayNum > 31
    ) {
      return now.toISOString().slice(0, 10)
    }

    return `${String(yearNum).padStart(4, '0')}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

export function formatIsoCalendarDate(
  isoDate: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  locale: string = 'en-US'
) {
  const parts = parseIsoDateParts(isoDate)
  if (!parts) return isoDate

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0))
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: 'UTC',
  }).format(date)
}
