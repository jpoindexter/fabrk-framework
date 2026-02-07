/**
 * @fabrk/security
 *
 * Security utilities for the FABRK framework.
 * CSRF, CSP, rate limiting, audit logging, GDPR, bot protection, CORS.
 */

// CSRF
export { createCsrfProtection } from './csrf'
export type { CsrfProtection } from './csrf'

// CSP
export { generateCspHeader, generateNonce, getCspHeaderName } from './csp'

// Security Headers
export { getSecurityHeaders, applySecurityHeaders } from './headers'

// Rate Limiting
export { createMemoryRateLimiter } from './rate-limit/memory'
export { createUpstashRateLimiter } from './rate-limit/upstash'

// Audit Logging
export { createAuditLogger } from './audit/logger'
export type { AuditLogger, AuditLogInput } from './audit/logger'

// GDPR
export {
  anonymizeEmail,
  anonymizeIp,
  redactFields,
  createConsentManager,
} from './gdpr'
export type { ConsentPurpose, ConsentRecord } from './gdpr'

// Bot Protection
export { detectBot, validateHoneypot } from './bot-protection'
export type { BotDetectionResult } from './bot-protection'

// CORS
export { createCorsHandler } from './cors'
export type { CorsHandler } from './cors'

// Input Validation
export {
  escapeHtml,
  stripHtml,
  sanitizeSqlInput,
  sanitizeUrl,
  sanitizeRedirectUrl,
} from './validation'

// Types & Stores
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
