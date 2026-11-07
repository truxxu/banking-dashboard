import type { Category } from '@/api/types'

/** Hue (and relative chroma) for each category's tinted avatar. */
export const CATEGORY_TINT: Record<Category, { h: number; c?: number }> = {
  Revenue: { h: 155 },
  Payroll: { h: 190, c: 0.8 },
  Rent: { h: 260, c: 0.25 },
  Software: { h: 265, c: 0.9 },
  Advertising: { h: 20 },
  Travel: { h: 220 },
  Meals: { h: 60 },
  Contractors: { h: 300, c: 0.9 },
  Taxes: { h: 40, c: 0.7 },
  Office: { h: 100, c: 0.7 },
  Interest: { h: 175, c: 0.8 },
  Transfer: { h: 245, c: 0.5 },
  Fees: { h: 0, c: 0.5 },
}

/** Tint for counterparties without a category. */
export const NEUTRAL_TINT: { h: number; c?: number } = { h: 265, c: 0.9 }

/** Up to two initials from the capitalized words of a name: "Hartmann & Rowe" → "HR". */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^\p{Lu}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('') || name.slice(0, 1).toUpperCase()
}
