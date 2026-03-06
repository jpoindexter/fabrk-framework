import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { generateHexFromTitle } from './utils';

export type MetricCardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Hex code for header (e.g., "0x1A"). Auto-generates from title if not provided. */
  code?: string;
  /** Header title in SNAKE_CASE format */
  title: string;
  /** Large display value (e.g., "77+", "$199") */
  value: string | number;
  /** Label below value */
  label: string;
  /** Icon displayed in header right side */
  icon?: React.ReactNode;
};

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ code, title, value, label, icon, className, ...props }, ref) => {
    const hexCode = code ?? generateHexFromTitle(title);

    return (
      <div
        ref={ref}
        data-slot="metric-card"
        className={cn(
          'relative flex flex-col border',
          mode.color.bg.surface,
          mode.color.border.default,
          mode.radius,
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'flex h-11 shrink-0 items-center justify-between border-b px-4',
            mode.color.border.default
          )}
        >
          <span className={cn('text-xs tracking-wide', mode.font, mode.color.text.muted)}>
            [{hexCode}] {title}
          </span>
          {icon && <span className={mode.color.text.accent}>{icon}</span>}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <div className={cn('text-5xl font-bold leading-none', mode.font, mode.color.text.accent)}>
            {value}
          </div>
          <div className={cn('mt-2 text-sm font-bold uppercase tracking-wide', mode.font)}>
            {label}
          </div>
        </div>
      </div>
    );
  }
);
MetricCard.displayName = 'MetricCard';

export { MetricCard };
