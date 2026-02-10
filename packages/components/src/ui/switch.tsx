/**
 * Switch - Toggle control for binary on/off settings.
 * Always renders as a pill shape (rounded-full) regardless of theme mode.radius.
 *
 * @example
 * ```tsx
 * <Switch checked={enabled} onCheckedChange={setEnabled} />
 * ```
 */

'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center border transition-colors focus-visible:outline-none',
        mode.color.bg.muted,
        mode.color.border.default,
        mode.state.focus.ring,
        mode.state.disabled.cursor,
        mode.state.disabled.opacity,
        `data-[state=checked]:${mode.color.bg.accent} data-[state=unchecked]:${mode.color.bg.muted}`,
        'rounded-full', // Switches should always be pill-shaped
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block h-3.5 w-3.5 border transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5',
          'bg-foreground data-[state=checked]:bg-accent-foreground',
          mode.color.border.default,
          'rounded-full' // Thumb should always be round
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
