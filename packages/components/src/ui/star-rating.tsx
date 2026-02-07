'use client'

import { useState } from 'react'
import { cn } from '../lib/utils'
import { mode } from '@fabrk/design-system'

export interface StarRatingProps {
  value: number
  max?: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'text-sm gap-[0.25ch]',
  md: 'text-lg gap-[0.5ch]',
  lg: 'text-2xl gap-[0.5ch]',
}

export function StarRating({
  value,
  max = 5,
  onChange,
  readonly = false,
  size = 'md',
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const displayValue = hovered ?? value

  return (
    <div
      className={cn('inline-flex items-center', sizeClasses[size], mode.font, className)}
      role="radiogroup"
      aria-label="Rating"
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1
        const isFilled = starValue <= displayValue

        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={starValue <= value}
            aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
            disabled={readonly}
            className={cn(
              'transition-colors',
              isFilled ? 'text-warning' : 'text-muted-foreground/30',
              !readonly && 'cursor-pointer hover:scale-110'
            )}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !readonly && setHovered(starValue)}
            onMouseLeave={() => !readonly && setHovered(null)}
          >
            {'\u2605'}
          </button>
        )
      })}
    </div>
  )
}
