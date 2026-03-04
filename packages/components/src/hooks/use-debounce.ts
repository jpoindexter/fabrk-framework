'use client'

import { useState, useEffect } from 'react'

/**
 * Debounce a value by a given delay.
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default 300)
 * @example
 * ```tsx
 * const [query, setQuery] = useState('')
 * const debouncedQuery = useDebounce(query, 300)
 * ```
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
