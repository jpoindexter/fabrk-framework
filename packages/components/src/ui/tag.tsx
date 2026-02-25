'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export interface TagProps {
  children: React.ReactNode
  variant?: 'default' | 'muted'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  onRemove?: () => void
  className?: string
}

const sizeClasses = {
  xs: 'text-[0.625rem] px-[0.5ch] py-0',
  sm: 'text-xs px-[1ch] py-[var(--grid-1)]',
  md: 'text-sm px-[1.5ch] py-[var(--grid-1)]',
  lg: 'text-base px-[2ch] py-[var(--grid-2)]',
}

export function Tag({
  children,
  variant = 'default',
  size = 'sm',
  onRemove,
  className,
}: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[0.5ch] border font-medium',
        mode.radius,
        mode.font,
        sizeClasses[size],
        variant === 'default'
          ? 'border-border bg-background text-foreground'
          : 'border-transparent bg-muted text-muted-foreground',
        className
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'inline-flex items-center justify-center opacity-60 transition-opacity hover:opacity-100',
            'hover:text-destructive'
          )}
          aria-label="Remove"
        >
          x
        </button>
      )}
    </span>
  )
}

export interface TagGroupProps {
  children: React.ReactNode
  className?: string
}

export function TagGroup({ children, className }: TagGroupProps) {
  return (
    <div className={cn('flex flex-wrap gap-[var(--grid-2)]', className)}>
      {children}
    </div>
  )
}
