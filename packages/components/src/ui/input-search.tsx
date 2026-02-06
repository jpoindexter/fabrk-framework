'use client';

/**
 * ✅ FABRK COMPONENT
 * Search input component with icon.
 *
 * @example
 * ```tsx
 * <InputSearch placeholder="Search..." value={query} onValueChange={setQuery} />
 * ```
 */

import { Button } from './button';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { Loader2, Search, X } from 'lucide-react';
import * as React from 'react';

export interface InputSearchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange'
> {
  value?: string;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  loading?: boolean;
  showClearButton?: boolean;
}

const InputSearch = React.forwardRef<HTMLInputElement, InputSearchProps>(
  (
    {
      className,
      value,
      onValueChange,
      onClear,
      loading = false,
      showClearButton = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const handleClear = () => {
      onValueChange?.('');
      onClear?.();
    };

    return (
      <div data-slot="input-search" className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          disabled={disabled}
          className={cn(
            mode.color.border.default,
            'bg-background flex h-8 w-full border py-2 pr-4 pl-10 text-sm transition-colors',
            mode.radius,
            mode.font,
            'placeholder:text-muted-foreground',
            'focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Hide native search clear button (we have custom one)
            '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
            (showClearButton || loading) && 'pr-10',
            className
          )}
          {...props}
        />
        {loading ? (
          <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : (
          showClearButton &&
          value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 p-0 hover:bg-transparent"
              onClick={handleClear}
              disabled={disabled}
              aria-label="Clear search"
            >
              <X className="text-muted-foreground h-3 w-3" />
            </Button>
          )
        )}
      </div>
    );
  }
);
InputSearch.displayName = 'InputSearch';

export { InputSearch };
