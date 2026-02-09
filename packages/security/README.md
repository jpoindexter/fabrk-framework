# @fabrk/security

Security utilities for the FABRK framework, covering CSRF, CSP, rate limiting, audit logging, GDPR, bot protection, CORS, and input sanitization.

## Installation

```bash
npm install @fabrk/security
```

## Usage

```tsx
import {
  createCsrfProtection,
  generateCspHeader,
  createMemoryRateLimiter,
  createAuditLogger,
  createCorsHandler,
  getSecurityHeaders,
  InMemoryAuditStore,
} from '@fabrk/security'

// CSRF protection
const csrf = createCsrfProtection()
const token = await csrf.generateToken()
const valid = await csrf.verify(request)

// Rate limiting
const rateLimit = createMemoryRateLimiter({ defaultMax: 100, defaultWindowSeconds: 60 })
const result = await rateLimit.check({ identifier: ip, limit: 'api' })
if (!result.allowed) {
  return new Response('Too many requests', { status: 429 })
}

// Audit logging with hash chaining
const audit = createAuditLogger(new InMemoryAuditStore())
await audit.log({
  actorId: 'user_123',
  action: 'user.login',
  resourceType: 'session',
  resourceId: 'sess_456',
})
```

## Features

- **CSRF protection** - Token generation and verification using Web Crypto API with constant-time comparison to prevent timing attacks
- **CSP headers** - Content Security Policy generation with nonce support for inline scripts and styles
- **Security headers** - OWASP-compliant headers including HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy
- **Rate limiting (memory)** - Sliding window rate limiter using in-memory storage for single-server deployments
- **Rate limiting (Upstash)** - Distributed rate limiter using Upstash Redis REST API for serverless and multi-server deployments, with fail-open behavior
- **Audit logging** - Tamper-proof audit trail with SHA-256 hash chaining and chain integrity verification
- **GDPR compliance** - Email and IP anonymization, field redaction, and consent management with purpose tracking
- **Bot protection** - Heuristic-based bot detection via User-Agent analysis and honeypot field validation
- **CORS handler** - Origin validation, preflight handling, and response header application with credentials support
- **Input sanitization** - HTML escaping, HTML stripping, SQL input sanitization, URL validation, and open-redirect prevention

## API

| Export | Description |
|--------|-------------|
| `createCsrfProtection(config?)` | Create CSRF token generator and verifier |
| `generateCspHeader(config?)` | Generate a CSP header string |
| `generateNonce()` | Generate a cryptographic nonce for CSP |
| `getCspHeaderName(config?)` | Get CSP header name (standard or report-only) |
| `getSecurityHeaders(config?)` | Generate OWASP security headers |
| `applySecurityHeaders(response, config?)` | Apply security headers to a Response |
| `createMemoryRateLimiter(config?)` | Create an in-memory rate limiter |
| `createUpstashRateLimiter(config)` | Create a distributed Upstash Redis rate limiter |
| `createAuditLogger(store)` | Create an audit logger with hash chaining |
| `anonymizeEmail(email)` | Anonymize an email address |
| `anonymizeIp(ip)` | Anonymize an IP address (IPv4 and IPv6) |
| `redactFields(obj, fields)` | Redact sensitive fields from an object |
| `createConsentManager(options)` | Create a GDPR consent manager |
| `detectBot(request)` | Detect if a request is from a bot |
| `validateHoneypot(formData, fieldName?)` | Validate a honeypot field is empty |
| `createCorsHandler(config)` | Create a CORS handler for preflight and response headers |
| `escapeHtml(input)` | Escape HTML entities |
| `stripHtml(input)` | Strip all HTML tags |
| `sanitizeSqlInput(input)` | Basic SQL input sanitization |
| `sanitizeUrl(input)` | Validate and sanitize a URL (http/https only) |
| `sanitizeRedirectUrl(input, allowedHosts)` | Prevent open redirect attacks |
| `InMemoryAuditStore` | In-memory audit store for dev/testing |

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
