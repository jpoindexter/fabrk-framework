import * as React from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'animate-pulse',
          // Use border color with opacity for better contrast in both light and dark themes
          'bg-border/50',
          mode.radius,
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export { Skeleton };
