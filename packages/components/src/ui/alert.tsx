import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@fabrk/core';
import { mode } from '@fabrk/design-system';

// Pre-compute static class strings so Tailwind JIT can scan them
const alertVariantDefault = [mode.color.bg.infoMuted, mode.color.text.info, mode.color.border.accent].join(' ');
const alertVariantDestructive = [mode.color.bg.dangerMuted, mode.color.text.danger, mode.color.border.danger].join(' ');
const alertVariantSuccess = [mode.color.bg.successMuted, mode.color.text.success, mode.color.border.success].join(' ');
const alertVariantWarning = [mode.color.bg.warningMuted, mode.color.text.warning, mode.color.border.warning].join(' ');

const alertVariants = cva(
  'relative w-full border px-6 py-4 text-xs grid has-[>svg]:grid-cols-[calc(1.5rem)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-4 gap-y-1 items-start [&>svg]:size-5 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: alertVariantDefault,
        destructive: alertVariantDestructive,
        success: alertVariantSuccess,
        warning: alertVariantWarning,
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), mode.radius, mode.font, 'crt-scanlines', className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'col-start-2 grid justify-items-start gap-1 font-normal [&_p]:leading-relaxed',
        mode.typography.caption,
        mode.font,
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
