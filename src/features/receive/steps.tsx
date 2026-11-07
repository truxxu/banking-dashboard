import { useState } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { METHOD_LABEL, TRANSFER_ETA, type PaymentRequestInput, type PaymentRequestOutput } from '@/api/schemas'
import type { Account, Customer } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ACCOUNT_TYPE_LABEL, accountLabel } from '@/lib/account'
import { formatDayKey, todayKey } from '@/lib/date'
import { formatMoney } from '@/lib/money'
import { AccountName, AmountField, FieldError, MemoField, MethodOption, RadioCard, ReviewList, type ReviewRow } from '@/features/payments/fields'

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
          <AccountName account={a}>
            <span className="text-muted-foreground block text-xs">{ACCOUNT_TYPE_LABEL[a.type]}</span>
          </AccountName>
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
        <div className="flex flex-col gap-2.5">
          <h3 id="saved-payers" className="text-muted-foreground text-xs font-medium tracking-[0.04em] uppercase">
            Saved customers
          </h3>
          <ul aria-labelledby="saved-payers" className="flex flex-wrap gap-1.5">
            {customers.map((c) => {
              const active = c.name === name && c.email === email
              return (
                <li key={c.id}>
                  <Button
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    className="h-[30px] rounded-full px-3 text-[13px] shadow-none data-[active=false]:shadow-control"
                    data-active={active}
                    aria-pressed={active}
                    onClick={() => pick(c)}
                  >
                    {c.name}
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="payer-name" className="text-[13px] font-medium">
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
      <div className="flex flex-col gap-2">
        <label htmlFor="payer-email" className="text-[13px] font-medium">
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
  const [today] = useState(todayKey)

  return (
    <div className="flex flex-col gap-5">
      <AmountField control={control} name="amountCents" id="request-amount" />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">How they'll pay</legend>
        {METHODS.map((m) => (
          <RadioCard key={m} {...register('method')} value={m}>
            <MethodOption method={m} />
            <span className="text-muted-foreground text-xs">No fee to receive</span>
          </RadioCard>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="request-due" className="text-[13px] font-medium">
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

      <MemoField
        id="request-memo"
        placeholder="e.g. Invoice INV-2041"
        registration={register('memo')}
        length={memo?.length ?? 0}
        error={formState.errors.memo?.message}
      />
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

  const rows: ReviewRow[] = [
    { label: 'Deposit to', value: to && accountLabel(to), step: 0 },
    { label: 'Payer', value: v.payerName, step: 1 },
    { label: 'Email', value: v.payerEmail, step: 1 },
    { label: 'Amount', value: <span className="tabular">{formatMoney(v.amountCents)}</span>, step: 2, strong: true },
    { label: 'Method', value: `${METHOD_LABEL[v.method]} · ${TRANSFER_ETA[v.method]}`, step: 2 },
    { label: 'Due', value: formatDayKey(v.dueDate), step: 2 },
    ...(v.memo ? [{ label: 'Memo', value: v.memo, step: 2 }] : []),
  ]

  return <ReviewList rows={rows} onEdit={onEdit} error={error} fallback="The request could not be sent." />
}
