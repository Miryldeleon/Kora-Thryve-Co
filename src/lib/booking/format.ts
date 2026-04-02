export function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

export function formatDateTimeRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  return `${start.toLocaleString()} - ${end.toLocaleTimeString()}`
}
