import { describe, it, expect } from 'vitest'
import { createCsrfProtection } from './csrf'

describe('CsrfProtection', () => {
  const csrf = createCsrfProtection({ secure: false })

  describe('generateToken', () => {
    it('should generate a hex token', async () => {
      const token = await csrf.generateToken()
      expect(token).toMatch(/^[0-9a-f]+$/)
    })

    it('should generate token with correct length', async () => {
      const token = await csrf.generateToken()
      // 32 bytes = 64 hex chars
      expect(token).toHaveLength(64)
    })

    it('should generate unique tokens', async () => {
      const t1 = await csrf.generateToken()
      const t2 = await csrf.generateToken()
      expect(t1).not.toBe(t2)
    })
  })

  describe('createCookie', () => {
    it('should create a valid Set-Cookie string', () => {
      const cookie = csrf.createCookie('abc123')
      expect(cookie).toContain('__fabrk_csrf=abc123')
      expect(cookie).toContain('Path=/')
      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('SameSite=strict')
    })

    it('should not include Secure flag when secure is false', () => {
      const cookie = csrf.createCookie('token')
      expect(cookie).not.toContain('Secure')
    })

    it('should include Secure flag when configured', () => {
      const secureCsrf = createCsrfProtection({ secure: true })
      const cookie = secureCsrf.createCookie('token')
      expect(cookie).toContain('Secure')
    })

    it('should use custom cookie name', () => {
      const custom = createCsrfProtection({ cookieName: 'my_csrf', secure: false })
      const cookie = custom.createCookie('val')
      expect(cookie).toContain('my_csrf=val')
    })
  })

  describe('verify', () => {
    it('should pass for GET requests', async () => {
      const req = new Request('http://localhost/api', { method: 'GET' })
      expect(await csrf.verify(req)).toBe(true)
    })

    it('should pass for HEAD requests', async () => {
      const req = new Request('http://localhost/api', { method: 'HEAD' })
      expect(await csrf.verify(req)).toBe(true)
    })

    it('should pass for OPTIONS requests', async () => {
      const req = new Request('http://localhost/api', { method: 'OPTIONS' })
      expect(await csrf.verify(req)).toBe(true)
    })

    it('should fail POST without cookie', async () => {
      const req = new Request('http://localhost/api', {
        method: 'POST',
        headers: { 'x-csrf-token': 'abc' },
      })
      expect(await csrf.verify(req)).toBe(false)
    })

    it('should fail POST without header', async () => {
      const req = new Request('http://localhost/api', {
        method: 'POST',
        headers: { Cookie: '__fabrk_csrf=abc' },
      })
      expect(await csrf.verify(req)).toBe(false)
    })

    it('should fail POST when tokens mismatch', async () => {
      const req = new Request('http://localhost/api', {
        method: 'POST',
        headers: {
          Cookie: '__fabrk_csrf=token_a',
          'x-csrf-token': 'token_b',
        },
      })
      expect(await csrf.verify(req)).toBe(false)
    })

    it('should pass POST when tokens match', async () => {
      const token = await csrf.generateToken()
      const req = new Request('http://localhost/api', {
        method: 'POST',
        headers: {
          Cookie: `__fabrk_csrf=${token}`,
          'x-csrf-token': token,
        },
      })
      expect(await csrf.verify(req)).toBe(true)
    })
  })

  describe('getTokenFromCookie', () => {
    it('should extract token from cookie header', () => {
      const req = new Request('http://localhost', {
        headers: { Cookie: '__fabrk_csrf=mytoken; other=value' },
      })
      expect(csrf.getTokenFromCookie(req)).toBe('mytoken')
    })

    it('should return null when no cookie header', () => {
      const req = new Request('http://localhost')
      expect(csrf.getTokenFromCookie(req)).toBeNull()
    })

    it('should return null when csrf cookie missing', () => {
      const req = new Request('http://localhost', {
        headers: { Cookie: 'other=value' },
      })
      expect(csrf.getTokenFromCookie(req)).toBeNull()
    })
  })
})
