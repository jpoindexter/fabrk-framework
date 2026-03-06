import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Primary label text */
  label: string;
  /** Optional metadata after the label (e.g., "v2.0") */
  meta?: string;
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ label, meta, className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="badge"
      className={cn(
        'inline-block border px-2 py-1',
        mode.color.border.default,
        mode.color.bg.surface,
        mode.radius,
        className
      )}
      {...props}
    >
      <span className={cn(mode.color.text.muted, mode.typography.caption, mode.font)}>
        {label}{meta ? ` ${meta}` : ''}
      </span>
    </div>
  )
);
Badge.displayName = 'Badge';

export { Badge };
