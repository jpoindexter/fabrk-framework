/**
 * StarRating - Interactive or read-only star rating component.
 * Supports hover preview, configurable max stars, and three size variants.
 *
 * @example
 * ```tsx
 * <StarRating value={4} max={5} onChange={(rating) => save(rating)} />
 * <StarRating value={3.5} readonly size="lg" />
 * ```
 */

'use client'

import { useState } from 'react'
import { cn } from '@fabrk/core'
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
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const displayValue = hovered ?? value

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (readonly) return
    let next = index
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        next = index < max - 1 ? index + 1 : 0
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        next = index > 0 ? index - 1 : max - 1
        break
      case 'Home':
        e.preventDefault()
        next = 0
        break
      case 'End':
        e.preventDefault()
        next = max - 1
        break
      case ' ':
      case 'Enter':
        e.preventDefault()
        onChange?.(index + 1)
        return
      default:
        return
    }
    setFocusedIndex(next)
    const group = (e.currentTarget as HTMLElement).parentElement
    const buttons = group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    buttons?.[next]?.focus()
  }

  const activeIndex = value > 0 ? value - 1 : 0

  return (
    <div
      className={cn('inline-flex items-center', sizeClasses[size], mode.font, className)}
      role="radiogroup"
      aria-label="Rating"
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1
        const isFilled = starValue <= displayValue
        const isFocusTarget = focusedIndex !== null ? i === focusedIndex : i === activeIndex

        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={starValue <= value}
            aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
            disabled={readonly}
            tabIndex={readonly ? -1 : isFocusTarget ? 0 : -1}
            className={cn(
              'transition-colors',
              isFilled ? 'text-warning' : 'text-muted-foreground/30',
              !readonly && 'cursor-pointer hover:scale-110'
            )}
            onClick={() => onChange?.(starValue)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex(null)}
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
