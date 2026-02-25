'use client';

import * as React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export interface AdminMetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  loading?: boolean;
  className?: string;
}

const toneMap = {
  default: 'neutral' as const,
  primary: 'primary' as const,
  success: 'success' as const,
  warning: 'warning' as const,
  danger: 'danger' as const,
};

export function AdminMetricsCard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon,
  variant = 'default',
  loading = false,
  className,
}: AdminMetricsCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <Card tone={toneMap[variant]} className={className}>
      <CardHeader title={title} icon={icon} />
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className={cn('bg-muted h-8 w-24 animate-pulse', mode.radius)} />
            <div className={cn('bg-muted h-4 w-20 animate-pulse', mode.radius)} />
          </div>
        ) : (
          <>
            <div className="text-foreground text-3xl font-bold">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>

            {change !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <div
                  className={cn(
                    'border-border flex items-center gap-1 px-2 py-0.5 text-xs font-semibold',
                    mode.radius,
                    isPositive && 'border-primary bg-primary/10 text-primary',
                    isNegative && 'border-destructive bg-destructive/10 text-destructive',
                    isNeutral && 'border-border bg-muted text-muted-foreground'
                  )}
                >
                  <TrendIcon className="h-3 w-3" />
                  {Math.abs(change).toFixed(1)}%
                </div>
                <span className="text-muted-foreground text-xs">{changeLabel}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
