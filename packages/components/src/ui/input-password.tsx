'use client';

/**
 * ✅ FABRK COMPONENT
 * Password input component with visibility toggle.
 *
 * @example
 * ```tsx
 * <input-password />
 * ```
 */

import { Button } from './button';
import { Input } from './input';
import { cn } from '../lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';

export interface InputPasswordProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  showToggle?: boolean;
}

const InputPassword = React.forwardRef<HTMLInputElement, InputPasswordProps>(
  ({ className, showToggle = true, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div data-slot="input-password" className="relative">
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={cn(showToggle && 'pr-10', className)}
          disabled={disabled}
          {...props}
        />
        {showToggle && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('absolute top-0 right-0 h-full px-4 py-1 hover:bg-transparent')}
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="text-muted-foreground h-4 w-4" />
            ) : (
              <Eye className="text-muted-foreground h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    );
  }
);
InputPassword.displayName = 'InputPassword';

export { InputPassword };
