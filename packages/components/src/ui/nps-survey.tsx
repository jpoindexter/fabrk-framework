'use client'

import { useState } from 'react'
import { cn } from '../lib/utils'
import { mode } from '@fabrk/design-system'

export interface NPSSurveyProps {
  onSubmit: (score: number, feedback?: string) => void | Promise<void>
  onDismiss?: () => void
  title?: string
  className?: string
}

export function NPSSurvey({
  onSubmit,
  onDismiss,
  title = 'How likely are you to recommend us?',
  className,
}: NPSSurveyProps) {
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (score === null) return
    await onSubmit(score, feedback || undefined)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div
        className={cn(
          'border border-border p-[var(--grid-8)] text-center',
          mode.radius,
          mode.font,
          className
        )}
      >
        <p className="text-sm text-foreground">THANK YOU FOR YOUR FEEDBACK</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'space-y-[var(--grid-4)] border border-border p-[var(--grid-6)]',
        mode.radius,
        mode.font,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground text-xs hover:text-foreground"
          >
            DISMISS
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-[var(--grid-1)]">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setScore(i)}
            className={cn(
              'flex h-8 w-8 items-center justify-center border text-xs transition-colors',
              mode.radius,
              i === score
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary'
            )}
          >
            {i}
          </button>
        ))}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>NOT LIKELY</span>
        <span>VERY LIKELY</span>
      </div>

      {score !== null && (
        <div className="space-y-[var(--grid-4)]">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Any additional feedback? (optional)"
            className={cn(
              'w-full resize-none border border-border bg-background p-[var(--grid-4)] text-sm text-foreground placeholder:text-muted-foreground',
              mode.radius
            )}
            rows={3}
          />
          <button
            type="button"
            onClick={handleSubmit}
            className={cn(
              'w-full bg-primary px-[2ch] py-[var(--grid-2)] text-sm text-primary-foreground transition-colors hover:bg-primary/90',
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
