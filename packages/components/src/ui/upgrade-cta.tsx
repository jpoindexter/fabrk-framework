'use client'

import { cn } from '../lib/utils'
import { mode } from '@fabrk/design-system'

export interface UpgradeCTAProps {
  hiddenCount: number
  totalCount?: number
  contentType: string
  variant?: 'inline' | 'card' | 'banner'
  upgradeText?: string
  onUpgrade?: () => void
  upgradeHref?: string
  linkComponent?: React.ComponentType<{ href: string; children: React.ReactNode; className?: string }>
  className?: string
}

function DefaultLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} className={className}>{children}</a>
}

export function UpgradeCTA({
  hiddenCount,
  contentType,
  variant = 'card',
  upgradeText,
  onUpgrade,
  upgradeHref = '/pricing',
  linkComponent: LinkComp = DefaultLink,
  className,
}: UpgradeCTAProps) {
  if (hiddenCount <= 0) return null

  const displayType = contentType
  const text = upgradeText ?? `Unlock ${hiddenCount}+ more ${displayType}`

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center justify-between border-t border-border bg-muted px-[2ch] py-[var(--grid-4)]',
          mode.font,
          className
        )}
      >
        <span className="text-sm text-muted-foreground">
          +{hiddenCount} more {displayType} available with Pro
        </span>
        {onUpgrade ? (
          <button
            type="button"
            onClick={onUpgrade}
            className={cn(
              'border border-border bg-background px-[2ch] py-[var(--grid-1)] text-xs text-foreground transition-colors hover:bg-muted',
              mode.radius
            )}
          >
            {'> UPGRADE'}
          </button>
        ) : (
          <LinkComp
            href={upgradeHref}
            className={cn(
              'border border-border bg-background px-[2ch] py-[var(--grid-1)] text-xs text-foreground transition-colors hover:bg-muted',
              mode.radius
            )}
          >
            {'> UPGRADE'}
          </LinkComp>
        )}
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-[var(--grid-4)] bg-primary px-[2ch] py-[var(--grid-4)] text-primary-foreground',
          mode.radius,
          mode.font,
          className
        )}
      >
        <span className="text-sm font-medium">{text}</span>
        {onUpgrade ? (
          <button
            type="button"
            onClick={onUpgrade}
            className={cn(
              'bg-background px-[2ch] py-[var(--grid-1)] text-xs text-foreground',
              mode.radius
            )}
          >
            {'> UPGRADE TO PRO'}
          </button>
        ) : (
          <LinkComp
            href={upgradeHref}
            className={cn(
              'bg-background px-[2ch] py-[var(--grid-1)] text-xs text-foreground',
              mode.radius
            )}
          >
            {'> UPGRADE TO PRO'}
          </LinkComp>
        )}
      </div>
    )
  }

  // Card variant (default)
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center border border-dashed border-border py-[var(--grid-12)] text-center',
        mode.radius,
        mode.font,
        className
      )}
    >
      <h3 className="mb-[var(--grid-2)] text-sm font-semibold text-foreground">
        {hiddenCount}+ MORE {displayType.toUpperCase()}
      </h3>
      <p className="mb-[var(--grid-4)] text-xs text-muted-foreground">
        {upgradeText ?? `Upgrade to Pro for unlimited access to all ${displayType}.`}
      </p>
      {onUpgrade ? (
        <button
          type="button"
          onClick={onUpgrade}
          className={cn(
            'bg-primary px-[3ch] py-[var(--grid-2)] text-xs text-primary-foreground transition-colors hover:bg-primary/90',
            mode.radius
          )}
        >
          {'> UPGRADE TO PRO'}
        </button>
      ) : (
        <LinkComp
          href={upgradeHref}
          className={cn(
            'bg-primary px-[3ch] py-[var(--grid-2)] text-xs text-primary-foreground transition-colors hover:bg-primary/90',
            mode.radius
          )}
        >
          {'> UPGRADE TO PRO'}
        </LinkComp>
      )}
    </div>
  )
}

export interface ContentLimitBadgeProps {
  visibleCount: number
  totalCount: number
  onUpgrade?: () => void
  upgradeHref?: string
  linkComponent?: React.ComponentType<{ href: string; children: React.ReactNode; className?: string }>
  className?: string
}

export function ContentLimitBadge({
  visibleCount,
  totalCount,
  onUpgrade,
  upgradeHref = '/pricing',
  linkComponent: LinkComp = DefaultLink,
  className,
}: ContentLimitBadgeProps) {
  if (visibleCount >= totalCount) return null

  const locked = totalCount - visibleCount

  const inner = (
    <>
      <span className="text-xs">{locked} locked</span>
    </>
  )

  const classes = cn(
    'inline-flex items-center gap-[var(--grid-1)] bg-muted px-[1ch] py-[var(--grid-1)] text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground',
    mode.radius,
    mode.font,
    className
  )

  if (onUpgrade) {
    return (
      <button type="button" onClick={onUpgrade} className={classes}>
        {inner}
      </button>
    )
  }

  return (
    <LinkComp href={upgradeHref} className={classes}>
      {inner}
    </LinkComp>
  )
}
