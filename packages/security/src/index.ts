/**
 * @fabrk/security
 *
 * Security utilities for the FABRK framework.
 * CSRF, CSP, rate limiting, audit logging, GDPR, bot protection, CORS.
 */

export { createCsrfProtection } from './csrf'
export type { CsrfProtection } from './csrf'

export { generateCspHeader, generateNonce, getCspHeaderName } from './csp'

export { getSecurityHeaders, applySecurityHeaders } from './headers'

export { createMemoryRateLimiter } from './rate-limit/memory'
export { createUpstashRateLimiter } from './rate-limit/upstash'

export { createAuditLogger } from './audit/logger'
export type { AuditLogger, AuditLogInput } from './audit/logger'

export {
  anonymizeEmail,
  anonymizeIp,
  redactFields,
  createConsentManager,
} from './gdpr'
export type { ConsentPurpose, ConsentRecord } from './gdpr'

export { detectBot, validateHoneypot } from './bot-protection'
export type { BotDetectionResult } from './bot-protection'

export { createCorsHandler } from './cors'
export type { CorsHandler } from './cors'

export {
  escapeHtml,
  stripHtml,
  sanitizeUrl,
  sanitizeRedirectUrl,
} from './validation'

export { InMemoryAuditStore } from './types'
export type {
  CsrfConfig,
  CspConfig,
  SecurityHeadersConfig,
  CorsConfig,
  MemoryRateLimitConfig,
  UpstashRateLimitConfig,
  AuditStore,
  AuditEvent,
} from './types'
