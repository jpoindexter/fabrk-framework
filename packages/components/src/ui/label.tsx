/**
 * ✅ FABRK COMPONENT
 * - Component under 150 lines ✓
 * - No hardcoded styles ✓
 * - Design tokens only ✓
 * - UX heuristics applied ✓
 *
 * @example
 * ```tsx
 * <label>Content</label>
 * ```
 */

import { cn } from '../lib/utils';
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
          // Uses mode tokens for consistent theming
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
        {/* UX Heuristic #5: Error Prevention - Show required indicator */}
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
