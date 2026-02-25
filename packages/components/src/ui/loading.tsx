'use client';

import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button, ButtonProps } from './button';

// ASCII Spinner frames
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const LINE_FRAMES = ['|', '/', '-', '\\'];
const BLOCK_FRAMES = ['▖', '▘', '▝', '▗'];

export type LoadingSpinnerProps = React.ComponentProps<'div'>;

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'braille' | 'line' | 'block' | 'dots';
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', variant = 'braille', ...props }, ref) => {
    const [frame, setFrame] = useState(0);

    const frames = variant === 'line' ? LINE_FRAMES : variant === 'block' ? BLOCK_FRAMES : SPINNER_FRAMES;

    // Keep a ref to the current frames array so the interval callback always
    // uses the up-to-date frame count even if variant changes between renders.
    const framesRef = React.useRef(frames);
    useEffect(() => { framesRef.current = frames; });

    useEffect(() => {
      const interval = setInterval(() => {
        setFrame((prev) => (prev + 1) % framesRef.current.length);
      }, 80);
      return () => clearInterval(interval);
    }, []); // Interval never needs to re-register; framesRef always current

    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-xl',
      lg: 'text-3xl',
    };

    // Dots variant uses different animation
    if (variant === 'dots') {
      return (
        <div
          data-slot="spinner"
          ref={ref}
          role="status"
          aria-label="Loading"
          className={cn('flex items-center justify-center', mode.font, className)}
          {...props}
        >
          <span className={cn(sizeClasses[size], mode.color.text.primary)}>
            [<span className="inline-block w-12 text-center animate-pulse">...</span>]
          </span>
          <span className="sr-only">Loading...</span>
        </div>
      );
    }

    return (
      <div
        data-slot="spinner"
        ref={ref}
        role="status"
        aria-label="Loading"
        className={cn('flex items-center justify-center', mode.font, className)}
        {...props}
      >
        <span className={cn(sizeClasses[size], mode.color.text.primary)} aria-hidden="true">
          {frames[frame]}
        </span>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);
Spinner.displayName = 'Spinner';

// Skeleton Component
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'text', ...props }, ref) => {
    const variantClasses = {
      text: 'h-4 w-full',
      circular: '',
      rectangular: '',
    };

    return (
      <div
        data-slot="skeleton"
        ref={ref}
        className={cn(
          'h-full w-full animate-pulse border',
          mode.color.bg.elevated,
          mode.color.border.default,
          mode.radius,
          variantClasses[variant],
          className
        )}
        aria-hidden="true"
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';

// Loading Container for full-page loading
export interface LoadingContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const LoadingContainer = React.forwardRef<HTMLDivElement, LoadingContainerProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        data-slot="loading-container"
        ref={ref}
        className={cn('flex min-h-96 flex-col items-center justify-center gap-6', className)}
        {...props}
      >
        <Spinner size="lg" />
        {children && <p className={cn('text-xs', mode.color.text.muted, mode.font)}>{children}</p>}
      </div>
    );
  }
);
LoadingContainer.displayName = 'LoadingContainer';

// Loading Button Component
export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, loadingText, children, disabled, ...props }, ref) => {
    return (
      <Button data-slot="loading-button" ref={ref} disabled={loading || disabled} {...props}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  }
);
LoadingButton.displayName = 'LoadingButton';

// Loading Spinner (alias for Spinner for compatibility)
export const LoadingSpinner = Spinner;
LoadingSpinner.displayName = 'LoadingSpinner';
