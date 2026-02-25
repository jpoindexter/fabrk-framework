/**
 * CookieConsent - GDPR-compliant cookie consent banner with granular preference controls.
 * Persists user choices to localStorage. Also exports `useCookieConsent` hook for programmatic access.
 *
 * @example
 * ```tsx
 * <CookieConsent
 *   onAcceptAll={(prefs) => initAnalytics(prefs)}
 *   onRejectAll={(prefs) => console.log('rejected', prefs)}
 * />
 * ```
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export interface CookiePreferences {
  necessary: boolean
  preferences: boolean
  statistics: boolean
  marketing: boolean
}

export interface CookieConsentProps {
  onAcceptAll?: (prefs: CookiePreferences) => void
  onAcceptSelected?: (prefs: CookiePreferences) => void
  onRejectAll?: (prefs: CookiePreferences) => void
  cookieKey?: string
  className?: string
}

const DEFAULT_PREFS: CookiePreferences = {
  necessary: true,
  preferences: false,
  statistics: false,
  marketing: false,
}

const ALL_ACCEPTED: CookiePreferences = {
  necessary: true,
  preferences: true,
  statistics: true,
  marketing: true,
}

const ALL_REJECTED: CookiePreferences = {
  necessary: true,
  preferences: false,
  statistics: false,
  marketing: false,
}

export function useCookieConsent(cookieKey = 'cookie-consent') {
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFS)
  const [hasConsented, setHasConsented] = useState(true) // Default to true to prevent flash

  useEffect(() => {
    try {
      const stored = localStorage.getItem(cookieKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Validate that parsed value is an object with expected boolean properties
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          typeof parsed.necessary === 'boolean' &&
          typeof parsed.preferences === 'boolean' &&
          typeof parsed.statistics === 'boolean' &&
          typeof parsed.marketing === 'boolean'
        ) {
          setPreferences(parsed as CookiePreferences)
          setHasConsented(true)
        } else {
          // Invalid shape — treat as no consent
          setHasConsented(false)
        }
      } else {
        setHasConsented(false)
      }
    } catch {
      setHasConsented(false)
    }
  }, [cookieKey])

  const save = useCallback(
    (prefs: CookiePreferences) => {
      setPreferences(prefs)
      setHasConsented(true)
      try {
        localStorage.setItem(cookieKey, JSON.stringify(prefs))
      } catch {
        // localStorage unavailable
      }
    },
    [cookieKey]
  )

  return { preferences, setPreferences, hasConsented, save }
}

export function CookieConsent({
  onAcceptAll,
  onAcceptSelected,
  onRejectAll,
  cookieKey = 'cookie-consent',
  className,
}: CookieConsentProps) {
  const { preferences, setPreferences, hasConsented, save } =
    useCookieConsent(cookieKey)

  if (hasConsented) return null

  const handleAcceptAll = () => {
    save(ALL_ACCEPTED)
    onAcceptAll?.(ALL_ACCEPTED)
  }

  const handleAcceptSelected = () => {
    const prefs = { ...preferences, necessary: true }
    save(prefs)
    onAcceptSelected?.(prefs)
  }

  const handleRejectAll = () => {
    save(ALL_REJECTED)
    onRejectAll?.(ALL_REJECTED)
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-[var(--grid-6)]',
        mode.font,
        className
      )}
    >
      <div className="mx-auto max-w-4xl space-y-[var(--grid-4)]">
        <div>
          <p className="text-sm font-medium text-foreground">
            [ COOKIE PREFERENCES ]
          </p>
          <p className="mt-[var(--grid-1)] text-xs text-muted-foreground">
            We use cookies to improve your experience. You can customize your
            preferences below.
          </p>
        </div>

        <div className="space-y-[var(--grid-2)]">
          {(['preferences', 'statistics', 'marketing'] as const).map((key) => (
            <label
              key={key}
              className="flex items-center gap-[var(--grid-2)] text-xs"
            >
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={(e) =>
                  setPreferences({ ...preferences, [key]: e.target.checked })
                }
                className="h-3 w-3"
              />
              <span className="text-foreground">{key.toUpperCase()}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-[var(--grid-2)] sm:flex-row">
          <button
            type="button"
            onClick={handleAcceptAll}
            className={cn(
              'flex-1 bg-primary px-[2ch] py-[var(--grid-2)] text-xs text-primary-foreground transition-colors hover:bg-primary/90',
              mode.radius
            )}
          >
            ACCEPT ALL
          </button>
          <button
            type="button"
            onClick={handleAcceptSelected}
            className={cn(
              'flex-1 border border-border bg-background px-[2ch] py-[var(--grid-2)] text-xs text-foreground transition-colors hover:bg-muted',
              mode.radius
            )}
          >
            ACCEPT SELECTED
          </button>
          <button
            type="button"
            onClick={handleRejectAll}
            className={cn(
              'flex-1 border border-border bg-background px-[2ch] py-[var(--grid-2)] text-xs text-foreground transition-colors hover:bg-muted',
              mode.radius
            )}
          >
            REJECT ALL
          </button>
        </div>
      </div>
    </div>
  )
}
