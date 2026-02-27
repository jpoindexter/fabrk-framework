'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export interface ChartCardProps {
  title: string;
  description?: string;
  code?: string;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  cardClassName?: string;
  children: React.ReactNode;
}

/** Terminal-style card wrapper shared across chart card variants. */
export function ChartCard({
  title,
  description,
  code = '0x00',
  icon,
  headerActions,
  cardClassName,
  children,
}: ChartCardProps) {
  return (
    <div className={cn('border-border bg-card border', mode.radius, cardClassName)}>
      <div className="border-border flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          {icon}
          <div>
            <span className={cn('text-muted-foreground text-xs', mode.font)}>
              [{code}] {title.toUpperCase()}
            </span>
            {description && (
              <p className={cn('text-muted-foreground mt-0.5 text-xs', mode.font)}>{description}</p>
            )}
          </div>
        </div>
        {headerActions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
