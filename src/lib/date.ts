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
