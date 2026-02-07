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

/**
 * Anonymize an email address for display
 */
export function anonymizeEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`
}

/**
 * Anonymize an IP address (zero last octet for IPv4)
 */
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

/**
 * Redact sensitive fields from an object
 */
export function redactFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): T {
  const result = { ...obj }
  for (const field of fields) {
    if (field in result) {
      (result as any)[field] = '[REDACTED]'
    }
  }
  return result
}

/**
 * Consent purposes
 */
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

/**
 * Create a consent manager for tracking user consent
 */
export function createConsentManager(options: {
  version: string
  defaultConsent?: Partial<Record<ConsentPurpose, boolean>>
}) {
  const consents = new Map<string, ConsentRecord>()

  return {
    /**
     * Record user consent
     */
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

      consents.set(userId, record)
      return record
    },

    /**
     * Get user consent record
     */
    getConsent(userId: string): ConsentRecord | null {
      return consents.get(userId) ?? null
    },

    /**
     * Check if user has consented to a specific purpose
     */
    hasConsent(userId: string, purpose: ConsentPurpose): boolean {
      const record = consents.get(userId)
      if (!record) return purpose === 'necessary'
      return record.purposes[purpose] ?? false
    },

    /**
     * Revoke all consent for a user
     */
    revokeConsent(userId: string): void {
      consents.delete(userId)
    },

    /**
     * Export all consent records for a user (data subject request)
     */
    exportConsent(userId: string): ConsentRecord | null {
      return consents.get(userId) ?? null
    },
  }
}
