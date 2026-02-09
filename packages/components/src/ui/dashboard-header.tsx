/**
 * FABRK COMPONENT
 * DashboardHeader - Page header with title, subtitle, and action buttons
 *
 * @example
 * ```tsx
 * <DashboardHeader
 *   title="Repositories"
 *   subtitle="3 connected"
 *   actions={
 *     <Button size="sm">
 *       <Plus className="size-4 mr-1" /> > CONNECT REPO
 *     </Button>
 *   }
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

export interface DashboardHeaderProps {
  title: string;
  code?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function DashboardHeader({
  title,
  code,
  subtitle,
  actions,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between border-b border-border p-4',
        className,
      )}
    >
      <div>
        <h1 className={cn('text-lg font-bold uppercase tracking-wider', mode.font)}>
          {code ? `[ [${code}] ${title} ]` : title}
        </h1>
        {subtitle && (
          <p className={cn('text-xs text-muted-foreground mt-1', mode.font)}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
