'use client'

import { cn } from '@fabrk/core'

export type StatusPulseStatus =
  | 'online'
  | 'syncing'
  | 'offline'
  | 'pending'
  | 'success'
  | 'warning'
  | 'error'

export interface StatusPulseProps {
  status: StatusPulseStatus
  className?: string
}

const statusStyles: Record<StatusPulseStatus, string> = {
  online: 'bg-success',
  syncing: 'bg-primary',
  offline: 'bg-muted-foreground',
  pending: 'bg-warning',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
}

const pulseStatuses = new Set<StatusPulseStatus>(['online', 'syncing'])

export function StatusPulse({ status, className }: StatusPulseProps) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2',
        statusStyles[status],
        pulseStatuses.has(status) && 'animate-pulse',
        className
      )}
      role="status"
      aria-label={status}
    />
  )
}
