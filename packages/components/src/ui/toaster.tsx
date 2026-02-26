'use client';

import { Toast, ToastProvider } from './toast';
import * as React from 'react';
import { useToast } from '@fabrk/core';

interface ToastActionInnerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  altText?: string;
}

interface ToastContentProps {
  children?: React.ReactNode;
}

export type ToastActionProps = React.ComponentProps<'div'>;
export type ToastTitleProps = React.ComponentProps<'div'>;
export type ToastDescriptionProps = React.ComponentProps<'div'>;
export type ToastCloseProps = React.ComponentProps<'div'>;
export type ToastViewportProps = React.ComponentProps<'div'>;

export type ToasterProps = React.HTMLAttributes<HTMLDivElement>;

function toastVariant(variant: string): 'default' | 'destructive' {
  return variant === 'error' ? 'destructive' : 'default';
}

export const Toaster = React.forwardRef<HTMLDivElement, ToasterProps>(({ ...props }, ref) => {
  const { toasts } = useToast();

  return (
    <div data-slot="toaster" ref={ref} {...props}>
      <ToastProvider>
        {toasts.map(function ({ id, variant, title, description }) {
          return (
            <Toast key={id} id={id} variant={toastVariant(variant)}>
              {title && <div className="font-medium">{title}</div>}
              {description && <div className="text-sm text-muted-foreground">{description}</div>}
            </Toast>
          );
        })}
      </ToastProvider>
    </div>
  );
});
Toaster.displayName = 'Toaster';

export const ToastAction = ({ children, altText, ...props }: ToastActionInnerProps) => (
  <button data-slot="toast-action" aria-label={altText} {...props}>
    {children}
  </button>
);
ToastAction.displayName = 'ToastAction';

export const ToastTitle = ({ children }: ToastContentProps) => (
  <div data-slot="toast-title" className="font-medium">
    {children}
  </div>
);
ToastTitle.displayName = 'ToastTitle';
export const ToastDescription = ({ children }: ToastContentProps) => (
  <div data-slot="toast-description" className="text-sm text-muted-foreground">
    {children}
  </div>
);
ToastDescription.displayName = 'ToastDescription';
export const ToastClose = () => (
  <button data-slot="toast-close" aria-label="Close">
    ×
  </button>
);
ToastClose.displayName = 'ToastClose';
export const ToastViewport = () => <div data-slot="toast-viewport" />;
ToastViewport.displayName = 'ToastViewport';
