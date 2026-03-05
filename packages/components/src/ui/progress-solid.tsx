'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

export interface SolidProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Progress value between 0 and 100 */
  value?: number;
  /** Custom label (e.g., "Upload", "Download") */
  label?: string;
  showPercentage?: boolean;
  /** Show completion state with checkmark */
  showComplete?: boolean;
  /** Custom complete text (default: "DONE") */
  completeText?: string;
  /** Height variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color when complete */
  completeColor?: 'success' | 'primary';
}

function SolidProgress({
  className,
  value = 0,
  label,
  showPercentage = true,
  showComplete = true,
  completeText = 'DONE',
  size = 'md',
  completeColor = 'success',
  ...props
}: SolidProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const isComplete = clampedValue >= 100;
  const percentage = Math.round(clampedValue);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const barColorClass = isComplete && completeColor === 'success' ? 'bg-success' : 'bg-primary';

  return (
    <div
      data-slot="solid-progress"
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `Progress: ${percentage}%`}
      className={cn('space-y-2', className)}
      {...props}
    >
      {(label || showPercentage) && (
        <div className={cn('flex items-center justify-between text-xs', mode.font)}>
          {label && <span className={mode.color.text.muted}>{label}</span>}
          {showPercentage && (
            <span className={cn('ml-auto', mode.color.text.muted)}>
              {isComplete && showComplete ? (
                <span className={cn('flex items-center gap-1', completeColor === 'success' ? 'text-success' : '')}>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {completeText}
                </span>
              ) : (
                `${percentage}%`
              )}
            </span>
          )}
        </div>
      )}
      <div className={cn('bg-muted w-full overflow-hidden', mode.radius, sizeClasses[size])}>
        <div
          className={cn('h-full transition-all duration-100', mode.radius, barColorClass)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

export interface AnimatedSolidProgressProps extends Omit<SolidProgressProps, 'value'> {
  /** Duration of animation in ms */
  duration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

function AnimatedSolidProgress({
  duration = 2000,
  onComplete,
  ...props
}: AnimatedSolidProgressProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const hasStartedRef = React.useRef(false);
  const [progress, setProgress] = React.useState(0);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStartedRef.current) {
          hasStartedRef.current = true;
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const solidFrameIdRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (!isVisible) return;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        solidFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    solidFrameIdRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(solidFrameIdRef.current);
  }, [isVisible, duration, onComplete]);

  return (
    <div ref={ref}>
      <SolidProgress value={progress} {...props} />
    </div>
  );
}

export { SolidProgress, AnimatedSolidProgress };
