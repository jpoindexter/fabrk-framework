'use client';

import { useEffect } from 'react';

export interface KeyboardShortcutOptions {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
  disabled?: boolean;
}

/** Ignores input/textarea focus unless a meta/ctrl modifier is held. */
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
