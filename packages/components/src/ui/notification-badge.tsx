'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export interface NotificationBadgeProps {
  count?: number;
  max?: number;
  showZero?: boolean;
  dot?: boolean;
  variant?: 'primary' | 'destructive' | 'success' | 'warning';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  offset?: { x: number; y: number };
  children: React.ReactNode;
  className?: string;
}

const NotificationBadge = React.forwardRef<HTMLDivElement, NotificationBadgeProps>(
  (
    {
      count,
      max = 99,
      showZero = false,
      dot = false,
      variant = 'primary',
      position = 'top-right',
      size = 'md',
      pulse = false,
      offset = { x: 0, y: 0 },
      children,
      className,
    },
    ref
  ) => {
    const displayCount =
      count !== undefined && count > max
        ? `${max}+`
        : count !== undefined
          ? Math.floor(count).toString()
          : '';
    const shouldShow = count === undefined ? dot : count > 0 || showZero;

    const variantStyles = {
      primary: `bg-primary text-primary-foreground border-primary`,
      destructive: `${mode.color.bg.danger} ${mode.color.text.dangerOnColor} ${mode.color.border.danger}`,
      success: `${mode.color.bg.success} ${mode.color.text.successOnColor} ${mode.color.border.success}`,
      warning: `${mode.color.bg.warning} ${mode.color.text.warningOnColor} ${mode.color.border.warning}`,
    };

    const positionStyles = {
      'top-right': 'top-0 right-0 -translate-y-1/2 translate-x-1/2',
      'top-left': 'top-0 left-0 -translate-y-1/2 -translate-x-1/2',
      'bottom-right': 'bottom-0 right-0 translate-y-1/2 translate-x-1/2',
      'bottom-left': 'bottom-0 left-0 translate-y-1/2 -translate-x-1/2',
    };

    const sizeStyles = {
      sm: dot ? 'h-2 w-2' : 'h-4 w-4 text-xs min-w-4',
      md: dot ? 'h-2 w-2' : 'h-5 w-5 text-xs min-w-5',
      lg: dot ? 'h-3 w-3' : 'h-6 w-6 text-xs min-w-6',
    };

    const customOffset = {
      transform: `translate(${offset.x}px, ${offset.y}px)`,
    };

    return (
      <div ref={ref} className="relative inline-block">
        {children}
        {shouldShow && (
          <span
            className={cn(
              'absolute z-10 flex items-center justify-center border font-semibold tabular-nums transition-all duration-150',
              mode.radius,
              variantStyles[variant],
              positionStyles[position],
              sizeStyles[size],
              pulse && 'animate-pulse',
              className
            )}
            style={customOffset}
            aria-live="polite"
            aria-atomic="true"
          >
            {!dot && <span className="px-1 leading-none">{displayCount}</span>}
          </span>
        )}
      </div>
    );
  }
);

NotificationBadge.displayName = 'NotificationBadge';

export { NotificationBadge };
