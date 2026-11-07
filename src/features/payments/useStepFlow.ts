import { useEffect, useRef, useState } from 'react'
import type { FieldErrors, FieldValues, Path } from 'react-hook-form'

/**
 * Step state for the multi-step send/request flows. Focus moves to the step heading after
 * user-driven step changes (not on first mount); call `focusHeading()` before other changes
 * that swap the heading, e.g. showing the success view.
 */
export function useStepFlow({ onStepChange }: { onStepChange?: () => void } = {}) {
  const [step, setStep] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef(false)
  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    headingRef.current?.focus()
  })

  const focusHeading = () => {
    pendingFocus.current = true
  }
  const goTo = (n: number) => {
    focusHeading()
    onStepChange?.()
    setStep(n)
  }
  return { step, goTo, headingRef, focusHeading }
}

/** The first step owning a field with an error, for jumping back when final validation fails. */
export function stepForErrors<T extends FieldValues>(stepFields: readonly (readonly Path<T>[])[], errors: FieldErrors<T>) {
  const i = stepFields.findIndex((fields) => fields.some((f) => f in errors))
  return i === -1 ? stepFields.length - 1 : i
}
