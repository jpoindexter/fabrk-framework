/**
 * Toast Hook
 *
 * Framework-agnostic toast state management.
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// TYPES

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

export interface UseToastReturn {
  toasts: Toast[];
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

/**
 * Framework-agnostic toast state management.
 * Pair with your own Toaster component or <Toaster /> from @fabrk/components.
 *
 * @param options.duration - Auto-dismiss delay in ms (default 4000, 0 to disable)
 *
 * @example
 * ```tsx
 * const { toasts, success, error, dismiss } = useToast()
 * success('Saved', 'Changes saved successfully')
 * ```
 */
export function useToast(options?: { duration?: number }): UseToastReturn {
  const { duration = 4000 } = options ?? {};
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const add = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, variant, title, description }]);
      if (duration > 0) {
        timersRef.current.set(id, setTimeout(() => dismiss(id), duration));
      }
    },
    [duration, dismiss]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return useMemo(
    () => ({
      toasts,
      success: (title: string, desc?: string) => add('success', title, desc),
      error: (title: string, desc?: string) => add('error', title, desc),
      info: (title: string, desc?: string) => add('info', title, desc),
      warning: (title: string, desc?: string) => add('warning', title, desc),
      dismiss,
      dismissAll: () => {
        timersRef.current.forEach((t) => clearTimeout(t));
        timersRef.current.clear();
        setToasts([]);
      },
    }),
    [toasts, add, dismiss]
  );
}
