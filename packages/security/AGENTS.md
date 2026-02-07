# @fabrk/security — AGENTS.md

> Security utilities for the FABRK framework

## Overview

| | |
|---|---|
| **Package** | `@fabrk/security` |
| **Language** | TypeScript |
| **Features** | CSRF, CSP, rate limiting, audit logging, GDPR, bot protection, CORS, input validation |
| **Pattern** | Zero-dependency security primitives (Web Crypto API) |

## Quick Start

```ts
import { createCsrfProtection, createAuditLogger, createMemoryRateLimiter } from '@fabrk/security'

// CSRF protection
const csrf = createCsrfProtection()
const token = await csrf.generateToken()
const valid = await csrf.verify(request)

// Audit logging (tamper-proof)
const audit = createAuditLogger(new InMemoryAuditStore())
await audit.log({
  actorId: 'user_1',
  action: 'user.login',
  resourceType: 'session',
  resourceId: 'sess_1',
})

// Rate limiting
const limiter = createMemoryRateLimiter()
const result = await limiter.check({ identifier: ip, limit: 'api', max: 100 })
```

## Exports

### CSRF
| Export | Description |
|--------|-------------|
| `createCsrfProtection` | Token generation, cookie creation, request verification |

### CSP & Headers
| Export | Description |
|--------|-------------|
| `generateCspHeader` | Build Content-Security-Policy header string |
| `generateNonce` | Generate random nonce for inline scripts |
| `getSecurityHeaders` | Get all security headers as an object |
| `applySecurityHeaders` | Apply security headers to a Response |

### Rate Limiting
| Export | Description |
|--------|-------------|
| `createMemoryRateLimiter` | In-memory sliding window rate limiter |
| `createUpstashRateLimiter` | Redis-backed rate limiter via Upstash |

### Audit Logging
| Export | Description |
|--------|-------------|
| `createAuditLogger` | Tamper-proof audit logger with SHA-256 hash chaining |
| `InMemoryAuditStore` | In-memory store for dev/testing |

### GDPR
| Export | Description |
|--------|-------------|
| `anonymizeEmail` | Mask email addresses |
| `anonymizeIp` | Mask IP addresses |
| `redactFields` | Remove sensitive fields from objects |
| `createConsentManager` | Manage user consent records |

### Bot Protection
| Export | Description |
|--------|-------------|
| `detectBot` | Detect bots from User-Agent and headers |
| `validateHoneypot` | Check honeypot fields |

### CORS
| Export | Description |
|--------|-------------|
| `createCorsHandler` | Configure CORS with origins, methods, headers |

### Input Validation
| Export | Description |
|--------|-------------|
| `escapeHtml` | Escape HTML entities (XSS prevention) |
| `stripHtml` | Remove all HTML tags |
| `sanitizeSqlInput` | Basic SQL injection prevention |
| `sanitizeUrl` | Validate and sanitize URLs |
| `sanitizeRedirectUrl` | Prevent open redirect attacks |

## Key Design Decisions

- **Timing-safe comparison** for CSRF token verification
- **Hash chaining** in audit logs (each event includes SHA-256 of previous)
- **Web Crypto API** — no Node.js crypto dependency
- All rate limiters implement `RateLimitAdapter` from `@fabrk/core`

## Peer Dependencies

- `@upstash/redis` — Required for Upstash rate limiter (optional)

## Commands

```bash
pnpm build        # Build with tsup (ESM + CJS + DTS)
pnpm dev          # Watch mode
pnpm test         # Run tests (CSRF, audit logger)
```
