'use client'

import { useState, useCallback } from 'react'

export interface ViewHistoryItem {
  id: string
  label: string
  href: string
  timestamp: number
}

/**
 * Track recently viewed items in localStorage.
 * @param storageKey - localStorage key (default 'fabrk-view-history')
 * @param maxItems - Maximum items to keep (default 20)
 * @example
 * ```tsx
 * const { items, add, clear } = useViewHistory()
 * add({ id: 'doc-1', label: 'Getting Started', href: '/docs/getting-started' })
 * ```
 */
export function useViewHistory(storageKey = 'fabrk-view-history', maxItems = 20) {
  const [items, setItems] = useState<ViewHistoryItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || '[]')
    } catch {
      return []
    }
  })

  const persist = useCallback(
    (next: ViewHistoryItem[]) => {
      setItems(next)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      }
    },
    [storageKey]
  )

  const add = useCallback(
    (item: Omit<ViewHistoryItem, 'timestamp'>) => {
      setItems((prev) => {
        const filtered = prev.filter((i) => i.id !== item.id)
        const next = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, maxItems)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(next))
        }
        return next
      })
    },
    [maxItems, storageKey]
  )

  const clear = useCallback(() => persist([]), [persist])

  return { items, add, clear }
}
