'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Observe an element's intersection with the viewport.
 * Useful for lazy loading, infinite scroll, and scroll-triggered animations.
 * @param options - IntersectionObserver options (threshold, rootMargin, etc.)
 * @example
 * ```tsx
 * const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.5 })
 * return <div ref={ref}>{isIntersecting ? 'Visible' : 'Hidden'}</div>
 * ```
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): { ref: React.RefCallback<Element>; isIntersecting: boolean; entry: IntersectionObserverEntry | null } {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const ref = useCallback(
    (node: Element | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      if (!node) return
      observerRef.current = new IntersectionObserver(([e]) => setEntry(e), options)
      observerRef.current.observe(node)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options?.threshold, options?.root, options?.rootMargin]
  )

  useEffect(() => {
    return () => observerRef.current?.disconnect()
  }, [])

  return { ref, isIntersecting: entry?.isIntersecting ?? false, entry }
}
