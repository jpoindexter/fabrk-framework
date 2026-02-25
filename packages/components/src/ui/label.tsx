import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import * as React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  error?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, error, ...props }, ref) => {
    return (
      <label
        data-slot="label"
        ref={ref}
        className={cn(
          mode.color.text.primary,
          mode.typography.label,
          mode.font,
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
          'transition-colors duration-200',
          error && mode.color.text.danger,
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className={cn(mode.color.text.danger, 'ml-1')} aria-label="required">
            *
          </span>
        )}
      </label>
    );
  }
);
Label.displayName = 'Label';

export { Label };
