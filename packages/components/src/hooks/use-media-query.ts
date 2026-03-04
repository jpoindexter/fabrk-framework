'use client'

import { useState, useEffect } from 'react'

/**
 * Reactive media query detection.
 * @param query - CSS media query string
 * @example
 * ```tsx
 * const isWide = useMediaQuery('(min-width: 1024px)')
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    setMatches(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** Viewport is mobile (< 768px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

/** Viewport is tablet (768px – 1023px). */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}

/** Viewport is desktop (>= 1024px). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
