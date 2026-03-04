'use client'

import { useState, useCallback } from 'react'

/**
 * Type-safe localStorage with SSR guard and JSON serialization.
 * @param key - Storage key
 * @param initialValue - Default value if key is absent
 * @example
 * ```tsx
 * const [theme, setTheme] = useLocalStorage('theme', 'dark')
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = value instanceof Function ? value(prev) : value
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(next))
        }
        return next
      })
    },
    [key]
  )

  return [stored, setValue]
}
