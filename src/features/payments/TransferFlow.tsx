import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { qk, useCreateTransfer } from '@/api/queries'
import { available, totalDebit, TRANSFER_FEES, transferRequestSchema, type TransferRequest } from '@/api/schemas'
import type { Account, Recipient, Transaction } from '@/api/types'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/money'
import { AmountStep, FromStep, ReviewStep, ToStep, type TransferForm } from './steps'
import { Stepper } from './Stepper'
import { TransferSuccess } from './TransferSuccess'
import { stepForErrors, useStepFlow } from './useStepFlow'

const STEPS = [
  { label: 'From', title: 'Send from', description: 'Choose the account the money leaves.' },
  { label: 'To', title: 'Send to', description: 'Pay a saved recipient or move money to one of your accounts.' },
  { label: 'Amount', title: 'Amount and method', description: 'How much, and how it should arrive.' },
  { label: 'Review', title: 'Review and send', description: 'Check the details before you send.' },
] as const

const DEFAULTS: TransferRequest = {
  fromAccountId: '',
  recipientId: undefined,
  toAccountId: undefined,
  amountCents: NaN,
  method: 'ach',
  memo: '',
}

/** Fields each step edits (Review edits none). */
const STEP_FIELDS = [['fromAccountId'], ['recipientId', 'toAccountId'], ['amountCents', 'method', 'memo']] as const

export function TransferFlow({ accounts, recipients }: { accounts: Account[]; recipients: Recipient[] }) {
  const form: TransferForm = useForm({
    resolver: zodResolver(transferRequestSchema),
    mode: 'onTouched',
    defaultValues: DEFAULTS,
  })
  const transfer = useCreateTransfer()
  const qc = useQueryClient()
  const { step, goTo, headingRef, focusHeading } = useStepFlow({ onStepChange: transfer.reset })
  const [created, setCreated] = useState<Transaction | null>(null)
  const [amountCents, method] = useWatch({ control: form.control, name: ['amountCents', 'method'] })

  async function next() {
    if (step === 0) {
      if (await form.trigger(STEP_FIELDS[0], { shouldFocus: true })) goTo(1)
    } else if (step === 1) {
      // Checked by hand: zod skips the schema's destination refine while amountCents is still invalid.
      const { recipientId, toAccountId } = form.getValues()
      if (!recipientId && !toAccountId) form.setError('recipientId', { message: 'Choose who to pay' })
      else goTo(2)
    } else if (step === 2) {
      if (!(await form.trigger([...STEP_FIELDS[2]], { shouldFocus: true }))) return
      const { fromAccountId, amountCents, method } = form.getValues()
      const from = accounts.find((a) => a.id === fromAccountId)!
      const fee = TRANSFER_FEES[method]
      if (totalDebit(amountCents, method) > available(from)) {
        form.setError(
          'amountCents',
          {
            message: `That's more than the ${formatMoney(available(from))} available in ${from.name}${fee ? `, including the ${formatMoney(fee)} fee` : ''}.`,
          },
          { shouldFocus: true },
        )
        return
      }
      goTo(3)
    }
  }

  function send(e: React.FormEvent<HTMLFormElement>) {
    return form.handleSubmit(
      (values) =>
        transfer.mutate(values, {
          onSuccess: (tx) => {
            qc.setQueryData(qk.transaction(tx.id), tx)
            focusHeading()
            setCreated(tx)
          },
        }),
      (errors) => goTo(stepForErrors(STEP_FIELDS, errors)),
    )(e)
  }

  function startOver() {
    form.reset(DEFAULTS)
    setCreated(null)
    goTo(0)
  }

  if (created) return <TransferSuccess created={created} onReset={startOver} headingRef={headingRef} />

  const { title, description } = STEPS[step]
  const total = Number.isFinite(amountCents) ? totalDebit(amountCents, method) : null
  const props = { form, accounts, recipients }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        if (step === STEPS.length - 1) return void send(e)
        e.preventDefault()
        void next()
      }}
    >
      <Stepper steps={STEPS.map((s) => s.label)} current={step} />
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {step === 0 && <FromStep {...props} />}
      {step === 1 && <ToStep {...props} />}
      {step === 2 && <AmountStep {...props} />}
      {step === 3 && <ReviewStep {...props} onEdit={goTo} error={transfer.error} />}

      <div className="flex justify-between gap-2">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => goTo(step - 1)} disabled={transfer.isPending}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={transfer.isPending}>
          {step < STEPS.length - 1
            ? 'Continue'
            : transfer.isPending
              ? 'Sending…'
              : `Send ${total !== null ? formatMoney(total) : ''}`.trim()}
        </Button>
      </div>
    </form>
  )
}
