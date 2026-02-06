/**
 * ✅ FABRK COMPONENT - UX HEURISTIC #9
 * Help Users Recognize, Diagnose, and Recover from Errors
 *
 * Error Message Formula:
 * - What went wrong
 * - Why it happened
 * - How to fix it
 * - Action to resolve (optional)
 */

'use client';

import { cn } from '../lib/utils';
import { mode } from '@fabrk/design-system';
import { AlertCircle, RefreshCw } from 'lucide-react';
import * as React from 'react';
import { Button } from './button';

export interface FormErrorProps {
  what?: string;
  why?: string;
  how?: string;
  onRetry?: () => void;
  helpLink?: string;
  className?: string;
  id?: string;
}

export const FormError = React.forwardRef<HTMLDivElement, FormErrorProps>(
  ({ what = 'Something went wrong', why, how, onRetry, helpLink, className, id }, ref) => {
    return (
      <div
        data-slot="form-error"
        ref={ref}
        id={id}
        role="alert"
        aria-live="polite"
        className={cn(
          mode.color.border.danger,
          mode.color.bg.dangerMuted,
          'border border-opacity-50 p-4',
          mode.radius,
          mode.font,
          className
        )}
      >
        <div className="flex gap-4">
          <AlertCircle className={cn('mt-0.5 size-4 shrink-0', mode.color.text.danger)} />
          <div className="flex-1 space-y-2">
            {/* What went wrong */}
            <p className={cn('text-xs font-medium', mode.color.text.danger)}>{what}</p>

            {/* Why it happened */}
            {why && <p className={cn('text-xs', mode.color.text.muted)}>{why}</p>}

            {/* How to fix it */}
            {how && (
              <p className={cn('text-xs', mode.color.text.primary)}>
                <span className="font-semibold">How to fix:</span> {how}
              </p>
            )}

            {/* Actions */}
            {(onRetry || helpLink) && (
              <div className="flex gap-2 pt-2">
                {onRetry && (
                  <Button size="sm" variant="outline" onClick={onRetry} className="h-7 text-xs">
                    <RefreshCw className="mr-1 size-3" />
                    &gt; RETRY
                  </Button>
                )}
                {helpLink && (
                  <Button size="sm" variant="ghost" asChild className="h-7 text-xs">
                    <a href={helpLink} target="_blank" rel="noopener noreferrer">
                      &gt; LEARN MORE
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
FormError.displayName = 'FormError';

// Common error patterns with helpful messages
export const commonErrors = {
  network: {
    what: 'Unable to connect to the server',
    why: 'This might be due to network issues or server maintenance.',
    how: 'Check your internet connection and try again.',
  },
  validation: {
    email: {
      what: 'Invalid email address',
      why: "The email format doesn't match our requirements.",
      how: 'Enter a valid email like name@example.com',
    },
    password: {
      what: 'Password too weak',
      why: "Your password doesn't meet security requirements.",
      how: 'Use at least 12 characters with uppercase, lowercase, numbers, and symbols.',
    },
    required: {
      what: 'Required field is empty',
      why: 'This field is mandatory for form submission.',
      how: 'Please fill in this field before continuing.',
    },
  },
  auth: {
    sessionExpired: {
      what: 'Your session has expired',
      why: "You've been inactive for too long.",
      how: 'Please log in again to continue.',
    },
    unauthorized: {
      what: 'Access denied',
      why: "You don't have permission to access this resource.",
      how: 'Contact your administrator for access.',
    },
  },
  upload: {
    tooLarge: {
      what: 'File too large',
      why: 'The file exceeds the maximum size limit.',
      how: 'Choose a file smaller than 10MB or compress it first.',
    },
    wrongFormat: {
      what: 'Invalid file format',
      why: 'This file type is not supported.',
      how: 'Use supported formats: JPG, PNG, PDF, or DOCX.',
    },
  },
  payment: {
    declined: {
      what: 'Payment declined',
      why: 'Your card was declined by the payment processor.',
      how: 'Check your card details or try a different payment method.',
    },
    insufficient: {
      what: 'Insufficient funds',
      why: "The card doesn't have enough available balance.",
      how: 'Use a different card or contact your bank.',
    },
  },
};
