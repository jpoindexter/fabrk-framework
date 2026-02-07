/**
 * Security package types
 */

import type { AuditStore, AuditEvent, RateLimitResult } from '@fabrk/core'

// Re-export for convenience
export type { AuditStore, AuditEvent }

export interface CsrfConfig {
  /** Cookie name (default: '__fabrk_csrf') */
  cookieName?: string
  /** Header name (default: 'x-csrf-token') */
  headerName?: string
  /** Token length in bytes (default: 32) */
  tokenLength?: number
  /** Cookie secure flag (default: true in production) */
  secure?: boolean
  /** Cookie sameSite (default: 'strict') */
  sameSite?: 'strict' | 'lax' | 'none'
}

export interface CspConfig {
  /** Script sources */
  scriptSrc?: string[]
  /** Style sources */
  styleSrc?: string[]
  /** Image sources */
  imgSrc?: string[]
  /** Connect sources (for fetch/XHR) */
  connectSrc?: string[]
  /** Font sources */
  fontSrc?: string[]
  /** Frame sources */
  frameSrc?: string[]
  /** Report URI */
  reportUri?: string
  /** Whether to use report-only mode */
  reportOnly?: boolean
}

export interface SecurityHeadersConfig {
  /** Enable HSTS (default: true) */
  hsts?: boolean
  /** HSTS max-age in seconds (default: 31536000) */
  hstsMaxAge?: number
  /** Enable X-Frame-Options (default: DENY) */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false
  /** Enable X-Content-Type-Options (default: true) */
  contentTypeOptions?: boolean
  /** Referrer-Policy (default: strict-origin-when-cross-origin) */
  referrerPolicy?: string
  /** Permissions-Policy directives */
  permissionsPolicy?: Record<string, string[]>
}

export interface CorsConfig {
  /** Allowed origins */
  origins: string[]
  /** Allowed methods (default: GET, POST, PUT, DELETE, OPTIONS) */
  methods?: string[]
  /** Allowed headers */
  allowedHeaders?: string[]
  /** Exposed headers */
  exposedHeaders?: string[]
  /** Whether to allow credentials (default: false) */
  credentials?: boolean
  /** Max age for preflight cache in seconds (default: 86400) */
  maxAge?: number
}

export interface MemoryRateLimitConfig {
  /** Default max requests per window */
  defaultMax?: number
  /** Default window size in seconds */
  defaultWindowSeconds?: number
}

export interface UpstashRateLimitConfig {
  /** Upstash Redis REST URL */
  url: string
  /** Upstash Redis REST token */
  token: string
  /** Default max requests per window */
  defaultMax?: number
  /** Default window size in seconds */
  defaultWindowSeconds?: number
}

/**
 * In-memory audit store for development/testing
 */
export class InMemoryAuditStore implements AuditStore {
  private events: AuditEvent[] = []

  async log(event: AuditEvent): Promise<void> {
    this.events.push(event)
  }

  async query(options: {
    orgId?: string
    actorId?: string
    resourceType?: string
    resourceId?: string
    action?: string
    from?: Date
    to?: Date
    limit?: number
    offset?: number
  }): Promise<AuditEvent[]> {
    let filtered = [...this.events]

    if (options.orgId) filtered = filtered.filter((e) => e.orgId === options.orgId)
    if (options.actorId) filtered = filtered.filter((e) => e.actorId === options.actorId)
    if (options.resourceType) filtered = filtered.filter((e) => e.resourceType === options.resourceType)
    if (options.resourceId) filtered = filtered.filter((e) => e.resourceId === options.resourceId)
    if (options.action) filtered = filtered.filter((e) => e.action === options.action)
    if (options.from) filtered = filtered.filter((e) => e.timestamp >= options.from!)
    if (options.to) filtered = filtered.filter((e) => e.timestamp <= options.to!)

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    const offset = options.offset ?? 0
    const limit = options.limit ?? 100

    return filtered.slice(offset, offset + limit)
  }
}
