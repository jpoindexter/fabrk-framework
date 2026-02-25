'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export interface ASCIIProgressBarProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  labelPosition?: 'left' | 'right'
  className?: string
}

const sizeClasses = {
  sm: 'w-[10ch]',
  md: 'w-[20ch]',
  lg: 'w-[30ch]',
}

const BLOCK = '\u2588'
const BLOCKS = BLOCK.repeat(30)

export function ASCIIProgressBar({
  value,
  max = 100,
  size = 'md',
  label,
  labelPosition = 'right',
  className,
}: ASCIIProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div
      className={cn('inline-flex items-center gap-[1ch]', mode.font, className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      {label && labelPosition === 'left' && (
        <span className="text-muted-foreground text-xs">{label}</span>
      )}
      <div className={cn('relative overflow-hidden', sizeClasses[size])}>
        <span className="text-muted-foreground/30 select-none">{BLOCKS}</span>
        <span
          className="absolute top-0 left-0 overflow-hidden text-foreground select-none"
          style={{ width: `${percentage}%` }}
        >
          {BLOCKS}
        </span>
      </div>
      {label && labelPosition === 'right' && (
        <span className="text-muted-foreground text-xs">{label}</span>
      )}
    </div>
  )
}
