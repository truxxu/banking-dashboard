/**
 * All money in the app is stored as integer cents. Never do arithmetic on
 * floats; convert only at the edges (formatting for display, parsing input).
 */
export type Cents = number

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
})

export function formatMoney(cents: Cents, opts: { signed?: boolean } = {}) {
  const formatted = usd.format(Math.abs(cents) / 100)
  if (cents < 0) return `−${formatted}`
  if (opts.signed && cents > 0) return `+${formatted}`
  return formatted
}

export function formatMoneyCompact(cents: Cents) {
  return usdCompact.format(cents / 100)
}

/** Parses user input like "1,234.5" into cents. Returns null if invalid. */
export function parseMoney(input: string): Cents | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'))
}

/** Integer-only cents → "1234.50" for pre-filling an amount input. */
export function centsToInput(c: Cents) {
  return `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`
}
