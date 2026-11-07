import { useWatch, type UseFormReturn } from 'react-hook-form'
import { available, METHOD_LABEL, totalDebit, TRANSFER_ETA, TRANSFER_ETA_SHORT, TRANSFER_FEES, type TransferRequest, type TransferRequestOutput } from '@/api/schemas'
import type { Account, Recipient } from '@/api/types'
import { CounterpartyAvatar } from '@/components/shared/CounterpartyAvatar'
import { accountLabel } from '@/lib/account'
import { formatMoney } from '@/lib/money'
import { AccountName, AmountField, FieldError, MemoField, MethodOption, RadioCard, ReviewList, type ReviewRow } from './fields'

export type TransferForm = UseFormReturn<TransferRequest, unknown, TransferRequestOutput>
interface StepProps {
  form: TransferForm
  accounts: Account[]
  recipients: Recipient[]
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
          <AccountName account={a} />
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
              <AccountName account={a} />
              <span className="tabular text-muted-foreground text-xs">{formatMoney(a.balanceCents)}</span>
            </RadioCard>
          ))}
        </fieldset>
      )}
      <FieldError message={formState.errors.recipientId?.message ?? formState.errors.toAccountId?.message} />
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
      <AmountField
        control={control}
        name="amountCents"
        id="amount"
        help={from && `${formatMoney(available(from))} available in ${accountLabel(from)}`}
      />

      {recipient ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-medium">Method</legend>
          {recipient.methods.map((m) => (
            <RadioCard key={m} {...register('method')} value={m}>
              <MethodOption method={m} />
              <span className="tabular text-muted-foreground text-xs">
                {TRANSFER_FEES[m] ? `${formatMoney(TRANSFER_FEES[m])} fee` : 'No fee'}
              </span>
            </RadioCard>
          ))}
        </fieldset>
      ) : (
        <p className="text-muted-foreground shadow-ring rounded-xl px-4 py-3.5 text-sm">
          Internal transfer · {TRANSFER_ETA.transfer} · no fee
        </p>
      )}

      <MemoField
        id="transfer-memo"
        placeholder="e.g. Invoice #1042"
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
  recipients,
  onEdit,
  error,
}: StepProps & { onEdit: (step: number) => void; error: Error | null }) {
  const v = useWatch({ control: form.control }) as TransferRequest
  const from = accounts.find((a) => a.id === v.fromAccountId)
  const toAccount = accounts.find((a) => a.id === v.toAccountId)
  const recipient = recipients.find((r) => r.id === v.recipientId)
  const fee = TRANSFER_FEES[v.method]
  const total = totalDebit(v.amountCents, v.method)

  const rows: ReviewRow[] = [
    { label: 'From', value: from && accountLabel(from), step: 0 },
    {
      label: 'To',
      value: recipient ? `${recipient.name} · ${recipient.bankName} ••${recipient.mask}` : toAccount && accountLabel(toAccount),
      step: 1,
    },
    { label: 'Method', value: `${METHOD_LABEL[v.method]} · ${TRANSFER_ETA[v.method]}`, step: 2 },
    { label: 'Amount', value: formatMoney(v.amountCents), step: 2 },
    { label: 'Fee', value: fee ? formatMoney(fee) : 'None' },
    { label: 'Total debit', value: formatMoney(total), strong: true },
    ...(v.memo ? [{ label: 'Memo', value: v.memo, step: 2 }] : []),
    ...(from ? [{ label: 'Available after', value: formatMoney(available(from) - total) }] : []),
  ]

  const toName = recipient?.name ?? toAccount?.name ?? ''
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-primary/4 grid grid-cols-[auto_1fr] items-center gap-x-3.5 gap-y-2 rounded-[14px] p-4 sm:flex sm:p-5">
        <CounterpartyAvatar name={toName} size="lg" className="bg-card text-primary shadow-ring" />
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground truncate text-[13px]">{recipient ? `Sending to ${toName}` : `Moving to ${toName}`}</div>
          <div className="tabular text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">{formatMoney(total)}</div>
        </div>
        <span className="bg-card shadow-ring text-foreground/75 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap max-sm:col-start-2 max-sm:justify-self-start">
          {METHOD_LABEL[v.method]} · {TRANSFER_ETA_SHORT[v.method]}
        </span>
      </div>
      <ReviewList rows={rows} onEdit={onEdit} error={error} fallback="The transfer could not be sent." />
    </div>
  )
}
