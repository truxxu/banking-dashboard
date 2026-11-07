import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { qk, useCreatePaymentRequest } from '@/api/queries'
import { paymentRequestSchema, type PaymentRequestInput } from '@/api/schemas'
import type { Account, Customer, PaymentRequest } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Stepper } from '@/features/payments/Stepper'
import { DAY_MS, dayKey } from '@/lib/date'
import { formatMoney } from '@/lib/money'
import { DepositStep, DetailsStep, PayerStep, ReviewStep, type RequestForm } from './steps'
import { RequestSuccess } from './RequestSuccess'

const STEPS = [
  { label: 'Deposit to', title: 'Deposit to', description: 'Choose the account the money lands in.' },
  { label: 'Payer', title: 'Who is paying?', description: 'Pick a saved customer or enter their details.' },
  { label: 'Details', title: 'Amount and terms', description: 'How much, how they pay, and when it is due.' },
  { label: 'Review', title: 'Review and send', description: 'Check the details before you send the request.' },
] as const

const defaults = (): PaymentRequestInput => ({
  toAccountId: '',
  payerName: '',
  payerEmail: '',
  amountCents: NaN,
  method: 'ach',
  dueDate: dayKey(new Date(Date.now() + 14 * DAY_MS)),
  memo: '',
})

/** Which step owns each field, for jumping back when final validation fails. */
function stepForErrors(errors: FieldErrors<PaymentRequestInput>) {
  if (errors.toAccountId) return 0
  if (errors.payerName || errors.payerEmail) return 1
  return 2
}

export function RequestFlow({ accounts, customers }: { accounts: Account[]; customers: Customer[] }) {
  const form: RequestForm = useForm({
    resolver: zodResolver(paymentRequestSchema),
    mode: 'onTouched',
    defaultValues: defaults(),
  })
  const create = useCreatePaymentRequest()
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [created, setCreated] = useState<PaymentRequest | null>(null)
  const amountCents = useWatch({ control: form.control, name: 'amountCents' })

  // Move focus to the new heading after user-driven step changes (not on first mount).
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusHeading = useRef(false)
  useEffect(() => {
    if (!focusHeading.current) return
    focusHeading.current = false
    headingRef.current?.focus()
  }, [step, created])

  function goTo(n: number) {
    focusHeading.current = true
    create.reset()
    setStep(n)
  }

  async function next() {
    const fields = (
      [['toAccountId'], ['payerName', 'payerEmail'], ['amountCents', 'method', 'dueDate', 'memo']] as const
    )[step]
    if (fields && (await form.trigger([...fields], { shouldFocus: true }))) goTo(step + 1)
  }

  // Built inside the event handler (not during render) so the ref writes stay out of render.
  function send(e: React.FormEvent<HTMLFormElement>) {
    return form.handleSubmit(
      (values) =>
        create.mutate(values, {
          onSuccess: (req) => {
            qc.setQueryData<PaymentRequest[]>(qk.paymentRequests, (old) => (old ? [req, ...old.filter((r) => r.id !== req.id)] : old))
            focusHeading.current = true
            setCreated(req)
          },
        }),
      (errors) => goTo(stepForErrors(errors)),
    )(e)
  }

  function startOver() {
    form.reset(defaults())
    create.reset()
    setCreated(null)
    focusHeading.current = true
    setStep(0)
  }

  if (created) return <RequestSuccess created={created} accounts={accounts} onReset={startOver} headingRef={headingRef} />

  const { title, description } = STEPS[step]
  const props = { form, accounts, customers }

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
      <Stepper steps={STEPS.map((s) => s.label)} current={step} label="Request progress" />
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {step === 0 && <DepositStep {...props} />}
      {step === 1 && <PayerStep {...props} />}
      {step === 2 && <DetailsStep {...props} />}
      {step === 3 && <ReviewStep {...props} onEdit={goTo} error={create.error} />}

      <div className="flex justify-between gap-2">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => goTo(step - 1)} disabled={create.isPending}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={create.isPending}>
          {step < STEPS.length - 1
            ? 'Continue'
            : create.isPending
              ? 'Sending…'
              : `Request ${Number.isFinite(amountCents) ? formatMoney(amountCents) : ''}`.trim()}
        </Button>
      </div>
    </form>
  )
}
