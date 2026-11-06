const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

export const formatDate = (iso: string) => dateFmt.format(new Date(iso))
export const formatShortDate = (iso: string) => shortFmt.format(new Date(iso))

export const DAY_MS = 24 * 60 * 60 * 1000

export function daysAgo(n: number, from = new Date()) {
  return new Date(from.getTime() - n * DAY_MS)
}

/** YYYY-MM-DD in local time — used as a stable bucket key. */
export function dayKey(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Inverse of `dayKey`: parses YYYY-MM-DD as a local-time date. Returns undefined if invalid. */
export function parseDayKey(key: string | undefined): Date | undefined {
  const m = key && /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return undefined
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return dayKey(date) === key ? date : undefined // rejects e.g. 2026-02-31
}
