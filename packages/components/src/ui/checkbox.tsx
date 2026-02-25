/**
 * Checkbox - Toggleable checkbox input with check icon indicator.
 * Built on Radix UI Checkbox with theme-aware accent color when checked.
 *
 * @example
 * ```tsx
 * <Checkbox checked={accepted} onCheckedChange={setAccepted} />
 * ```
 */

'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-5 shrink-0 border transition-colors focus-visible:outline-none',
        mode.color.bg.base,
        mode.color.border.default,
        mode.state.focus.ring,
        mode.state.disabled.cursor,
        mode.state.disabled.opacity,
        'data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground',
        'hover:border-primary',
        mode.radius,
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn('flex items-center justify-center text-current')}
      >
        <Check className="size-4" strokeWidth={4} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
