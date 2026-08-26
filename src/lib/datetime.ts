export const APP_TIME_ZONE = "Asia/Kolkata"

export type TimezoneOption = {
  label: string
  value: string
  offset: string
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { label: "India Standard Time (IST)", value: "Asia/Kolkata", offset: "UTC+05:30" },
  { label: "Gulf Standard Time (Dubai / UAE)", value: "Asia/Dubai", offset: "UTC+04:00" },
  { label: "Arabia Standard Time (Riyadh / Saudi Arabia)", value: "Asia/Riyadh", offset: "UTC+03:00" },
  { label: "Singapore Time (SGT)", value: "Asia/Singapore", offset: "UTC+08:00" },
  { label: "Hong Kong Time (HKT)", value: "Asia/Hong_Kong", offset: "UTC+08:00" },
  { label: "Japan Standard Time (Tokyo)", value: "Asia/Tokyo", offset: "UTC+09:00" },
  { label: "Bangladesh Standard Time (Dhaka)", value: "Asia/Dhaka", offset: "UTC+06:00" },
  { label: "Pakistan Standard Time (Karachi)", value: "Asia/Karachi", offset: "UTC+05:00" },
  { label: "Sri Lanka Standard Time (Colombo)", value: "Asia/Colombo", offset: "UTC+05:30" },
  { label: "Nepal Time (Kathmandu)", value: "Asia/Kathmandu", offset: "UTC+05:45" },
  { label: "Greenwich Mean Time / BST (London)", value: "Europe/London", offset: "UTC+00:00 / UTC+01:00" },
  { label: "Central European Time (Paris / Berlin)", value: "Europe/Paris", offset: "UTC+01:00 / UTC+02:00" },
  { label: "Eastern Time (New York / US & Canada)", value: "America/New_York", offset: "UTC-05:00 / UTC-04:00" },
  { label: "Central Time (Chicago / US)", value: "America/Chicago", offset: "UTC-06:00 / UTC-05:00" },
  { label: "Mountain Time (Denver / US)", value: "America/Denver", offset: "UTC-07:00 / UTC-06:00" },
  { label: "Pacific Time (Los Angeles / US)", value: "America/Los_Angeles", offset: "UTC-08:00 / UTC-07:00" },
  { label: "Australian Eastern Time (Sydney)", value: "Australia/Sydney", offset: "UTC+10:00 / UTC+11:00" },
  { label: "New Zealand Standard Time (Auckland)", value: "Pacific/Auckland", offset: "UTC+12:00 / UTC+13:00" },
  { label: "Coordinated Universal Time (UTC)", value: "UTC", offset: "UTC+00:00" },
]

const STATIC_TIMEZONE_OFFSETS: Record<string, number> = {
  "Asia/Kolkata": 330,
  "Asia/Colombo": 330,
  "Asia/Kathmandu": 345,
  "Asia/Dhaka": 360,
  "Asia/Karachi": 300,
  "Asia/Dubai": 240,
  "Asia/Riyadh": 180,
  "Asia/Singapore": 480,
  "Asia/Hong_Kong": 480,
  "Asia/Tokyo": 540,
  UTC: 0,
  GMT: 0,
}

const tzOffsetCache = new Map<string, number>()

/**
 * Calculates the exact UTC offset in minutes for any IANA timeZone at a given date.
 * Features $O(1)$ fast-path lookups for Indian & Asian timezones, and day-level memoization for others.
 */
export function getTimeZoneOffsetMinutes(timeZone: string = APP_TIME_ZONE, date = new Date()): number {
  const tz = timeZone || APP_TIME_ZONE

  if (STATIC_TIMEZONE_OFFSETS[tz] !== undefined) {
    return STATIC_TIMEZONE_OFFSETS[tz]
  }

  // Cache by timezone and day epoch to handle DST transitions without per-call Intl overhead
  const dayKey = `${tz}:${Math.floor(date.getTime() / 86400000)}`
  const cached = tzOffsetCache.get(dayKey)
  if (cached !== undefined) {
    return cached
  }

  try {
    const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" })
    const tzStr = date.toLocaleString("en-US", { timeZone: tz })
    const utcDate = new Date(utcStr)
    const tzDate = new Date(tzStr)
    const offset = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000)
    tzOffsetCache.set(dayKey, offset)
    return offset
  } catch {
    return 330 // Fallback to +05:30 (Asia/Kolkata)
  }
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(
  options: Intl.DateTimeFormatOptions,
  locale = "en-US",
  timeZone = APP_TIME_ZONE
) {
  const resolvedTz = timeZone || APP_TIME_ZONE
  const cacheKey = `${locale}:${resolvedTz}:${JSON.stringify(options)}`
  let formatter = formatterCache.get(cacheKey)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone: resolvedTz,
      ...options,
    })
    formatterCache.set(cacheKey, formatter)
  }
  return formatter
}

export function formatDateInAppTimeZone(
  value: Date | string,
  locale = "en-US",
  timeZone = APP_TIME_ZONE
) {
  return getFormatter(
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
    locale,
    timeZone
  ).format(new Date(value))
}

export function formatDateInTimeZone(
  value: Date | string,
  timeZone: string = APP_TIME_ZONE,
  locale = "en-US"
) {
  return formatDateInAppTimeZone(value, locale, timeZone)
}

export function formatDateTimeInAppTimeZone(
  value: Date | string,
  locale = "en-US",
  timeZone = APP_TIME_ZONE
) {
  return getFormatter(
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
    locale,
    timeZone
  ).format(new Date(value))
}

export function formatTimeInAppTimeZone(
  value: Date | string,
  locale = "en-US",
  timeZone = APP_TIME_ZONE
) {
  return getFormatter(
    {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    },
    locale,
    timeZone
  ).format(new Date(value))
}

export function formatDateTimeWithSecondsInAppTimeZone(
  value: Date | string,
  locale = "en-US",
  timeZone = APP_TIME_ZONE
) {
  return getFormatter(
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    },
    locale,
    timeZone
  ).format(new Date(value))
}

export function formatDateTimeInTimeZone(
  value: Date | string,
  timeZone: string = APP_TIME_ZONE,
  locale = "en-US"
) {
  return formatDateTimeInAppTimeZone(value, locale, timeZone)
}

export function formatDateTimeLocalInAppTimeZone(
  value: Date | string,
  timeZone = APP_TIME_ZONE
) {
  const parts = getFormatter(
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    },
    "en-US",
    timeZone
  ).formatToParts(new Date(value))
  const partByType = new Map(parts.map((part) => [part.type, part.value]))

  return `${partByType.get("year")}-${partByType.get("month")}-${partByType.get("day")}T${partByType.get("hour")}:${partByType.get("minute")}`
}

export function parseDateTimeLocalInAppTimeZone(
  value: Date | string,
  timeZone = APP_TIME_ZONE
) {
  if (value instanceof Date) return value

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return new Date(value)

  const [, year, month, day, hour, minute, second = "0"] = match
  const approxUtc = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    )
  )
  const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, approxUtc)

  return new Date(approxUtc.getTime() - offsetMinutes * 60 * 1000)
}

export function parseDateTimeLocalInTimeZone(
  value: Date | string,
  timeZone: string = APP_TIME_ZONE
) {
  return parseDateTimeLocalInAppTimeZone(value, timeZone)
}

export function formatShortDateInAppTimeZone(
  value: Date | string,
  locale = "en-US",
  timeZone = APP_TIME_ZONE
) {
  return getFormatter(
    {
      month: "short",
      day: "numeric",
    },
    locale,
    timeZone
  ).format(new Date(value))
}

export function formatCurrentTimeInTimeZone(timeZone: string = APP_TIME_ZONE): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || APP_TIME_ZONE,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).format(new Date())
  } catch {
    return new Date().toLocaleString()
  }
}

export function subtractDays(value: Date, days: number) {
  return new Date(value.getTime() - days * 24 * 60 * 60 * 1000)
}
