/**
 * FABRK COMPONENT
 * StatsGrid - Responsive grid of stat items with optional change indicators
 *
 * @example
 * ```tsx
 * <StatsGrid
 *   items={[
 *     { label: "Files", value: 1572, icon: <FileIcon /> },
 *     { label: "Components", value: 279, change: "+12%", icon: <BoxIcon /> },
 *     { label: "API Routes", value: 46, icon: <RouteIcon /> },
 *     { label: "Complexity", value: "B+", icon: <GaugeIcon /> },
 *   ]}
 * />
 * ```
 */

'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

export interface StatsGridItem {
  label: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
}

export interface StatsGridProps {
  items: StatsGridItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

function formatValue(value: string | number): string {
  if (typeof value === 'string') return value;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function StatsGrid({ items, columns = 4, className }: StatsGridProps) {
  const colClass =
    columns === 2 ? 'grid-cols-2' :
    columns === 3 ? 'grid-cols-1 sm:grid-cols-3' :
    'grid-cols-2 md:grid-cols-4';

  return (
    <div className={cn('grid border-b', colClass, 'border-border', className)}>
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            'p-4 border-border',
            i < items.length - 1 && 'border-r',
          )}
        >
          {item.icon && (
            <div className="mb-2 text-muted-foreground">{item.icon}</div>
          )}
          <div className={cn('text-2xl font-bold tabular-nums', mode.font)}>
            {formatValue(item.value)}
          </div>
          <div className={cn('text-xs uppercase tracking-wider text-muted-foreground', mode.font)}>
            {item.label}
          </div>
          {item.change && (
            <div className={cn('text-xs text-success mt-1', mode.font)}>
              {item.change}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
