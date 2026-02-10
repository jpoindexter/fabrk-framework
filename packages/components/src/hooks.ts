/**
 * UI Utility Hooks for FABRK Components
 *
 * Responsive breakpoints, debounce, localStorage, clipboard, scroll lock,
 * click outside, intersection observer, window size, list keyboard nav.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ============================================================================
// useMediaQuery
// ============================================================================

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

// ============================================================================
// useDebounce
// ============================================================================

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

// ============================================================================
// useLocalStorage
// ============================================================================

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

// ============================================================================
// useClickOutside
// ============================================================================

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
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return
      handler(event)
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

// ============================================================================
// useCopyToClipboard
// ============================================================================

/**
 * Copy text to clipboard with a timed success state.
 * @param resetDelay - How long `copied` stays true (default 2000ms)
 * @example
 * ```tsx
 * const { copy, copied } = useCopyToClipboard()
 * <button onClick={() => copy('hello')}>{copied ? 'COPIED' : '> COPY'}</button>
 * ```
 */
export function useCopyToClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setCopied(false), resetDelay)
      } catch {
        setCopied(false)
      }
    },
    [resetDelay]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { copy, copied }
}

// ============================================================================
// useBodyScrollLock
// ============================================================================

/**
 * Lock body scroll (for modals/drawers). Compensates for scrollbar width.
 * @param isLocked - Whether to lock body scroll
 * @example
 * ```tsx
 * useBodyScrollLock(isModalOpen)
 * ```
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return

    const scrollY = window.scrollY
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`

    // iOS fallback
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    if (isIOS) {
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      if (isIOS) {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isLocked])
}

// ============================================================================
// useIntersectionObserver
// ============================================================================

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

// ============================================================================
// useWindowSize
// ============================================================================

/**
 * Track window dimensions reactively.
 * @example
 * ```tsx
 * const { width, height } = useWindowSize()
 * ```
 */
export function useWindowSize(): { width: number; height: number } {
  const [size, setSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }))

  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return size
}

// ============================================================================
// usePrevious
// ============================================================================

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

// ============================================================================
// useListKeyboardNav
// ============================================================================

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

// ============================================================================
// useViewHistory
// ============================================================================

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
