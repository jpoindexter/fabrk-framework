# @fabrk/security — Agent Reference

Security primitives for FABRK apps: CSRF, CSP, security headers, rate limiting,
audit logging, GDPR utilities, bot protection, CORS, and input sanitization.
All crypto uses the Web Crypto API.

---

## Install

```bash
pnpm add @fabrk/security
# Optional: only needed for distributed rate limiting
pnpm add @upstash/redis
```

---

## CSRF Protection

Double-submit cookie pattern. Tokens stored in `HttpOnly` cookies; verified
against request headers. Uses `__Host-` cookie prefix in production.

```ts
import { createCsrfProtection } from '@fabrk/security'

const csrf = createCsrfProtection({
  cookieName: '__fabrk_csrf', // default; prefixed with __Host- in production
  headerName: 'x-csrf-token', // default
  tokenLength: 32,            // bytes, default 32
  secure: true,               // default: true in production
  sameSite: 'strict',         // 'strict' | 'lax' — never 'none'
})

// Generate token and set cookie on GET (e.g. in layout)
const token = await csrf.generateToken()
const cookie = csrf.createCookie(token)    // ready-to-set Set-Cookie string
// Return token to client to embed in forms / X-CSRF-Token header

// Verify on mutating requests
export async function POST(request: Request) {
  const valid = await csrf.verify(request)  // auto-skips GET/HEAD/OPTIONS
  if (!valid) return new Response('Invalid CSRF token', { status: 403 })
  // ...
}
```

GET, HEAD, and OPTIONS are automatically allowed by `verify()`.

---

## Rate Limiting

### In-Memory (single server / development)

```ts
import { createMemoryRateLimiter } from '@fabrk/security'

const rateLimit = createMemoryRateLimiter({
  defaultMax: 100,            // requests per window, default 100
  defaultWindowSeconds: 60,   // window size, default 60
  maxEntries: 10_000,         // max tracked keys, default 10000
})

const result = await rateLimit.check({
  identifier: request.headers.get('x-forwarded-for') ?? 'anon',
  limit: 'api',               // label for this rate limit bucket
  max: 50,                    // override defaultMax per call
  windowSeconds: 30,          // override defaultWindowSeconds per call
})

if (!result.allowed) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': String(result.retryAfter) },
  })
}
// result.remaining, result.limit, result.resetAt also available

await rateLimit.reset(identifier, 'api')  // clear a bucket manually
```

### Upstash Redis (distributed / serverless)

```ts
import { createUpstashRateLimiter } from '@fabrk/security'

const rateLimit = createUpstashRateLimiter({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  defaultMax: 100,
  defaultWindowSeconds: 60,
  failOpen: false,  // deny requests when Redis is unreachable (default)
})
```

Both return the same `RateLimitResult`: `{ allowed, remaining, limit, resetAt, retryAfter? }`.

---

## CSP (Content Security Policy)

```ts
import { generateCspHeader, generateNonce, getCspHeaderName } from '@fabrk/security'

const nonce = generateNonce()  // random base64 string for inline scripts

const cspValue = generateCspHeader({
  scriptSrc: [`'nonce-${nonce}'`, "'strict-dynamic'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https://cdn.example.com'],
  connectSrc: ["'self'", 'https://api.example.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  frameSrc: ["'none'"],
  reportUri: 'https://csp.example.com/report',
  reportOnly: false,  // set true to use Content-Security-Policy-Report-Only
})

const headerName = getCspHeaderName({ reportOnly: false })
// 'Content-Security-Policy'

// Apply to Next.js config:
// headers: [{ key: headerName, value: cspValue }]
```

Defaults when a directive is omitted: `script-src 'self'`, `style-src 'self' 'unsafe-inline'`,
`img-src 'self' data: blob:`, `frame-src 'none'`. Always includes `base-uri 'self'`,
`form-action 'self'`, and `upgrade-insecure-requests`.

---

## Security Headers

```ts
import { getSecurityHeaders, applySecurityHeaders } from '@fabrk/security'

const headers = getSecurityHeaders({
  hsts: true,                                    // default: true
  hstsMaxAge: 31536000,                          // default: 1 year
  frameOptions: 'DENY',                          // 'DENY' | 'SAMEORIGIN' | false
  contentTypeOptions: true,                       // default: true
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
})
// Returns Record<string, string> — spread into Next.js headers config

// Or apply directly to a Response:
const secured = applySecurityHeaders(response)
```

---

## Audit Logging

Hash-chained, tamper-evident audit log. Each event includes a SHA-256 hash of
the previous event. Concurrent writes are serialized automatically.

```ts
import { createAuditLogger, InMemoryAuditStore } from '@fabrk/security'

const audit = createAuditLogger(new InMemoryAuditStore())

// Log an event
await audit.log({
  actorId: 'user_123',
  action: 'user.login',
  resourceType: 'session',
  resourceId: 'sess_456',
  orgId: 'org_789',          // optional
  ipAddress: '127.0.0.1',   // optional
  userAgent: req.headers.get('user-agent') ?? undefined,
  metadata: { method: 'google' }, // optional
})

// Query events
const events = await audit.query({
  actorId: 'user_123',
  resourceType: 'session',
  from: new Date('2024-01-01'),
  limit: 50,
  offset: 0,
})

// Verify chain integrity
const intact = await audit.verifyChain(events)  // false = tampered
```

`InMemoryAuditStore` supports `log()` and `query()` with filtering by `orgId`,
`actorId`, `resourceType`, `resourceId`, `action`, and date range. Cap is 10,000
entries. For production, implement `AuditStore` backed by a database.

**`AuditLogInput`**: `actorId`, `action`, `resourceType`, `resourceId`,
`orgId?`, `metadata?`, `ipAddress?`, `userAgent?`

---

## Bot Protection

Heuristic detection. Does not block good bots (Googlebot, Bingbot, etc.) by
default — callers decide what to do with the result.

```ts
import { detectBot, validateHoneypot } from '@fabrk/security'

const result = detectBot(request)
// { isBot: boolean, confidence: 0-1, reason?: string, category?: 'crawler'|'scraper'|'automation'|'unknown' }

if (result.isBot && result.category !== 'crawler') {
  return new Response('Forbidden', { status: 403 })
}

// Honeypot field (should be empty for real users)
const clean = validateHoneypot(formData, '__hp_name')  // true = human
```

Signals checked: User-Agent patterns (Selenium, Puppeteer, Playwright, headless),
missing `Accept` header, missing `Accept-Language` header.

---

## CORS

```ts
import { createCorsHandler } from '@fabrk/security'

const cors = createCorsHandler({
  origins: ['https://app.example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-CSRF-Token'],
  credentials: true,   // cannot combine with origins: ['*']
  maxAge: 86400,
})

// In Next.js App Router:
export async function OPTIONS(request: Request) {
  return cors.preflight(request)  // 204 with CORS headers
}

export async function GET(request: Request) {
  const response = Response.json({ data: 'hello' })
  return cors.apply(request, response)  // clones response, adds CORS headers
}

cors.isAllowed('https://app.example.com')  // boolean — check before processing
```

---

## GDPR Utilities

```ts
import {
  anonymizeEmail, anonymizeIp, redactFields, createConsentManager,
} from '@fabrk/security'

anonymizeEmail('user@example.com')  // 'u****@example.com'
anonymizeIp('192.168.1.100')        // '192.168.1.0'
anonymizeIp('2001:db8:85a3::1')     // '2001:db8:85a3::0'

redactFields({ email: 'x', password: 'y', name: 'z' }, ['password'])
// { email: 'x', password: '[REDACTED]', name: 'z' }

const consent = createConsentManager({ version: '1.0' })
consent.setConsent('user_123', { analytics: true, marketing: false })
consent.hasConsent('user_123', 'analytics')  // true
consent.hasConsent('user_123', 'necessary')  // always true
consent.revokeConsent('user_123')
```

`ConsentPurpose`: `'necessary' | 'analytics' | 'marketing' | 'personalization' | 'third_party'`

---

## Input Sanitization

```ts
import { escapeHtml, stripHtml, sanitizeUrl, sanitizeRedirectUrl } from '@fabrk/security'

escapeHtml('<script>alert(1)</script>')  // '&lt;script&gt;alert(1)&lt;/script&gt;'
stripHtml('<b>Hello</b> world')          // 'Hello world'
sanitizeUrl('javascript:alert(1)')       // '#'
sanitizeUrl('https://example.com')       // 'https://example.com'
sanitizeRedirectUrl('/dashboard', 'https://myapp.com')  // '/dashboard'
```

Note: `sanitizeSqlInput` is intentionally not exported — use parameterized queries instead.

---

## Example: Next.js Middleware with CSRF + Rate Limiting

```ts
// middleware.ts
import { createCsrfProtection, createMemoryRateLimiter } from '@fabrk/security'

const csrf = createCsrfProtection()
const rateLimit = createMemoryRateLimiter({ defaultMax: 60, defaultWindowSeconds: 60 })

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'

  const rl = await rateLimit.check({ identifier: ip, limit: 'global' })
  if (!rl.allowed) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter) },
    })
  }

  const csrfOk = await csrf.verify(request)
  if (!csrfOk) return new Response('Invalid CSRF token', { status: 403 })

  return Response.next()
}

export const config = { matcher: '/api/:path*' }
```
