export type StatusTone = 'neutral' | 'warning' | 'positive' | 'destructive'

/** Dot fill per tone; also used by the transaction timeline. */
export const TONE_DOT: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground/45',
  warning: 'bg-warning',
  positive: 'bg-positive',
  destructive: 'bg-destructive',
}
