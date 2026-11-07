import { AlertTriangle, Inbox } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
      <AlertTriangle className="text-destructive size-6" />
      <p className="text-sm">{error instanceof Error ? error.message : 'Something went wrong.'}</p>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <Inbox className="text-muted-foreground size-6" />
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
    </div>
  )
}

/** ErrorState for a page that needs several queries; retry refetches only the failed ones. */
export function QueriesErrorState({ queries }: { queries: Pick<UseQueryResult, 'isError' | 'error' | 'refetch'>[] }) {
  const failed = queries.filter((q) => q.isError)
  return <ErrorState error={failed[0]?.error} onRetry={() => failed.forEach((q) => void q.refetch())} />
}

/** Placeholder for a multi-step flow card while its data loads. */
export function FlowSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading accounts">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  )
}
