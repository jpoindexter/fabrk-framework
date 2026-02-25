'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export interface UsageBarProps {
  value: number
  max: number
  label: string
  variant?: 'default' | 'warning' | 'danger'
  showValue?: boolean
  className?: string
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function UsageBar({
  value,
  max,
  label,
  variant,
  showValue = true,
  className,
}: UsageBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0

  // Auto-detect variant if not provided
  const effectiveVariant =
    variant ?? (percentage >= 90 ? 'danger' : percentage >= 75 ? 'warning' : 'default')

  const barColor =
    effectiveVariant === 'danger'
      ? 'bg-destructive'
      : effectiveVariant === 'warning'
        ? 'bg-warning'
        : 'bg-primary'

  return (
    <div className={cn('space-y-[var(--grid-1)]', mode.font, className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        {showValue && (
          <span className="text-foreground">
            {formatNumber(value)} / {formatNumber(max)}
          </span>
        )}
      </div>
      <div className={cn('h-[var(--grid-2)] w-full bg-muted', mode.radius)}>
        <div
          className={cn('h-full transition-all duration-300', mode.radius, barColor)}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  )
}

export interface UsageStatsGridProps {
  stats: UsageBarProps[]
  columns?: 1 | 2 | 3
  className?: string
}

export function UsageStatsGrid({
  stats,
  columns = 2,
  className,
}: UsageStatsGridProps) {
  const gridCols =
    columns === 3
      ? 'md:grid-cols-3'
      : columns === 2
        ? 'md:grid-cols-2'
        : 'grid-cols-1'

  return (
    <div className={cn('grid gap-[var(--grid-4)]', gridCols, className)}>
      {stats.map((stat, i) => (
        <UsageBar key={i} {...stat} />
      ))}
    </div>
  )
}
