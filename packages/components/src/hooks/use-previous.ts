'use client'

import { useEffect, useRef } from 'react'

/**
 * Track the previous value of a variable across renders.
 * @param value - The value to track
 * @example
 * ```tsx
 * const [count, setCount] = useState(0)
 * const prevCount = usePrevious(count)
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}
