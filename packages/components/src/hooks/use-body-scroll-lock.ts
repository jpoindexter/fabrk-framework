'use client'

import { useEffect } from 'react'

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
