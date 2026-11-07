import type { Category } from '@/api/types'
import { CATEGORY_TINT, initials, NEUTRAL_TINT } from '@/lib/category'
import { cn } from '@/lib/utils'

const SIZE = {
  sm: 'size-[30px] rounded-[9px] text-[11px]',
  lg: 'size-11 rounded-xl text-sm',
}

/** Rounded square with a counterparty's initials, tinted by category (or neutral). */
export function CounterpartyAvatar({ name, category, size = 'sm', className }: { name: string; category?: Category; size?: keyof typeof SIZE; className?: string }) {
  const tint = category ? CATEGORY_TINT[category] : NEUTRAL_TINT
  return (
    <span
      aria-hidden
      className={cn('tint grid shrink-0 place-items-center font-semibold', SIZE[size], className)}
      style={{ '--h': tint.h, '--c': tint.c ?? 1 } as React.CSSProperties}
    >
      {initials(name)}
    </span>
  )
}
