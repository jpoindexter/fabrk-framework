import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export type FeatureItemProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  /** Icon to use before text. Defaults to ">" */
  icon?: 'arrow' | 'check' | 'dot';
};

const iconMap = {
  arrow: '>',
  check: '\u2713',
  dot: '\u2022',
};

const FeatureItem = React.forwardRef<HTMLDivElement, FeatureItemProps>(
  ({ children, icon = 'arrow', className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="feature-item"
      className={cn(mode.typography.caption, mode.font, className)}
      {...props}
    >
      <span className={mode.color.text.success}>{iconMap[icon]}</span> {children}
    </div>
  )
);
FeatureItem.displayName = 'FeatureItem';

export { FeatureItem };
