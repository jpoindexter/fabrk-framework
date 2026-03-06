import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export type PageBadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  /** Prefix label. Defaults to "TEMPLATE" */
  prefix?: string;
};

const PageBadge = React.forwardRef<HTMLDivElement, PageBadgeProps>(
  ({ children, prefix = 'TEMPLATE', className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="page-badge"
      className={cn(
        'inline-block border px-4 py-1',
        mode.color.bg.surface,
        mode.color.border.default,
        mode.radius,
        className
      )}
      {...props}
    >
      <span className={cn(mode.color.text.muted, mode.typography.caption, mode.font)}>
        [{prefix}]: {children}
      </span>
    </div>
  )
);
PageBadge.displayName = 'PageBadge';

export { PageBadge };
