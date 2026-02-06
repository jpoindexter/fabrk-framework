/**
 * ✅ FABRK COMPONENT
 * KPI Card - Key Performance Indicator card with optional trend
 *
 * @example
 * ```tsx
 * <KpiCard title="Revenue" value="$45,231" change={12} trend="up" />
 * ```
 */

'use client';

import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import * as React from 'react';
import { Card, CardHeader, CardContent } from './card';

export interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  icon?: React.ReactNode;
}

const KpiCard = React.forwardRef<HTMLDivElement, KpiCardProps>(
  ({ title, value, change, trend, subtitle, icon, className, ...props }, ref) => {
    const getTrendIcon = () => {
      switch (trend) {
        case 'up':
          return <ArrowUp className="size-3" />;
        case 'down':
          return <ArrowDown className="size-3" />;
        case 'neutral':
          return <Minus className="size-3" />;
        default:
          return null;
      }
    };

    const getTrendColor = () => {
      switch (trend) {
        case 'up':
          return mode.color.text.success;
        case 'down':
          return mode.color.text.danger;
        case 'neutral':
          return mode.color.text.muted;
        default:
          return '';
      }
    };

    return (
      <Card data-slot="kpi-card" ref={ref} className={cn(className)} {...props}>
        <CardHeader title={title} icon={icon} />
        <CardContent padding="md">
          <div className={cn('text-2xl font-semibold', mode.font)}>{value}</div>
          {(change !== undefined || subtitle) && (
            <div className={cn('flex items-center gap-2 text-xs', mode.font)}>
              {change !== undefined && (
                <span className={cn('flex items-center gap-1 font-medium', getTrendColor())}>
                  {getTrendIcon()}
                  {Math.abs(change)}%
                </span>
              )}
              {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);
KpiCard.displayName = 'KpiCard';

export { KpiCard };
