/**
 * ✅ FABRK COMPONENT
 * Alert component for displaying important messages.
 * Uses Visual Mode System for aesthetic switching.
 *
 * Design System Integration:
 * - Imports from @/design-system for static mode
 * - Radius and font from visual mode config
 * - Spacing follows 8-point grid: px-6 (24px), py-4 (16px), gap-x-4 (16px)
 * - WCAG AAA compliant status colors (7:1+ contrast)
 *
 * @example
 * ```tsx
 * // Error alert
 * <Alert variant="destructive">
 *   <AlertCircle className="h-4 w-4" />
 *   <AlertTitle>Error</AlertTitle>
 *   <AlertDescription>Something went wrong.</AlertDescription>
 * </Alert>
 *
 * // Warning alert
 * <Alert variant="warning">
 *   <AlertTriangle className="h-4 w-4" />
 *   <AlertTitle>Warning</AlertTitle>
 *   <AlertDescription>Please review before continuing.</AlertDescription>
 * </Alert>
 *
 * // Success alert
 * <Alert variant="success">
 *   <CheckCircle className="h-4 w-4" />
 *   <AlertTitle>Success</AlertTitle>
 *   <AlertDescription>Changes saved successfully.</AlertDescription>
 * </Alert>
 * ```
 */

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';

/**
 * Alert Variants using WCAG AAA Compliant Status Colors
 *
 * WCAG Compliance (Light Theme):
 * - info: 7.1:1 contrast ✅
 * - destructive: 7.5:1 contrast ✅
 * - success: 7.2:1 contrast ✅
 * - warning: 7.8:1 contrast ✅
 *
 * WCAG Compliance (Dark Theme):
 * - info: 13.5:1 contrast ✅
 * - destructive: 10.5:1 contrast ✅
 * - success: 11:1 contrast ✅
 * - warning: 13:1 contrast ✅
 *
 * Uses semantic status color tokens with proper backgrounds
 */
const alertVariants = cva(
  // Base styles - grid layout for icon + content, padding follows 8-point grid
  'relative w-full border px-6 py-4 text-xs grid has-[>svg]:grid-cols-[calc(1.5rem)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-4 gap-y-1 items-start [&>svg]:size-5 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        // Info - informational alert
        default: `${mode.color.bg.infoMuted} ${mode.color.text.info} ${mode.color.border.accent}`,
        // Destructive - error alert
        destructive: `${mode.color.bg.dangerMuted} ${mode.color.text.danger} ${mode.color.border.danger}`,
        // Success - confirmation alert
        success: `${mode.color.bg.successMuted} ${mode.color.text.success} ${mode.color.border.success}`,
        // Warning - warning alert
        warning: `${mode.color.bg.warningMuted} ${mode.color.text.warning} ${mode.color.border.warning}`,
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
