import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export type FeatureListProps = React.HTMLAttributes<HTMLDivElement>;

const FeatureList = React.forwardRef<HTMLDivElement, FeatureListProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="feature-list"
      className={cn('space-y-2', mode.typography.caption, mode.font, className)}
      {...props}
    >
      {children}
    </div>
  )
);
FeatureList.displayName = 'FeatureList';

export { FeatureList };
