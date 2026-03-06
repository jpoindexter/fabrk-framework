import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export type StatProps = React.HTMLAttributes<HTMLSpanElement> & {
  /** Label text (muted color) */
  label: string;
  /** Value text (primary color) */
  value: string | number;
  /** Size variant */
  size?: 'sm' | 'md';
};

const Stat = React.forwardRef<HTMLSpanElement, StatProps>(
  ({ label, value, size = 'md', className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="stat"
      className={cn(size === 'sm' ? 'text-xs' : 'text-sm', className)}
      {...props}
    >
      <span className={cn(mode.color.text.muted, mode.font)}>{label}:</span>{' '}
      <span className={cn(mode.color.text.accent, mode.font)}>{value}</span>
    </span>
  )
);
Stat.displayName = 'Stat';

export { Stat };
