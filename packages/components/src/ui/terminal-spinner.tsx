/**
 * ✅ FABRK COMPONENT
 * Terminal Spinner - Authentic terminal loading animation using Braille dots
 * Production-ready ✓
 *
 * @example
 * ```tsx
 * <TerminalSpinner />
 * <TerminalSpinner size="lg" />
 * <TerminalSpinner label="Loading data..." />
 * ```
 */

'use client';

import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

// Braille dot spinner sequence (most authentic terminal look)
const SPINNER_FRAMES = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

export interface TerminalSpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Optional loading label */
  label?: string;
  /** Custom className */
  className?: string;
  /** Animation speed in milliseconds */
  speed?: number;
}

export function TerminalSpinner({
  size = 'md',
  label,
  className,
  speed = 80,
}: TerminalSpinnerProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, speed);

    return () => clearInterval(interval);
  }, [speed]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('text-primary', mode.font, sizeClasses[size])}>
        {SPINNER_FRAMES[frame]}
      </span>
      {label && <span className={cn('text-muted-foreground text-sm', mode.font)}>{label}</span>}
    </div>
  );
}
