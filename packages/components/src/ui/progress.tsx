'use client';

import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

// ASCII character sets for different variants
const PROGRESS_CHARS = {
  block: { filled: '█', empty: '░' },
  hash: { filled: '#', empty: '.' },
  pipe: { filled: '|', empty: ' ' },
  dots: { filled: '●', empty: '○' },
  arrow: { filled: '=', empty: ' ', head: '>' },
  braille: { filled: '⣿', empty: '⣀' },
} as const;

export type ProgressVariant = keyof typeof PROGRESS_CHARS;

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Progress value between 0 and 100 */
  value?: number;
  /** Visual style variant */
  variant?: ProgressVariant;
  /** Show percentage after the bar */
  showPercentage?: boolean;
  /** Show percentage before the bar */
  percentageBefore?: boolean;
  /** Custom label to show (e.g., "Downloading...") */
  label?: string;
  /** Width of the progress bar in characters (default: 20) */
  barWidth?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

function Progress({
  className,
  value = 0,
  variant = 'block',
  showPercentage = false,
  percentageBefore = false,
  label,
  barWidth = 20,
  size = 'md',
  ...props
}: ProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const filledCount = Math.round((clampedValue / 100) * barWidth);
  const emptyCount = barWidth - filledCount;

  const chars = PROGRESS_CHARS[variant];
  const percentage = `${Math.round(clampedValue)}%`;

  let bar = '';
  if (variant === 'arrow') {
    const arrowChars = chars as typeof PROGRESS_CHARS.arrow;
    if (filledCount > 0) {
      bar = arrowChars.filled.repeat(filledCount - 1) + arrowChars.head;
    }
    bar += arrowChars.empty.repeat(emptyCount);
  } else {
    bar = chars.filled.repeat(filledCount) + chars.empty.repeat(emptyCount);
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm',
  };

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `Progress: ${percentage}`}
      className={cn(
        'flex items-center gap-2',
        mode.font,
        mode.color.text.primary,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {label && <span className={cn('w-12 shrink-0', mode.color.text.muted)}>{label}</span>}
      {percentageBefore && (
        <span className={cn('w-10 shrink-0 text-right', mode.color.text.muted)}>{percentage}</span>
      )}
      <span className="shrink-0">
        <span className={mode.color.text.muted}>[</span>
        <span className={mode.color.text.accent}>{bar}</span>
        <span className={mode.color.text.muted}>]</span>
      </span>
      {showPercentage && !percentageBefore && (
        <span className={cn('w-10 shrink-0', mode.color.text.muted)}>{percentage}</span>
      )}
    </div>
  );
}

// Animated progress bar that fills over time (for demos)
export interface AnimatedProgressProps extends Omit<ProgressProps, 'value'> {
  /** Duration of animation in ms */
  duration?: number;
  /** Starting value */
  from?: number;
  /** Ending value */
  to?: number;
  /** Loop the animation */
  loop?: boolean;
}

function AnimatedProgress({
  duration = 2000,
  from = 0,
  to = 100,
  loop = false,
  ...props
}: AnimatedProgressProps) {
  const [value, setValue] = React.useState(from);
  const frameIdRef = React.useRef<number>(0);

  React.useEffect(() => {
    let startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = from + (to - from) * progress;

      setValue(currentValue);

      if (progress < 1) {
        frameIdRef.current = requestAnimationFrame(animate);
      } else if (loop) {
        startTime = Date.now(); // reset for next cycle
        setValue(from);
        frameIdRef.current = requestAnimationFrame(animate);
      }
    };

    frameIdRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [duration, from, to, loop]);

  return <Progress value={value} {...props} />;
}

// Progress with info display (size, speed, ETA)
export interface ProgressWithInfoProps extends ProgressProps {
  /** Current size loaded (e.g., "12.5 MB") */
  loaded?: string;
  /** Total size (e.g., "50 MB") */
  total?: string;
  /** Speed (e.g., "2.5 MB/s") */
  speed?: string;
  /** Estimated time remaining (e.g., "15s") */
  eta?: string;
}

function ProgressWithInfo({
  loaded,
  total,
  speed,
  eta,
  className,
  ...props
}: ProgressWithInfoProps) {
  const infoString = [
    loaded && total ? `${loaded}/${total}` : loaded || total,
    speed,
    eta ? `ETA: ${eta}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <div className={cn('space-y-1', className)}>
      <Progress {...props} />
      {infoString && (
        <div className={cn('text-xs', mode.font, mode.color.text.muted)}>{infoString}</div>
      )}
    </div>
  );
}

// Solid progress bar - Clean, minimal design with filled bar
export interface SolidProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Progress value between 0 and 100 */
  value?: number;
  /** Custom label (e.g., "Upload", "Download") */
  label?: string;
  /** Show percentage */
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
      {/* Label row */}
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
      {/* Progress bar */}
      <div className={cn('bg-muted w-full overflow-hidden', mode.radius, sizeClasses[size])}>
        <div
          className={cn('h-full transition-all duration-100', mode.radius, barColorClass)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

// Animated solid progress bar - fills over time with scroll trigger
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

export { Progress, AnimatedProgress, ProgressWithInfo, SolidProgress, AnimatedSolidProgress };
