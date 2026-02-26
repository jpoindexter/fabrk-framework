'use client';

import { cn } from '@fabrk/core';
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
    return (
      <div data-slot="input" className="relative">
        <input
          type={type}
          ref={ref}
          disabled={disabled || loading}
          className={cn(
            'flex h-8 w-full border transition-colors',
            mode.color.bg.base,
            mode.color.text.primary,
            mode.color.border.default,
            mode.spacing.input,
            mode.typography.input,
            mode.radius,
            mode.font,

            'focus-visible:outline-none',
            mode.state.focus.ring,

            'file:border-0 file:bg-transparent',
            mode.color.text.primary.replace('text-', 'file:text-'),
            mode.typography.input.replace('text-', 'file:text-'),
            mode.font.replace('font-', 'file:font-'),

            mode.color.text.muted.replace('text-', 'placeholder:text-'),
            'placeholder:font-normal',

            mode.state.disabled.cursor,
            mode.state.disabled.opacity,

            loading && 'pr-10',

            error && cn(mode.color.border.danger, 'focus-visible:ring-destructive'),

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
