'use client'

import { cn } from '../lib/utils'
import { mode } from '@fabrk/design-system'

export interface SegmentedControlOption<T extends string = string> {
  value: T
  label: string
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'text-xs px-[1ch] py-[var(--grid-1)]',
  md: 'text-sm px-[2ch] py-[var(--grid-2)]',
  lg: 'text-base px-[3ch] py-[var(--grid-3)]',
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex border border-border',
        mode.radius,
        mode.font,
        className
      )}
      role="radiogroup"
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'transition-colors',
              sizeClasses[size],
              isActive
                ? 'bg-foreground text-background'
                : 'bg-background text-muted-foreground hover:text-foreground',
              option.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
