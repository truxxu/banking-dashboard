import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { centsToInput, parseMoney } from '@/lib/money'

/** Shared form pieces for the send and request flows. */

export function RadioCard({ children, ...input }: React.ComponentProps<'input'> & { children: React.ReactNode }) {
  return (
    <label className="hover:bg-accent/50 has-[input:checked]:border-primary has-[input:checked]:bg-accent has-[input:focus-visible]:ring-ring/50 flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 text-sm transition-colors has-[input:focus-visible]:ring-[3px]">
      <input type="radio" className="sr-only" {...input} />
      {children}
    </label>
  )
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-destructive text-sm">
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
