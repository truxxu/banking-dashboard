import { useState } from 'react'
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { TRANSFER_ETA, type PaymentRequestInput, type PaymentRequestOutput } from '@/api/schemas'
import type { Account, Customer } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { dayKey, formatDayKey } from '@/lib/date'
import { formatMoney } from '@/lib/money'
import { AmountInput, FieldError, RadioCard } from '@/features/payments/fields'
import { METHOD_LABEL } from '@/features/payments/transfer'

export type RequestForm = UseFormReturn<PaymentRequestInput, unknown, PaymentRequestOutput>
interface StepProps {
  form: RequestForm
  accounts: Account[]
  customers: Customer[]
}

const METHODS = ['ach', 'wire'] as const

export function DepositStep({ form, accounts }: StepProps) {
  const { register, formState } = form
  const field = register('toAccountId')
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Account to deposit into</legend>
      {accounts.map((a) => (
        <RadioCard key={a.id} {...field} value={a.id}>
          <span>
            <span className="font-medium">{a.name}</span> <span className="text-muted-foreground">••{a.mask}</span>
            <span className="text-muted-foreground block text-xs capitalize">{a.type}</span>
          </span>
          <span className="tabular text-muted-foreground text-xs">{formatMoney(a.balanceCents)}</span>
        </RadioCard>
      ))}
      <FieldError message={formState.errors.toAccountId?.message} />
    </fieldset>
  )
}

export function PayerStep({ form, customers }: StepProps) {
  const { register, setValue, control, formState } = form
  const [name, email] = useWatch({ control, name: ['payerName', 'payerEmail'] })

  function pick(c: Customer) {
    // Validate immediately so stale errors from a previous attempt clear.
    setValue('payerName', c.name, { shouldValidate: true })
    setValue('payerEmail', c.email, { shouldValidate: true })
  }

  return (
    <div className="flex flex-col gap-5">
      {customers.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 id="saved-payers" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Saved customers
          </h3>
          <ul aria-labelledby="saved-payers" className="flex flex-wrap gap-1.5">
            {customers.map((c) => {
              const active = c.name === name && c.email === email
              return (
                <li key={c.id}>
                  <Button type="button" size="sm" variant={active ? 'default' : 'outline'} aria-pressed={active} onClick={() => pick(c)}>
                    {c.name}
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="payer-name" className="text-sm font-medium">
          Payer name
        </label>
        <Input
          id="payer-name"
          autoComplete="organization"
          placeholder="e.g. Globex Corporation"
          aria-invalid={Boolean(formState.errors.payerName)}
          aria-describedby={formState.errors.payerName ? 'payer-name-error' : undefined}
          {...register('payerName')}
        />
        <FieldError id="payer-name-error" message={formState.errors.payerName?.message} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="payer-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="payer-email"
          type="email"
          autoComplete="email"
          placeholder="billing@example.com"
          aria-invalid={Boolean(formState.errors.payerEmail)}
          aria-describedby={formState.errors.payerEmail ? 'payer-email-error' : 'payer-email-help'}
          {...register('payerEmail')}
        />
        <FieldError id="payer-email-error" message={formState.errors.payerEmail?.message} />
        <p id="payer-email-help" className="text-muted-foreground text-xs">
          We'll email them a secure link to pay.
        </p>
      </div>
    </div>
  )
}

export function DetailsStep({ form }: StepProps) {
  const { control, register, formState } = form
  const memo = useWatch({ control, name: 'memo' })
  const [today] = useState(() => dayKey(new Date()))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="request-amount" className="text-sm font-medium">
          Amount
        </label>
        <Controller
          name="amountCents"
          control={control}
          render={({ field, fieldState }) => (
            <AmountInput
              id="request-amount"
              errorId="request-amount-error"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              invalid={Boolean(fieldState.error)}
            />
          )}
        />
        <FieldError id="request-amount-error" message={formState.errors.amountCents?.message} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">How they'll pay</legend>
        {METHODS.map((m) => (
          <RadioCard key={m} {...register('method')} value={m}>
            <span>
              <span className="block font-medium">{METHOD_LABEL[m]}</span>
              <span className="text-muted-foreground text-xs">{TRANSFER_ETA[m]}</span>
            </span>
            <span className="text-muted-foreground text-xs">No fee to receive</span>
          </RadioCard>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="request-due" className="text-sm font-medium">
          Due date
        </label>
        <Input
          id="request-due"
          type="date"
          min={today}
          className="w-fit"
          aria-invalid={Boolean(formState.errors.dueDate)}
          aria-describedby={formState.errors.dueDate ? 'request-due-error' : undefined}
          {...register('dueDate')}
        />
        <FieldError id="request-due-error" message={formState.errors.dueDate?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="request-memo" className="text-sm font-medium">
            Memo <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <span className="tabular text-muted-foreground text-xs">{memo?.length ?? 0}/140</span>
        </div>
        <Input id="request-memo" maxLength={140} placeholder="e.g. Invoice INV-2041" {...register('memo')} />
        <FieldError message={formState.errors.memo?.message} />
      </div>
    </div>
  )
}

export function ReviewStep({
  form,
  accounts,
  onEdit,
  error,
}: StepProps & { onEdit: (step: number) => void; error: Error | null }) {
  const v = useWatch({ control: form.control }) as PaymentRequestInput
  const to = accounts.find((a) => a.id === v.toAccountId)

  const rows: { label: string; value: React.ReactNode; step?: number; strong?: boolean }[] = [
    { label: 'Deposit to', value: to && `${to.name} ••${to.mask}`, step: 0 },
    { label: 'Payer', value: v.payerName, step: 1 },
    { label: 'Email', value: v.payerEmail, step: 1 },
    { label: 'Amount', value: <span className="tabular">{formatMoney(v.amountCents)}</span>, step: 2, strong: true },
    { label: 'Method', value: `${METHOD_LABEL[v.method]} · ${TRANSFER_ETA[v.method]}`, step: 2 },
    { label: 'Due', value: formatDayKey(v.dueDate), step: 2 },
    ...(v.memo ? [{ label: 'Memo', value: v.memo, step: 2 }] : []),
  ]

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
          {error.message || 'The request could not be sent.'} Please try again.
        </p>
      )}
    </div>
  )
}
