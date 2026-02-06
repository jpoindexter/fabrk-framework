/**
 * ✅ FABRK COMPONENT
 * Input component with validation states and loading indicator.
 * Uses Visual Mode System for aesthetic switching.
 *
 * Design System Integration:
 * - Imports from @/design-system for static mode (server components)
 * - Radius and font from visual mode config
 * - Focus ring using design tokens (focus-visible:ring-primary)
 * - Height follows 8-point grid: h-8 (32px)
 *
 * @example
 * ```tsx
 * <Input placeholder="Enter email" error={hasError} />
 * ```
 */

'use client';

import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, success, disabled, loading, loadingText, type, ...props }, ref) => {
    // UX Heuristic #1: Visibility of System Status
    // UX Heuristic #4: Consistency & Standards
    return (
      <div data-slot="input" className="relative">
        <input
          type={type}
          ref={ref}
          disabled={disabled || loading}
          className={cn(
            // Base styles - uses mode tokens for consistent theming
            'flex h-8 w-full border transition-colors',
            mode.color.bg.base,
            mode.color.text.primary,
            mode.color.border.default,
            mode.spacing.input,
            mode.typography.input,
            mode.radius,
            mode.font,

            // Focus state - uses mode state tokens
            'focus-visible:outline-none',
            mode.state.focus.ring,

            // File input styles - uses mode tokens
            'file:border-0 file:bg-transparent',
            mode.color.text.primary.replace('text-', 'file:text-'),
            mode.typography.input.replace('text-', 'file:text-'),
            mode.font.replace('font-', 'file:font-'),

            // Placeholder styles
            mode.color.text.muted.replace('text-', 'placeholder:text-'),
            'placeholder:font-normal',

            // Disabled state - uses mode state tokens
            mode.state.disabled.cursor,
            mode.state.disabled.opacity,

            // Loading state - Add padding for spinner
            loading && 'pr-10',

            // Error state - uses mode danger tokens
            error && cn(mode.color.border.danger, 'focus-visible:ring-destructive'),

            // Success state - uses mode success tokens
            success && 'focus-visible:ring-success',

            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-busy={loading ? 'true' : undefined}
          aria-describedby={loading && loadingText ? 'input-loading' : undefined}
          {...props}
        />
        {loading && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <Loader2 className={cn('size-4 animate-spin', mode.color.text.muted)} />
            {loadingText && (
              <span id="input-loading" className="sr-only">
                {loadingText}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
