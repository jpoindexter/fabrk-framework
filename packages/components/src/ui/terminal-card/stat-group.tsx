import * as React from 'react';
import { cn } from '@fabrk/core';

export type StatGroupProps = React.HTMLAttributes<HTMLDivElement>;

const StatGroup = React.forwardRef<HTMLDivElement, StatGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="stat-group"
      className={cn('flex flex-wrap gap-4', className)}
      {...props}
    />
  )
);
StatGroup.displayName = 'StatGroup';

export { StatGroup };
