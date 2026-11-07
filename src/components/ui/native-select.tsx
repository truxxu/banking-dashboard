import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { FOCUS_RING } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * A styled native <select>. Accessible and mobile-friendly out of the box.
 * Swap for shadcn's Radix-based Select (`npx shadcn add select`) if you want a custom menu.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className={cn('relative', className)}>
      <select
        data-slot="native-select"
        className={cn('bg-card shadow-control h-9 w-full cursor-pointer appearance-none rounded-[10px] py-1 pr-8 pl-3 text-base outline-none sm:text-sm', FOCUS_RING)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-[15px] -translate-y-1/2" />
    </div>
  )
}

export { NativeSelect }
