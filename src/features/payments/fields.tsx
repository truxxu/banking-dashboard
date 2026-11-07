import { useState } from 'react'
import { Controller, type Control, type FieldPathByValue, type FieldValues, type UseFormRegisterReturn } from 'react-hook-form'
import { MEMO_MAX, METHOD_LABEL, TRANSFER_ETA } from '@/api/schemas'
import type { Account, TransactionMethod } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { centsToInput, parseMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

/** Shared form pieces for the send and request flows. */

export function RadioCard({ children, ...input }: React.ComponentProps<'input'> & { children: React.ReactNode }) {
  return (
    <label className="hover:bg-accent/50 has-[input:checked]:border-primary has-[input:checked]:bg-accent has-[input:focus-visible]:ring-ring/50 flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 text-sm transition-colors has-[input:focus-visible]:ring-[3px]">
      <input type="radio" className="sr-only" {...input} />
      {children}
    </label>
  )
}

/** Account name with its masked number, for radio-card labels. */
export function AccountName({ account, children }: { account: Account; children?: React.ReactNode }) {
  return (
    <span>
      <span className="font-medium">{account.name}</span> <span className="text-muted-foreground">••{account.mask}</span>
      {children}
    </span>
  )
}

/** Method name over its delivery time, for radio-card labels. */
export function MethodOption({ method }: { method: Exclude<TransactionMethod, 'card'> }) {
  return (
    <span>
      <span className="block font-medium">{METHOD_LABEL[method]}</span>
      <span className="text-muted-foreground text-xs">{TRANSFER_ETA[method]}</span>
    </span>
  )
}

export function FieldError({ id, message, className }: { id?: string; message?: string; className?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className={cn('text-destructive text-sm', className)}>
      {message}
    </p>
  )
}

export function AmountInput({
  id,
  value,
  onChange,
  onBlur,
  name,
  ref,
  invalid,
  errorId,
  helpId,
}: {
  id: string
  value: number
  onChange: (cents: number) => void
  onBlur: () => void
  name: string
  ref: React.Ref<HTMLInputElement>
  invalid: boolean
  errorId: string
  helpId?: string
}) {
  // Keep the raw text so partial input like "12." isn't reformatted while typing.
  const [text, setText] = useState(() => (Number.isFinite(value) ? centsToInput(value) : ''))
  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">$</span>
      <Input
        id={id}
        ref={ref}
        name={name}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        className="tabular pl-7"
        value={text}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : helpId}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parseMoney(e.target.value) ?? NaN)
        }}
        onBlur={onBlur}
      />
    </div>
  )
}

/** Labeled amount input bound to a cents field, with its error and optional help text. */
export function AmountField<T extends FieldValues, TOut>({
  control,
  name,
  id,
  help,
}: {
  control: Control<T, unknown, TOut>
  name: FieldPathByValue<T, number>
  id: string
  help?: React.ReactNode
}) {
  const errorId = `${id}-error`
  const helpId = help ? `${id}-help` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Amount
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <>
            <AmountInput
              id={id}
              errorId={errorId}
              helpId={helpId}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              invalid={Boolean(fieldState.error)}
            />
            <FieldError id={errorId} message={fieldState.error?.message} />
          </>
        )}
      />
      {help && (
        <p id={helpId} className="text-muted-foreground text-xs">
          {help}
        </p>
      )}
    </div>
  )
}

/** Optional memo input with a character counter. */
export function MemoField({
  id,
  placeholder,
  registration,
  length,
  error,
}: {
  id: string
  placeholder: string
  registration: UseFormRegisterReturn
  length: number
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          Memo <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <span className="tabular text-muted-foreground text-xs">
          {length}/{MEMO_MAX}
        </span>
      </div>
      <Input id={id} maxLength={MEMO_MAX} placeholder={placeholder} {...registration} />
      <FieldError message={error} />
    </div>
  )
}

export interface ReviewRow {
  label: string
  value: React.ReactNode
  /** Step to jump back to when editing; rows without one aren't editable. */
  step?: number
  strong?: boolean
}

/** The Review step's summary list with per-row Edit links, plus the submit error if any. */
export function ReviewList({
  rows,
  onEdit,
  error,
  fallback,
}: {
  rows: ReviewRow[]
  onEdit: (step: number) => void
  error: Error | null
  fallback: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y rounded-lg border text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt className="text-muted-foreground shrink-0">{r.label}</dt>
            <dd className={`flex min-w-0 items-center gap-2 text-right ${r.strong ? 'font-semibold' : ''}`}>
              <span className="truncate">{r.value}</span>
              {r.step !== undefined && (
                <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => onEdit(r.step!)} aria-label={`Edit ${r.label.toLowerCase()}`}>
                  Edit
                </Button>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {error && (
        <p role="alert" className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm">
          {error.message || fallback} Please try again.
        </p>
      )}
    </div>
  )
}
