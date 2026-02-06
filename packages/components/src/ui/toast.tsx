/**
 * ✅ FABRK COMPONENT
 *
 * @example
 * ```tsx
 * <toast variant="default" />
 * ```
 */

'use client';

import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import * as React from 'react';

const ToastProvider = ToastPrimitives.Provider;
ToastProvider.displayName = 'ToastProvider';

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 z-modal flex max-h-screen w-full flex-col-reverse p-6 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-96',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = 'ToastViewport';

const toastVariants = cva(
  'data-[swipe=end]:translate-x- data-[swipe=move]:translate-x- group pointer-events-auto relative flex w-full items-center justify-between space-x-6 overflow-hidden border p-6 pr-8 transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: `${mode.color.border.default} ${mode.color.bg.base} ${mode.color.text.primary}`,
        destructive: `destructive ${mode.color.border.danger} ${mode.color.bg.danger} ${mode.color.text.dangerOnColor}`,
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      data-slot="toast"
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = 'Toast';

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
      mode.color.bg.base,
      `hover:${mode.color.bg.secondary}`,
      mode.state.focus.ring,
      `group-[.destructive]:${mode.color.border.danger}/40`,
      `group-[.destructive]:hover:${mode.color.border.danger}/30`,
      `group-[.destructive]:hover:${mode.color.bg.danger}`,
      `group-[.destructive]:hover:${mode.color.text.dangerOnColor}`,
      mode.state.disabled.cursor,
      mode.state.disabled.opacity,
      mode.radius,
      className
    )}
    {...props}
  />
));
ToastAction.displayName = 'ToastAction';

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute top-2 right-2 p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none',
      `${mode.color.text.primary}/50`,
      `hover:${mode.color.text.primary}`,
      mode.state.focus.ring,
      `group-[.destructive]:${mode.color.text.danger}`,
      `group-[.destructive]:hover:${mode.color.text.danger}`,
      mode.radius,
      className
    )}
    toast-close=""
    aria-label="Close notification"
    {...props}
  >
    <X className="h-4 w-4" aria-hidden="true" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = 'ToastClose';

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-xs font-medium', mode.font, className)}
    {...props}
  />
));
ToastTitle.displayName = 'ToastTitle';

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-xs', mode.color.text.muted, mode.font, className)}
    {...props}
  />
));
ToastDescription.displayName = 'ToastDescription';

export type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

export type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
};
