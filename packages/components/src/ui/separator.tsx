'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

interface SeparatorProps extends React.ComponentProps<'div'> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <div
      data-slot="separator"
      role={decorative ? 'none' : 'separator'}
      {...(!decorative && { 'aria-orientation': orientation })}
      className={cn(
        'shrink-0',
        mode.color.bg.muted,
        orientation === 'horizontal' ? 'h-hairline w-full' : 'h-full w-hairline',
        className
      )}
      {...props}
    />
  );
}
