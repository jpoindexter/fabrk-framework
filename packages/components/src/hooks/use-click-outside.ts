'use client'

import { useEffect, useRef } from 'react'

/**
 * Detect clicks outside a ref element.
 * @param ref - React ref to the container element
 * @param handler - Callback fired on outside click
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null)
 * useClickOutside(ref, () => setOpen(false))
 * ```
 */
export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  // Store handler in a ref so the event listener is never re-registered when
  // the caller passes a new function reference on every render.
  const handlerRef = useRef(handler)
  useEffect(() => { handlerRef.current = handler })

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return
      handlerRef.current(event)
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref]) // Only re-register if the ref object itself changes (it won't)
}
