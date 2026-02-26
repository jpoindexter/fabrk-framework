/**
 * Keyboard Shortcut Hook
 *
 * Register global keyboard shortcuts with modifier key support.
 */

'use client';

import { useEffect } from 'react';

// TYPES

export interface KeyboardShortcutOptions {
  /** Keyboard key (e.g. 'k', 'Escape', '/') */
  key: string;
  /** Modifier keys required */
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Callback when shortcut fires */
  handler: (e: KeyboardEvent) => void;
  /** Disable the shortcut (default: false) */
  disabled?: boolean;
}

/**
 * Register a global keyboard shortcut. Ignores input/textarea focus.
 *
 * @example
 * ```tsx
 * useKeyboardShortcut({
 *   key: 'k',
 *   meta: true,
 *   handler: () => setCommandPaletteOpen(true),
 * })
 * ```
 */
export function useKeyboardShortcut({
  key,
  meta,
  ctrl,
  shift,
  alt,
  handler,
  disabled = false,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    if (disabled) return;

    const listener = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow meta/ctrl combos even in inputs (e.g. Cmd+K)
        if (!meta && !ctrl) return;
      }

      if (meta && !e.metaKey) return;
      if (ctrl && !e.ctrlKey) return;
      if (shift && !e.shiftKey) return;
      if (alt && !e.altKey) return;

      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        handler(e);
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [key, meta, ctrl, shift, alt, handler, disabled]);
}
