import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export function FeatureCardStats({ stats }: { stats: Array<{ label: string; value: string }> }) {
  return (
    <div className={cn('border-y border-border bg-background py-4 px-6 flex gap-4 mt-4')}>
      {stats.map((stat, index) => (
        <React.Fragment key={stat.label}>
          {index > 0 && <div className="w-px bg-border" />}
          <div className={cn('flex-1 flex flex-col gap-1', index > 0 && 'pl-2')}>
            <p
              className={cn(
                'text-xs uppercase tracking-caps font-medium',
                mode.font,
                mode.color.text.muted
              )}
            >
              {stat.label}
            </p>
            <p
              className={cn(
                'text-xl font-bold leading-none tracking-tight text-warning',
                mode.font
              )}
            >
              {stat.value}
            </p>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
