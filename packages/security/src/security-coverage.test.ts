import { describe, it, expect, vi } from 'vitest'

import { generateCspHeader, getCspHeaderName } from './csp'
import { createCorsHandler } from './cors'
import { createMemoryRateLimiter } from './rate-limit/memory'
import { detectBot, validateHoneypot } from './bot-protection'
import { anonymizeEmail, anonymizeIp, redactFields, createConsentManager } from './gdpr'
import { getSecurityHeaders } from './headers'
import { escapeHtml, stripHtml, sanitizeUrl, sanitizeRedirectUrl } from './validation'

// ---------------------------------------------------------------------------
// CSP
// ---------------------------------------------------------------------------

describe('generateCspHeader', () => {
  it('includes default-src self in default header', () => {
    const csp = generateCspHeader()
    expect(csp).toContain("default-src 'self'")
  })

  it('includes all required default directives', () => {
    const csp = generateCspHeader()
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("img-src 'self' data: blob:")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("font-src 'self'")
    expect(csp).toContain("frame-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain('upgrade-insecure-requests')
  })

  it('uses custom scriptSrc when provided', () => {
    const csp = generateCspHeader({ scriptSrc: ["'self'", 'https://cdn.example.com'] })
    expect(csp).toContain("script-src 'self' https://cdn.example.com")
  })

  it('uses custom styleSrc when provided', () => {
    const csp = generateCspHeader({ styleSrc: ["'self'"] })
    expect(csp).toContain("style-src 'self'")
    expect(csp).not.toContain("'unsafe-inline'")
  })

  it('uses custom imgSrc when provided', () => {
    const csp = generateCspHeader({ imgSrc: ["'self'", 'https://images.example.com'] })
    expect(csp).toContain("img-src 'self' https://images.example.com")
  })

  it('appends report-uri when provided', () => {
    const csp = generateCspHeader({ reportUri: 'https://csp.example.com/report' })
    expect(csp).toContain('report-uri https://csp.example.com/report')
  })

  it('throws on semicolon injection in directive value', () => {
    expect(() =>
      generateCspHeader({ scriptSrc: ["'self'; default-src *"] })
    ).toThrow('Invalid CSP directive value')
  })

  it('throws on newline injection in directive value', () => {
    expect(() =>
      generateCspHeader({ scriptSrc: ["'self'\nX-Injected: header"] })
    ).toThrow('Invalid CSP directive value')
  })

  it('throws on carriage return injection in directive value', () => {
    expect(() =>
      generateCspHeader({ reportUri: "https://csp.example.com\rX-Bad: yes" })
    ).toThrow('Invalid CSP directive value')
  })

  it('separates directives with semicolons', () => {
    const csp = generateCspHeader()
    expect(csp.split('; ').length).toBeGreaterThan(5)
  })
})

describe('getCspHeaderName', () => {
  it('returns Content-Security-Policy by default', () => {
    expect(getCspHeaderName()).toBe('Content-Security-Policy')
  })

  it('returns report-only header name when configured', () => {
    expect(getCspHeaderName({ reportOnly: true })).toBe('Content-Security-Policy-Report-Only')
  })

  it('returns enforcement header name when reportOnly is false', () => {
    expect(getCspHeaderName({ reportOnly: false })).toBe('Content-Security-Policy')
  })
})

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

function makeRequest(origin: string, extra: Record<string, string> = {}): Request {
  return new Request('https://api.example.com/data', {
    headers: { Origin: origin, ...extra },
  })
}

describe('createCorsHandler', () => {
  it('throws when wildcard origin is combined with credentials', () => {
    expect(() =>
      createCorsHandler({ origins: ['*'], credentials: true })
    ).toThrow('CORS')
  })

  it('isAllowed returns true for listed origin', () => {
    const cors = createCorsHandler({ origins: ['https://app.example.com'] })
    expect(cors.isAllowed('https://app.example.com')).toBe(true)
  })

  it('isAllowed returns false for unlisted origin', () => {
    const cors = createCorsHandler({ origins: ['https://app.example.com'] })
    expect(cors.isAllowed('https://evil.com')).toBe(false)
  })

  it('isAllowed returns true for any origin when wildcard is set', () => {
    const cors = createCorsHandler({ origins: ['*'] })
    expect(cors.isAllowed('https://anything.com')).toBe(true)
  })

  it('preflight returns 204', () => {
    const cors = createCorsHandler({ origins: ['https://app.example.com'] })
    const res = cors.preflight(makeRequest('https://app.example.com'))
    expect(res.status).toBe(204)
  })

  it('preflight includes ACAO header for allowed origin', () => {
    const cors = createCorsHandler({ origins: ['https://app.example.com'] })
    const res = cors.preflight(makeRequest('https://app.example.com'))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com')
  })

  it('preflight returns bare 204 with no CORS headers for disallowed origin', () => {
    const cors = createCorsHandler({ origins: ['https://app.example.com'] })
    const res = cors.preflight(makeRequest('https://evil.com'))
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('preflight sets Access-Control-Allow-Methods', () => {
    const cors = createCorsHandler({ origins: ['https://app.example.com'], methods: ['GET', 'POST'] })
    const res = cors.preflight(makeRequest('https://app.example.com'))
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST')
  })

  it('sets wildcard ACAO for wildcard origins', () => {
    const cors = createCorsHandler({ origins: ['*'] })
    const res = cors.preflight(makeRequest('https://random.com'))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('sets Vary: Origin for non-wildcard origins', () => {
    const cors = createCorsHandler({ origins: ['https://app.example.com'] })
    const headers = cors.getHeaders(makeRequest('https://app.example.com'))
    expect(headers['Vary']).toBe('Origin')
  })

  it('does not set Vary header for wildcard origins', () => {
    const cors = createCorsHandler({ origins: ['*'] })
    const headers = cors.getHeaders(makeRequest('https://random.com'))
    expect(headers['Vary']).toBeUndefined()
  })

  it('sets credentials header when credentials: true', () => {
    const cors = createCorsHandler({ origins: ['https://app.example.com'], credentials: true })
    const headers = cors.getHeaders(makeRequest('https://app.example.com'))
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
  })

  it('does not set credentials header when credentials: false', () => {
    const cors = createCorsHandler({ origins: ['https://app.example.com'], credentials: false })
    const headers = cors.getHeaders(makeRequest('https://app.example.com'))
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined()
  })

  it('apply copies CORS headers onto the response', () => {
    const cors = createCorsHandler({ origins: ['https://app.example.com'] })
    const original = new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
    const modified = cors.apply(makeRequest('https://app.example.com'), original)
    expect(modified.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com')
    expect(modified.headers.get('Content-Type')).toBe('application/json')
  })

  it('sets exposed headers when configured', () => {
    const cors = createCorsHandler({
      origins: ['https://app.example.com'],
      exposedHeaders: ['X-Custom-Header'],
    })
    const headers = cors.getHeaders(makeRequest('https://app.example.com'))
    expect(headers['Access-Control-Expose-Headers']).toBe('X-Custom-Header')
  })
})

// ---------------------------------------------------------------------------
// Memory Rate Limiter
// ---------------------------------------------------------------------------

describe('createMemoryRateLimiter', () => {
  it('allows requests under the limit', async () => {
    const limiter = createMemoryRateLimiter({ defaultMax: 5, defaultWindowSeconds: 60 })
    const result = await limiter.check({ identifier: 'user-1', limit: 'api', max: 5 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
    await limiter.destroy?.()
  })

  it('blocks when limit is exceeded', async () => {
    const limiter = createMemoryRateLimiter({ defaultMax: 2, defaultWindowSeconds: 60 })
    await limiter.check({ identifier: 'user-2', limit: 'api', max: 2 })
    await limiter.check({ identifier: 'user-2', limit: 'api', max: 2 })
    const result = await limiter.check({ identifier: 'user-2', limit: 'api', max: 2 })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
    await limiter.destroy?.()
  })

  it('resets count after window expires', async () => {
    vi.useFakeTimers()
    const limiter = createMemoryRateLimiter({ defaultMax: 1, defaultWindowSeconds: 1 })

    await limiter.check({ identifier: 'user-3', limit: 'api', max: 1 })
    const blocked = await limiter.check({ identifier: 'user-3', limit: 'api', max: 1 })
    expect(blocked.allowed).toBe(false)

    vi.advanceTimersByTime(2000)

    const allowed = await limiter.check({ identifier: 'user-3', limit: 'api', max: 1 })
    expect(allowed.allowed).toBe(true)

    vi.useRealTimers()
    await limiter.destroy?.()
  })

  it('tracks separate buckets per identifier', async () => {
    const limiter = createMemoryRateLimiter({ defaultMax: 1, defaultWindowSeconds: 60 })
    const r1 = await limiter.check({ identifier: 'user-a', limit: 'api', max: 1 })
    const r2 = await limiter.check({ identifier: 'user-b', limit: 'api', max: 1 })
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    await limiter.destroy?.()
  })

  it('reset clears the counter for an identifier', async () => {
    const limiter = createMemoryRateLimiter({ defaultMax: 1, defaultWindowSeconds: 60 })
    await limiter.check({ identifier: 'user-4', limit: 'api', max: 1 })
    const blocked = await limiter.check({ identifier: 'user-4', limit: 'api', max: 1 })
    expect(blocked.allowed).toBe(false)

    await limiter.reset('user-4', 'api')

    const allowed = await limiter.check({ identifier: 'user-4', limit: 'api', max: 1 })
    expect(allowed.allowed).toBe(true)
    await limiter.destroy?.()
  })

  it('returns correct limit value', async () => {
    const limiter = createMemoryRateLimiter({ defaultMax: 10, defaultWindowSeconds: 60 })
    const result = await limiter.check({ identifier: 'user-5', limit: 'api', max: 10 })
    expect(result.limit).toBe(10)
    await limiter.destroy?.()
  })

  it('evicts expired entries when maxEntries is reached', async () => {
    vi.useFakeTimers()
    const limiter = createMemoryRateLimiter({
      defaultMax: 100,
      defaultWindowSeconds: 1,
      maxEntries: 2,
    })

    await limiter.check({ identifier: 'e1', limit: 'api', max: 100 })
    await limiter.check({ identifier: 'e2', limit: 'api', max: 100 })

    vi.advanceTimersByTime(2000)

    // Third entry triggers prune — both prior entries are expired, so new entry is created cleanly
    const result = await limiter.check({ identifier: 'e3', limit: 'api', max: 100 })
    expect(result.allowed).toBe(true)

    vi.useRealTimers()
    await limiter.destroy?.()
  })

  it('isConfigured returns true', () => {
    const limiter = createMemoryRateLimiter()
    expect(limiter.isConfigured()).toBe(true)
    limiter.destroy?.()
  })
})

// ---------------------------------------------------------------------------
// Bot Detection
// ---------------------------------------------------------------------------

function botRequest(headers: Record<string, string>): Request {
  return new Request('https://example.com/', { headers })
}

describe('detectBot', () => {
  it('flags missing User-Agent with high confidence', () => {
    const result = detectBot(botRequest({}))
    expect(result.isBot).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.8)
    expect(result.reason).toMatch(/User-Agent/i)
    expect(result.category).toBe('automation')
  })

  it('flags known good bots (Googlebot) as crawler', () => {
    const result = detectBot(botRequest({ 'User-Agent': 'Googlebot/2.1' }))
    expect(result.isBot).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.9)
    expect(result.category).toBe('crawler')
  })

  it('flags Bingbot as known bot', () => {
    const result = detectBot(botRequest({ 'User-Agent': 'Bingbot/2.0' }))
    expect(result.isBot).toBe(true)
    expect(result.category).toBe('crawler')
  })

  it('flags generic bot UA pattern', () => {
    const result = detectBot(botRequest({
      'User-Agent': 'some-custom-bot/1.0',
      'Accept-Language': 'en-US',
      'Accept': 'text/html',
    }))
    expect(result.isBot).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('flags headless browser UA', () => {
    const result = detectBot(botRequest({
      'User-Agent': 'Mozilla/5.0 HeadlessChrome/120',
      'Accept-Language': 'en-US',
      'Accept': 'text/html',
    }))
    expect(result.isBot).toBe(true)
  })

  it('does not flag normal browser UA with full headers', () => {
    const result = detectBot(botRequest({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }))
    expect(result.isBot).toBe(false)
    expect(result.confidence).toBeLessThan(0.7)
  })

  it('raises confidence for missing Accept-Language but does not auto-flag', () => {
    const result = detectBot(botRequest({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/120',
      'Accept': 'text/html',
    }))
    expect(result.confidence).toBeGreaterThanOrEqual(0.3)
    expect(result.isBot).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Honeypot Validation
// ---------------------------------------------------------------------------

describe('validateHoneypot', () => {
  it('passes when FormData honeypot field is empty', () => {
    const fd = new FormData()
    fd.append('__hp_field', '')
    expect(validateHoneypot(fd)).toBe(true)
  })

  it('passes when FormData honeypot field is absent', () => {
    const fd = new FormData()
    expect(validateHoneypot(fd)).toBe(true)
  })

  it('fails when FormData honeypot field is filled', () => {
    const fd = new FormData()
    fd.append('__hp_field', 'bot-filled')
    expect(validateHoneypot(fd)).toBe(false)
  })

  it('passes when plain object honeypot field is empty string', () => {
    expect(validateHoneypot({ __hp_field: '' })).toBe(true)
  })

  it('passes when plain object honeypot field is absent', () => {
    expect(validateHoneypot({})).toBe(true)
  })

  it('fails when plain object honeypot field is filled', () => {
    expect(validateHoneypot({ __hp_field: 'filled' })).toBe(false)
  })

  it('supports custom field names', () => {
    const fd = new FormData()
    fd.append('my_trap', 'bot-data')
    expect(validateHoneypot(fd, 'my_trap')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// GDPR
// ---------------------------------------------------------------------------

describe('anonymizeEmail', () => {
  it('keeps first character and masks local part', () => {
    // "user" has 4 chars -> min(3, 5) = 3 stars
    expect(anonymizeEmail('user@example.com')).toBe('u***@example.com')
  })

  it('preserves domain', () => {
    const result = anonymizeEmail('john.doe@company.org')
    expect(result).toContain('@company.org')
  })

  it('returns fallback for malformed input', () => {
    expect(anonymizeEmail('notanemail')).toBe('***@***')
  })

  it('caps asterisks at 5 for long local parts', () => {
    const result = anonymizeEmail('verylongusername@example.com')
    const local = result.split('@')[0]
    expect(local).toMatch(/^v\*{5}$/)
  })

  it('handles single-character local part', () => {
    const result = anonymizeEmail('a@example.com')
    expect(result).toBe('a@example.com')
  })
})

describe('anonymizeIp', () => {
  it('zeros last octet of IPv4', () => {
    expect(anonymizeIp('192.168.1.100')).toBe('192.168.1.0')
  })

  it('zeros last octet for different IPv4', () => {
    expect(anonymizeIp('10.0.0.255')).toBe('10.0.0.0')
  })

  it('truncates IPv6 to first 3 groups', () => {
    const result = anonymizeIp('2001:db8:85a3::8a2e:370:7334')
    expect(result).toBe('2001:db8:85a3::0')
  })

  it('handles malformed IPv4 with fallback', () => {
    expect(anonymizeIp('not.valid')).toBe('0.0.0.0')
  })
})

describe('redactFields', () => {
  it('replaces specified fields with [REDACTED]', () => {
    const result = redactFields({ name: 'Alice', password: 'secret', age: 30 }, ['password'])
    expect(result.password).toBe('[REDACTED]')
    expect(result.name).toBe('Alice')
    expect(result.age).toBe(30)
  })

  it('ignores fields not present in object', () => {
    const obj = { name: 'Alice' }
    const result = redactFields(obj, ['nonexistent'])
    expect(result).toEqual({ name: 'Alice' })
  })

  it('redacts multiple fields', () => {
    const result = redactFields({ a: 1, b: 2, c: 3 }, ['a', 'c'])
    expect(result.a).toBe('[REDACTED]')
    expect(result.c).toBe('[REDACTED]')
    expect(result.b).toBe(2)
  })

  it('does not mutate the original object', () => {
    const original = { password: 'secret' }
    redactFields(original, ['password'])
    expect(original.password).toBe('secret')
  })
})

describe('createConsentManager', () => {
  it('setConsent stores and returns a record', () => {
    const mgr = createConsentManager({ version: '1.0' })
    const record = mgr.setConsent('user-1', { analytics: true })
    expect(record.userId).toBe('user-1')
    expect(record.purposes.necessary).toBe(true)
    expect(record.purposes.analytics).toBe(true)
    expect(record.version).toBe('1.0')
  })

  it('necessary consent is always true', () => {
    const mgr = createConsentManager({ version: '1.0' })
    const record = mgr.setConsent('user-2', { necessary: false })
    expect(record.purposes.necessary).toBe(true)
  })

  it('getConsent returns stored record', () => {
    const mgr = createConsentManager({ version: '1.0' })
    mgr.setConsent('user-3', { marketing: true })
    const record = mgr.getConsent('user-3')
    expect(record).not.toBeNull()
    expect(record!.purposes.marketing).toBe(true)
  })

  it('getConsent returns null for unknown user', () => {
    const mgr = createConsentManager({ version: '1.0' })
    expect(mgr.getConsent('unknown')).toBeNull()
  })

  it('hasConsent returns true for granted purpose', () => {
    const mgr = createConsentManager({ version: '1.0' })
    mgr.setConsent('user-4', { analytics: true })
    expect(mgr.hasConsent('user-4', 'analytics')).toBe(true)
  })

  it('hasConsent returns false for denied purpose', () => {
    const mgr = createConsentManager({ version: '1.0' })
    mgr.setConsent('user-5', { analytics: false })
    expect(mgr.hasConsent('user-5', 'analytics')).toBe(false)
  })

  it('hasConsent returns true for necessary even without a record', () => {
    const mgr = createConsentManager({ version: '1.0' })
    expect(mgr.hasConsent('no-record', 'necessary')).toBe(true)
  })

  it('hasConsent returns false for non-necessary without a record', () => {
    const mgr = createConsentManager({ version: '1.0' })
    expect(mgr.hasConsent('no-record', 'analytics')).toBe(false)
  })

  it('revokeConsent removes the record', () => {
    const mgr = createConsentManager({ version: '1.0' })
    mgr.setConsent('user-6', { analytics: true })
    mgr.revokeConsent('user-6')
    expect(mgr.getConsent('user-6')).toBeNull()
  })

  it('stores ipAddress on the record', () => {
    const mgr = createConsentManager({ version: '1.0' })
    const record = mgr.setConsent('user-7', {}, '10.0.0.1')
    expect(record.ipAddress).toBe('10.0.0.1')
  })

  it('defaultConsent applies when not overridden', () => {
    const mgr = createConsentManager({
      version: '1.0',
      defaultConsent: { analytics: true },
    })
    const record = mgr.setConsent('user-8', {})
    expect(record.purposes.analytics).toBe(true)
  })

  it('explicit consent overrides defaultConsent', () => {
    const mgr = createConsentManager({
      version: '1.0',
      defaultConsent: { analytics: true },
    })
    const record = mgr.setConsent('user-9', { analytics: false })
    expect(record.purposes.analytics).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Security Headers
// ---------------------------------------------------------------------------

describe('getSecurityHeaders', () => {
  it('returns HSTS header by default', () => {
    const headers = getSecurityHeaders()
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
    expect(headers['Strict-Transport-Security']).toContain('includeSubDomains')
    expect(headers['Strict-Transport-Security']).toContain('preload')
  })

  it('omits HSTS when hsts: false', () => {
    const headers = getSecurityHeaders({ hsts: false })
    expect(headers['Strict-Transport-Security']).toBeUndefined()
  })

  it('uses custom hstsMaxAge', () => {
    const headers = getSecurityHeaders({ hstsMaxAge: 86400 })
    expect(headers['Strict-Transport-Security']).toContain('max-age=86400')
  })

  it('returns X-Frame-Options DENY by default', () => {
    const headers = getSecurityHeaders()
    expect(headers['X-Frame-Options']).toBe('DENY')
  })

  it('uses custom frameOptions value', () => {
    const headers = getSecurityHeaders({ frameOptions: 'SAMEORIGIN' })
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN')
  })

  it('omits X-Frame-Options when frameOptions: false', () => {
    const headers = getSecurityHeaders({ frameOptions: false })
    expect(headers['X-Frame-Options']).toBeUndefined()
  })

  it('returns X-Content-Type-Options nosniff', () => {
    const headers = getSecurityHeaders()
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
  })

  it('sets default Permissions-Policy restricting camera/mic/geo', () => {
    const headers = getSecurityHeaders()
    expect(headers['Permissions-Policy']).toContain('camera=()')
    expect(headers['Permissions-Policy']).toContain('microphone=()')
    expect(headers['Permissions-Policy']).toContain('geolocation=()')
  })

  it('uses custom permissionsPolicy when provided', () => {
    const headers = getSecurityHeaders({
      permissionsPolicy: { camera: ['self'], microphone: [] },
    })
    expect(headers['Permissions-Policy']).toContain('camera=(self)')
    expect(headers['Permissions-Policy']).toContain('microphone=()')
  })

  it('sets Referrer-Policy', () => {
    const headers = getSecurityHeaders()
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  })

  it('sets X-DNS-Prefetch-Control on', () => {
    const headers = getSecurityHeaders()
    expect(headers['X-DNS-Prefetch-Control']).toBe('on')
  })

  it('sets X-Permitted-Cross-Domain-Policies none', () => {
    const headers = getSecurityHeaders()
    expect(headers['X-Permitted-Cross-Domain-Policies']).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes greater-than', () => {
    expect(escapeHtml('1 > 0')).toBe('1 &gt; 0')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s')
  })

  it('returns plain text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })
})

describe('stripHtml', () => {
  it('removes complete HTML tags', () => {
    expect(stripHtml('<b>bold</b>')).toBe('bold')
  })

  it('removes script tags', () => {
    expect(stripHtml('<script>alert(1)</script>')).toBe('alert(1)')
  })

  it('removes unclosed tags at end of string', () => {
    expect(stripHtml('hello <script')).toBe('hello ')
  })

  it('returns plain text unchanged', () => {
    expect(stripHtml('plain text')).toBe('plain text')
  })

  it('removes multiple tags', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })
})

describe('sanitizeUrl', () => {
  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com/path')).toBe('https://example.com/path')
  })

  it('allows http URLs', () => {
    expect(sanitizeUrl('http://example.com/')).toBe('http://example.com/')
  })

  it('rejects javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
  })

  it('rejects data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<h1>hi</h1>')).toBeNull()
  })

  it('rejects non-URL strings', () => {
    expect(sanitizeUrl('not a url')).toBeNull()
  })

  it('rejects ftp: protocol', () => {
    expect(sanitizeUrl('ftp://files.example.com/')).toBeNull()
  })
})

describe('sanitizeRedirectUrl', () => {
  it('allows safe relative URLs', () => {
    expect(sanitizeRedirectUrl('/dashboard', [])).toBe('/dashboard')
  })

  it('allows relative URL with query string', () => {
    expect(sanitizeRedirectUrl('/search?q=test', [])).toBe('/search?q=test')
  })

  it('rejects protocol-relative URL (//evil.com)', () => {
    expect(sanitizeRedirectUrl('//evil.com', [])).toBeNull()
  })

  it('rejects absolute URL with unlisted host', () => {
    expect(sanitizeRedirectUrl('https://evil.com/', ['example.com'])).toBeNull()
  })

  it('allows absolute URL with listed host', () => {
    expect(sanitizeRedirectUrl('https://example.com/path', ['example.com'])).toBe('https://example.com/path')
  })

  it('rejects javascript: absolute URL', () => {
    expect(sanitizeRedirectUrl('javascript:alert(1)', [])).toBeNull()
  })

  it('rejects null/undefined-like empty string', () => {
    expect(sanitizeRedirectUrl('', [])).toBeNull()
  })

  it('rejects encoded double-slash bypass (/%2F...)', () => {
    // /%2F decodes to // which is a protocol-relative URL — must be rejected
    expect(sanitizeRedirectUrl('/%2Fevil.com', [])).toBeNull()
  })

  it('strips CR/LF from relative URLs to prevent response splitting', () => {
    const result = sanitizeRedirectUrl('/path\r\nX-Injected: bad', [])
    expect(result).toBe('/pathX-Injected: bad')
  })

  it('rejects invalid percent-encoding', () => {
    expect(sanitizeRedirectUrl('/%ZZ', [])).toBeNull()
  })
})
