const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  timeZone: "UTC"
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC"
})

function parseDate(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatDateUTC(value: string | Date | null | undefined, fallback = "-") {
  if (!value) {
    return fallback
  }

  const parsed = parseDate(value)
  return parsed ? dateFormatter.format(parsed) : fallback
}

export function formatDateTimeUTC(value: string | Date | null | undefined, fallback = "-") {
  if (!value) {
    return fallback
  }

  const parsed = parseDate(value)
  return parsed ? dateTimeFormatter.format(parsed) : fallback
}
