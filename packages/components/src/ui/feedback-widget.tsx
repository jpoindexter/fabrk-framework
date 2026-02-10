/**
 * FeedbackWidget - Floating feedback button that expands into a categorized feedback form.
 * Supports bug reports, feature requests, improvements, and general feedback with optional email.
 *
 * @param position - Screen corner placement: "bottom-right" (default) or "bottom-left"
 *
 * @example
 * ```tsx
 * <FeedbackWidget
 *   onSubmit={({ type, message, email }) => submitFeedback(type, message, email)}
 *   position="bottom-right"
 * />
 * ```
 */

'use client'

import { useState } from 'react'
import { cn } from '../lib/utils'
import { mode } from '@fabrk/design-system'

export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other'

export interface FeedbackWidgetProps {
  onSubmit: (data: {
    type: FeedbackType
    message: string
    email?: string
  }) => void | Promise<void>
  position?: 'bottom-right' | 'bottom-left'
  triggerLabel?: string
  className?: string
}

const feedbackTypes: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: '[BUG]' },
  { value: 'feature', label: '[FEATURE]' },
  { value: 'improvement', label: '[IMPROVE]' },
  { value: 'other', label: '[OTHER]' },
]

export function FeedbackWidget({
  onSubmit,
  position = 'bottom-right',
  triggerLabel = '> FEEDBACK',
  className,
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('improvement')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const positionClasses =
    position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'

  const handleSubmit = async () => {
    if (!message.trim()) return
    await onSubmit({ type, message, email: email || undefined })
    setSubmitted(true)
    setTimeout(() => {
      setIsOpen(false)
      setSubmitted(false)
      setMessage('')
      setEmail('')
    }, 2000)
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-50 border border-border bg-background px-[2ch] py-[var(--grid-2)] text-xs text-foreground shadow-md transition-colors hover:bg-muted',
          mode.radius,
          mode.font,
          positionClasses,
          className
        )}
      >
        {triggerLabel}
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-label="Send feedback"
      className={cn(
        'fixed z-50 w-80 border border-border bg-background shadow-lg',
        mode.radius,
        mode.font,
        positionClasses,
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border p-[var(--grid-4)]">
        <span className="text-xs font-medium">[ SEND FEEDBACK ]</span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Close feedback"
          className="text-muted-foreground text-xs hover:text-foreground"
        >
          x
        </button>
      </div>

      {submitted ? (
        <div className="p-[var(--grid-8)] text-center text-xs text-success">
          FEEDBACK SUBMITTED. THANK YOU.
        </div>
      ) : (
        <div className="space-y-[var(--grid-4)] p-[var(--grid-4)]">
          <div className="flex gap-[var(--grid-2)]" role="radiogroup" aria-label="Feedback type">
            {feedbackTypes.map((ft) => (
              <button
                key={ft.value}
                type="button"
                role="radio"
                aria-checked={type === ft.value}
                onClick={() => setType(ft.value)}
                className={cn(
                  'border px-[1ch] py-[var(--grid-1)] text-xs transition-colors',
                  mode.radius,
                  type === ft.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {ft.label}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your feedback..."
            className={cn(
              'w-full resize-none border border-border bg-background p-[var(--grid-4)] text-xs text-foreground placeholder:text-muted-foreground',
              mode.radius
            )}
            rows={4}
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            className={cn(
              'w-full border border-border bg-background px-[var(--grid-4)] py-[var(--grid-2)] text-xs text-foreground placeholder:text-muted-foreground',
              mode.radius
            )}
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim()}
            className={cn(
              'w-full bg-primary px-[2ch] py-[var(--grid-2)] text-xs text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50',
              mode.radius
            )}
          >
            {'> SUBMIT'}
          </button>
        </div>
      )}
    </div>
  )
}
