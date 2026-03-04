'use client'

import { useEffect, useRef } from 'react'

export interface UseListKeyboardNavOptions<T> {
  /** Array of items in display order */
  items: T[]
  /** Currently active item (compared by reference or via keyFn) */
  activeItem: T | null
  /** Called when a new item should become active */
  onSelect: (item: T) => void
  /** Called on Escape key */
  onClear?: () => void
  /** Called on Enter key with the active item */
  onConfirm?: (item: T) => void
  /** Extract a unique key for comparison (default: reference equality) */
  keyFn?: (item: T) => string
  /** Enable vim-style j/k navigation (default: true) */
  vimKeys?: boolean
  /** Whether navigation is enabled (default: true) */
  enabled?: boolean
}

/**
 * Arrow key (and optional j/k) navigation for lists.
 * Skips inputs/textareas. Wraps around at boundaries.
 *
 * @example
 * ```tsx
 * useListKeyboardNav({
 *   items: filteredResults,
 *   activeItem: selected,
 *   onSelect: setSelected,
 *   onConfirm: (item) => router.push(`/items/${item.id}`),
 *   keyFn: (item) => item.id,
 * })
 * ```
 */
export function useListKeyboardNav<T>({
  items,
  activeItem,
  onSelect,
  onClear,
  onConfirm,
  keyFn,
  vimKeys = true,
  enabled = true,
}: UseListKeyboardNavOptions<T>): void {
  const itemsRef = useRef(items)
  const activeRef = useRef(activeItem)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { activeRef.current = activeItem }, [activeItem])

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      const current = itemsRef.current
      if (current.length === 0) return

      const currentIndex = activeRef.current != null
        ? current.findIndex((item) =>
            keyFn ? keyFn(item) === keyFn(activeRef.current as T) : item === activeRef.current
          )
        : -1

      switch (e.key) {
        case 'ArrowDown':
        case (vimKeys ? 'j' : ''):
          e.preventDefault()
          onSelect(current[currentIndex < current.length - 1 ? currentIndex + 1 : 0])
          break
        case 'ArrowUp':
        case (vimKeys ? 'k' : ''):
          e.preventDefault()
          onSelect(current[currentIndex > 0 ? currentIndex - 1 : current.length - 1])
          break
        case 'Enter':
          if (activeRef.current != null) {
            e.preventDefault()
            onConfirm?.(activeRef.current)
          }
          break
        case 'Escape':
          if (activeRef.current != null) {
            e.preventDefault()
            onClear?.()
          }
          break
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [enabled, onSelect, onClear, onConfirm, keyFn, vimKeys])
}
