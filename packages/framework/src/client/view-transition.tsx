'use client';

import { useCallback, useTransition } from 'react';

/**
 * Wraps navigation callbacks in `document.startViewTransition()` when available.
 * Falls back to React's `startTransition` in environments without View Transitions support.
 *
 * @example
 *   const { startViewTransition } = useViewTransition();
 *   <button onClick={() => startViewTransition(() => navigate('/about'))}>Go</button>
 */
export function useViewTransition() {
  const [isPending, startTransition] = useTransition();

  const startViewTransition = useCallback(
    (callback: () => void) => {
      if (
        typeof document !== 'undefined' &&
        'startViewTransition' in document
      ) {
        (
          document as Document & {
            startViewTransition: (cb: () => void) => unknown;
          }
        ).startViewTransition(() => startTransition(callback));
      } else {
        startTransition(callback);
      }
    },
    [startTransition]
  );

  return { startViewTransition, isPending };
}

/**
 * An anchor tag that wraps same-origin navigation in `document.startViewTransition()`.
 * Modifier-key clicks (Ctrl, Meta, Shift, Alt) and external links pass through normally.
 *
 * @example
 *   <ViewTransitionLink href="/about">About</ViewTransitionLink>
 */
export function ViewTransitionLink({
  href,
  children,
  onClick,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { startViewTransition } = useViewTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (href.startsWith('http') || href.startsWith('//')) return;
    e.preventDefault();
    startViewTransition(() => {
      window.history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    onClick?.(e);
  };

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
