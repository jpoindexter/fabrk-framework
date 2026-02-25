/**
 * SegmentedControl - Inline radio group rendered as a row of toggle buttons.
 * Supports generic string union types for type-safe value selection.
 *
 * @example
 * ```tsx
 * <SegmentedControl
 *   options={[
 *     { value: 'day', label: 'DAY' },
 *     { value: 'week', label: 'WEEK' },
 *     { value: 'month', label: 'MONTH' },
 *   ]}
 *   value={period}
 *   onChange={setPeriod}
 * />
 * ```
 */

'use client'

import * as React from 'react'
import { cn } from '@fabrk/core'
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
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledIndices = options.reduce<number[]>((acc, opt, i) => {
      if (!opt.disabled) acc.push(i)
      return acc
    }, [])
    if (enabledIndices.length === 0) return

    const currentPos = enabledIndices.indexOf(index)
    let nextIndex = index

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault()
        const nextPos = currentPos >= 0 ? (currentPos + 1) % enabledIndices.length : 0
        nextIndex = enabledIndices[nextPos]
        break
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault()
        const prevPos = currentPos >= 0 ? (currentPos - 1 + enabledIndices.length) % enabledIndices.length : 0
        nextIndex = enabledIndices[prevPos]
        break
      }
      case 'Home':
        e.preventDefault()
        nextIndex = enabledIndices[0]
        break
      case 'End':
        e.preventDefault()
        nextIndex = enabledIndices[enabledIndices.length - 1]
        break
      case ' ':
      case 'Enter':
        e.preventDefault()
        onChange(options[index].value)
        return
      default:
        return
    }
    onChange(options[nextIndex].value)
    const group = (e.currentTarget as HTMLElement).parentElement
    const buttons = group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    buttons?.[nextIndex]?.focus()
  }

  const activeIndex = options.findIndex((o) => o.value === value)

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
      {options.map((option, index) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={option.disabled}
            tabIndex={isActive || (activeIndex === -1 && index === 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
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
