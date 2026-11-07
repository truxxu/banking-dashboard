import * as React from 'react'
import { cn } from '@/lib/utils'

/** 1.5px primary ring plus a soft halo — shared by text inputs and native selects. */
export const FOCUS_RING = 'focus-visible:shadow-[0_0_0_1.5px_var(--ring),0_0_0_5px_color-mix(in_oklch,var(--ring)_12%,transparent)]'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'placeholder:text-muted-foreground bg-card shadow-control h-10 w-full min-w-0 rounded-[10px] px-3 py-1 text-base sm:text-sm transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50',
        FOCUS_RING,
        'aria-invalid:shadow-[0_0_0_1.5px_var(--destructive)] aria-invalid:focus-visible:shadow-[0_0_0_1.5px_var(--destructive),0_0_0_5px_color-mix(in_oklch,var(--destructive)_15%,transparent)]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
