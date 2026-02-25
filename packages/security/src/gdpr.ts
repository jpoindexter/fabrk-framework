/**
 * GDPR Compliance Helpers
 *
 * Utilities for handling data subject requests,
 * consent management, and data anonymization.
 *
 * @example
 * ```ts
 * import { anonymizeEmail, anonymizeIp, createConsentManager } from '@fabrk/security'
 *
 * const email = anonymizeEmail('user@example.com') // 'u***@example.com'
 * const ip = anonymizeIp('192.168.1.100')          // '192.168.1.0'
 * ```
 */

export function anonymizeEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`
}

export function anonymizeIp(ip: string): string {
  if (ip.includes(':')) {
    // IPv6 — zero last 80 bits
    const parts = ip.split(':')
    return parts.slice(0, 3).join(':') + '::0'
  }

  // IPv4 — zero last octet
  const parts = ip.split('.')
  if (parts.length !== 4) return '0.0.0.0'
  parts[3] = '0'
  return parts.join('.')
}

export function redactFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): T {
  const result = { ...obj } as Record<string, unknown>
  for (const field of fields) {
    if (field in result) {
      result[field] = '[REDACTED]'
    }
  }
  return result as T
}

export type ConsentPurpose =
  | 'necessary'
  | 'analytics'
  | 'marketing'
  | 'personalization'
  | 'third_party'

export interface ConsentRecord {
  userId: string
  purposes: Record<ConsentPurpose, boolean>
  timestamp: Date
  ipAddress?: string
  version: string
}

export function createConsentManager(options: {
  version: string
  defaultConsent?: Partial<Record<ConsentPurpose, boolean>>
  maxEntries?: number
}) {
  const consents = new Map<string, ConsentRecord>()
  const maxEntries = options.maxEntries ?? 10_000

  return {
    setConsent(
      userId: string,
      purposes: Partial<Record<ConsentPurpose, boolean>>,
      ipAddress?: string
    ): ConsentRecord {
      const record: ConsentRecord = {
        userId,
        purposes: {
          analytics: false,
          marketing: false,
          personalization: false,
          third_party: false,
          ...options.defaultConsent,
          ...purposes,
          necessary: true, // Always required, cannot be overridden
        },
        timestamp: new Date(),
        ipAddress,
        version: options.version,
      }

      // Evict oldest entry (FIFO via Map insertion order) to prevent unbounded growth
      if (consents.size >= maxEntries && !consents.has(userId)) {
        const oldest = consents.keys().next().value
        if (oldest !== undefined) consents.delete(oldest)
      }

      consents.set(userId, record)
      return record
    },

    getConsent(userId: string): ConsentRecord | null {
      return consents.get(userId) ?? null
    },

    hasConsent(userId: string, purpose: ConsentPurpose): boolean {
      const record = consents.get(userId)
      if (!record) return purpose === 'necessary'
      return record.purposes[purpose] ?? false
    },

    revokeConsent(userId: string): void {
      consents.delete(userId)
    },
  }
}
