import { useState } from 'react'
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { TRANSFER_ETA, TRANSFER_FEES, type TransferRequest, type TransferRequestOutput } from '@/api/schemas'
import type { Account, Recipient } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatMoney, parseMoney, type Cents } from '@/lib/money'
import { available, METHOD_LABEL } from './transfer'

export type TransferForm = UseFormReturn<TransferRequest, unknown, TransferRequestOutput>
interface StepProps {
  form: TransferForm
  accounts: Account[]
  recipients: Recipient[]
}

/** Integer-only cents → "1234.50" for pre-filling the amount input. */
function centsToInput(c: Cents) {
  return `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`
}

function RadioCard({ children, ...input }: React.ComponentProps<'input'> & { children: React.ReactNode }) {
  return (
    <label className="hover:bg-accent/50 has-[input:checked]:border-primary has-[input:checked]:bg-accent has-[input:focus-visible]:ring-ring/50 flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 text-sm transition-colors has-[input:focus-visible]:ring-[3px]">
      <input type="radio" className="sr-only" {...input} />
      {children}
    </label>
  )
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-destructive text-sm">
      {message}
    </p>
  )
}

export function FromStep({ form, accounts }: StepProps) {
  const { register, getValues, setValue, formState } = form
  const field = register('fromAccountId', {
    // Picking the account that was the destination would make the transfer invalid.
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (getValues('toAccountId') === e.target.value) setValue('toAccountId', undefined)
    },
  })
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Account to send from</legend>
      {accounts.map((a) => (
        <RadioCard key={a.id} {...field} value={a.id}>
          <span>
            <span className="font-medium">{a.name}</span> <span className="text-muted-foreground">••{a.mask}</span>
          </span>
          <span className="text-right">
            <span className="tabular block">{formatMoney(available(a))}</span>
            <span className="text-muted-foreground text-xs">available</span>
          </span>
        </RadioCard>
      ))}
      <FieldError message={formState.errors.fromAccountId?.message} />
    </fieldset>
  )
}

export function ToStep({ form, accounts, recipients }: StepProps) {
  const { control, setValue, getValues, clearErrors, formState } = form
  const [fromId, recipientId, toAccountId] = useWatch({ control, name: ['fromAccountId', 'recipientId', 'toAccountId'] })
  const selected = recipientId ? `r:${recipientId}` : toAccountId ? `a:${toAccountId}` : ''

  // Keep exactly one destination set, and a method the destination can actually receive.
  function choose(value: string) {
    const id = value.slice(2)
    if (value.startsWith('r:')) {
      const r = recipients.find((x) => x.id === id)!
      const current = getValues('method')
      setValue('recipientId', id)
      setValue('toAccountId', undefined)
      setValue('method', r.methods.find((m) => m === current) ?? r.methods[0])
    } else {
      setValue('toAccountId', id)
      setValue('recipientId', undefined)
      setValue('method', 'transfer')
    }
    clearErrors(['recipientId', 'toAccountId'])
  }

  const ownAccounts = accounts.filter((a) => a.id !== fromId)
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">Saved recipients</legend>
        {recipients.map((r) => (
          <RadioCard key={r.id} name="destination" value={`r:${r.id}`} checked={selected === `r:${r.id}`} onChange={() => choose(`r:${r.id}`)}>
            <span>
              <span className="block font-medium">{r.name}</span>
              <span className="text-muted-foreground text-xs">
                {r.bankName} ••{r.mask}
              </span>
            </span>
            <span className="text-muted-foreground text-xs">{r.methods.map((m) => METHOD_LABEL[m]).join(' · ')}</span>
          </RadioCard>
        ))}
      </fieldset>
      {ownAccounts.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">Your accounts</legend>
          {ownAccounts.map((a) => (
            <RadioCard key={a.id} name="destination" value={`a:${a.id}`} checked={selected === `a:${a.id}`} onChange={() => choose(`a:${a.id}`)}>
              <span>
                <span className="font-medium">{a.name}</span> <span className="text-muted-foreground">••{a.mask}</span>
              </span>
              <span className="tabular text-muted-foreground text-xs">{formatMoney(a.balanceCents)}</span>
            </RadioCard>
          ))}
        </fieldset>
      )}
      <FieldError message={formState.errors.recipientId?.message ?? formState.errors.toAccountId?.message} />
    </div>
  )
}

function AmountInput({
  value,
  onChange,
  onBlur,
  name,
  ref,
  invalid,
}: {
  value: number
  onChange: (cents: number) => void
  onBlur: () => void
  name: string
  ref: React.Ref<HTMLInputElement>
  invalid: boolean
}) {
  // Keep the raw text so partial input like "12." isn't reformatted while typing.
  const [text, setText] = useState(() => (Number.isFinite(value) ? centsToInput(value) : ''))
  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">$</span>
      <Input
        id="amount"
        ref={ref}
        name={name}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        className="tabular pl-7"
        value={text}
        aria-invalid={invalid}
        aria-describedby={invalid ? 'amount-error' : 'amount-help'}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parseMoney(e.target.value) ?? NaN)
        }}
        onBlur={onBlur}
      />
    </div>
  )
}

export function AmountStep({ form, accounts, recipients }: StepProps) {
  const { control, register, formState } = form
  const [fromId, recipientId, memo] = useWatch({ control, name: ['fromAccountId', 'recipientId', 'memo'] })
  const from = accounts.find((a) => a.id === fromId)
  const recipient = recipients.find((r) => r.id === recipientId)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="amount" className="text-sm font-medium">
          Amount
        </label>
        <Controller
          name="amountCents"
          control={control}
          render={({ field, fieldState }) => (
            <AmountInput
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              invalid={Boolean(fieldState.error)}
            />
          )}
        />
        <FieldError id="amount-error" message={formState.errors.amountCents?.message} />
        {from && (
          <p id="amount-help" className="text-muted-foreground text-xs">
            {formatMoney(available(from))} available in {from.name} ••{from.mask}
          </p>
        )}
      </div>

      {recipient ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Method</legend>
          {recipient.methods.map((m) => (
            <RadioCard key={m} {...register('method')} value={m}>
              <span>
                <span className="block font-medium">{METHOD_LABEL[m]}</span>
                <span className="text-muted-foreground text-xs">{TRANSFER_ETA[m]}</span>
              </span>
              <span className="tabular text-muted-foreground text-xs">
                {TRANSFER_FEES[m] ? `${formatMoney(TRANSFER_FEES[m])} fee` : 'No fee'}
              </span>
            </RadioCard>
          ))}
        </fieldset>
      ) : (
        <p className="text-muted-foreground rounded-lg border p-3 text-sm">
          Internal transfer · {TRANSFER_ETA.transfer} · no fee
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="transfer-memo" className="text-sm font-medium">
            Memo <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <span className="tabular text-muted-foreground text-xs">{memo?.length ?? 0}/140</span>
        </div>
        <Input id="transfer-memo" maxLength={140} placeholder="e.g. Invoice #1042" {...register('memo')} />
        <FieldError message={formState.errors.memo?.message} />
      </div>
    </div>
  )
}

export function ReviewStep({
  form,
  accounts,
  recipients,
  onEdit,
  error,
}: StepProps & { onEdit: (step: number) => void; error: Error | null }) {
  const v = useWatch({ control: form.control }) as TransferRequest
  const from = accounts.find((a) => a.id === v.fromAccountId)
  const toAccount = accounts.find((a) => a.id === v.toAccountId)
  const recipient = recipients.find((r) => r.id === v.recipientId)
  const fee = TRANSFER_FEES[v.method]
  const total = v.amountCents + fee

  const rows: { label: string; value: React.ReactNode; step?: number; strong?: boolean }[] = [
    { label: 'From', value: from && `${from.name} ••${from.mask}`, step: 0 },
    {
      label: 'To',
      value: recipient ? `${recipient.name} · ${recipient.bankName} ••${recipient.mask}` : toAccount && `${toAccount.name} ••${toAccount.mask}`,
      step: 1,
    },
    { label: 'Method', value: `${METHOD_LABEL[v.method]} · ${TRANSFER_ETA[v.method]}`, step: 2 },
    { label: 'Amount', value: <span className="tabular">{formatMoney(v.amountCents)}</span>, step: 2 },
    { label: 'Fee', value: <span className="tabular">{fee ? formatMoney(fee) : 'None'}</span> },
    { label: 'Total debit', value: <span className="tabular">{formatMoney(total)}</span>, strong: true },
    ...(v.memo ? [{ label: 'Memo', value: v.memo, step: 2 }] : []),
    ...(from ? [{ label: 'Available after', value: <span className="tabular">{formatMoney(available(from) - total)}</span> }] : []),
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
          {error.message || 'The transfer could not be sent.'} Please try again.
        </p>
      )}
    </div>
  )
}
