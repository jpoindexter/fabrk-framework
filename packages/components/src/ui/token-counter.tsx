'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export interface TokenCounterProps {
  value: number
  max: number
  label?: string
  variant?: 'compact' | 'default' | 'detailed'
  className?: string
}

export function TokenCounter({
  value,
  max,
  label = 'Tokens',
  variant = 'default',
  className,
}: TokenCounterProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0
  const isOverLimit = value > max
  const colorClass = isOverLimit
    ? 'text-destructive'
    : percentage > 90
      ? 'text-warning'
      : 'text-foreground'

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-[0.5ch] border border-border px-[1ch] py-[var(--grid-1)] text-xs',
          mode.radius,
          mode.font,
          colorClass,
          className
        )}
      >
        {value.toLocaleString()}/{max.toLocaleString()}
      </span>
    )
  }

  if (variant === 'detailed') {
    const segments = 20
    const filledSegments = Math.min(segments, Math.round((percentage / 100) * segments))

    return (
      <div className={cn('space-y-[var(--grid-2)]', mode.font, className)}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className={colorClass}>
            {value.toLocaleString()}/{max.toLocaleString()} ({Math.round(percentage)}%)
          </span>
        </div>
        <div className="flex gap-px">
          {Array.from({ length: segments }, (_, i) => (
            <div
              key={i}
              className={cn(
                'h-[var(--grid-2)] flex-1',
                i < filledSegments
                  ? isOverLimit
                    ? 'bg-destructive'
                    : percentage > 90
                      ? 'bg-warning'
                      : 'bg-primary'
                  : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border border-border p-[var(--grid-4)]',
        mode.radius,
        mode.font,
        className
      )}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={colorClass}>
          {value.toLocaleString()}/{max.toLocaleString()}
        </span>
      </div>
      <div className={cn('mt-[var(--grid-2)] h-[var(--grid-1)] w-full bg-muted', mode.radius)}>
        <div
          className={cn(
            'h-full transition-all duration-300',
            mode.radius,
            isOverLimit ? 'bg-destructive' : percentage > 90 ? 'bg-warning' : 'bg-primary'
          )}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  )
}

export interface TokenCounterGroupProps {
  counters: Array<Omit<TokenCounterProps, 'variant'>>
  variant?: TokenCounterProps['variant']
  className?: string
}

export function TokenCounterGroup({
  counters,
  variant = 'default',
  className,
}: TokenCounterGroupProps) {
  return (
    <div className={cn('space-y-[var(--grid-4)]', className)}>
      {counters.map((counter, i) => (
        <TokenCounter key={i} {...counter} variant={variant} />
      ))}
    </div>
  )
}
