'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

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
