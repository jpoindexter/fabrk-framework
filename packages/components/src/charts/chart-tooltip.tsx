'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export interface ChartTooltipProps {
  xAxisFormatter?: (value: string) => string;
  tooltipFormatter?: (value: number, name: string) => string;
  /** Which Recharts entry property holds the color: 'fill' for bars, 'stroke' for lines/areas */
  colorKey?: 'fill' | 'stroke';
}

/** Shared memoized tooltip factory for Recharts charts. */
export function useChartTooltip({
  xAxisFormatter,
  tooltipFormatter,
  colorKey = 'fill',
}: ChartTooltipProps) {
  return React.useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts TooltipContentProps is complex
      ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
          return (
            <div className={cn(mode.color.border.default, 'bg-card border px-4 py-2', mode.radius)}>
              <p className={cn('text-foreground mb-2 text-xs font-semibold', mode.font)}>
                {xAxisFormatter ? xAxisFormatter(String(label ?? '')) : label}
              </p>
              <div className="space-y-1">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {payload.map((entry: any, index: number) => (
                  <p key={index} className={cn('text-muted-foreground text-xs', mode.font)}>
                    <span
                      className="mr-2 inline-block h-2 w-2"
                      style={{ backgroundColor: entry[colorKey] }}
                    />
                    {entry.name}:{' '}
                    <span className="text-foreground font-semibold">
                      {tooltipFormatter ? tooltipFormatter(entry.value, entry.name) : entry.value}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          );
        }
        return null;
      },
    [xAxisFormatter, tooltipFormatter, colorKey]
  );
}
