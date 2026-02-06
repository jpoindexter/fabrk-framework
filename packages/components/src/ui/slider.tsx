'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { 'aria-label'?: string }
>(({ className, 'aria-label': ariaLabel, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    data-slot="slider"
    className={cn('relative flex w-full touch-none items-center select-none', className)}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        'relative h-2 w-full grow overflow-hidden border',
        mode.color.bg.secondary,
        mode.color.border.default,
        mode.radius
      )}
    >
      <SliderPrimitive.Range className={cn('absolute h-full', mode.color.bg.accent)} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      aria-label={ariaLabel}
      className={cn(
        'block h-5 w-5 border transition-colors hover:scale-105 focus-visible:outline-none',
        mode.color.border.accent,
        mode.color.bg.base,
        mode.state.focus.ring,
        mode.state.disabled.cursor,
        mode.state.disabled.opacity,
        mode.radius
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
