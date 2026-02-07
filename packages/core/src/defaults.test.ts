import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isDev, applyDevDefaults } from './defaults'

describe('isDev', () => {
  const originalProcess = globalThis.process

  afterEach(() => {
    // Restore original process
    ;(globalThis as any).process = originalProcess
  })

  it('should return true when NODE_ENV is development', () => {
    ;(globalThis as any).process = { env: { NODE_ENV: 'development' } }
    expect(isDev()).toBe(true)
  })

  it('should return true when NODE_ENV is test', () => {
    ;(globalThis as any).process = { env: { NODE_ENV: 'test' } }
    expect(isDev()).toBe(true)
  })

  it('should return false when NODE_ENV is production', () => {
    ;(globalThis as any).process = { env: { NODE_ENV: 'production' } }
    expect(isDev()).toBe(false)
  })

  it('should return true when NODE_ENV is undefined', () => {
    ;(globalThis as any).process = { env: {} }
    expect(isDev()).toBe(true)
  })

  it('should return true when process is undefined', () => {
    ;(globalThis as any).process = undefined
    expect(isDev()).toBe(true)
  })
})

describe('applyDevDefaults', () => {
  const originalProcess = globalThis.process

  beforeEach(() => {
    // Force dev mode for tests
    ;(globalThis as any).process = { env: { NODE_ENV: 'development' } }
  })

  afterEach(() => {
    ;(globalThis as any).process = originalProcess
  })

  it('should apply email console adapter as default', () => {
    const config = applyDevDefaults({})
    expect(config.email).toEqual({ adapter: 'console' })
  })

  it('should apply local storage as default', () => {
    const config = applyDevDefaults({})
    expect(config.storage).toEqual({ adapter: 'local' })
  })

  it('should enable notifications by default', () => {
    const config = applyDevDefaults({})
    expect(config.notifications).toEqual({ enabled: true, persistToDb: false })
  })

  it('should enable feature flags by default', () => {
    const config = applyDevDefaults({})
    expect(config.featureFlags).toEqual({ enabled: true })
  })

  it('should enable jobs by default', () => {
    const config = applyDevDefaults({})
    expect(config.jobs).toEqual({ enabled: true })
  })

  it('should apply security defaults', () => {
    const config = applyDevDefaults({})
    expect(config.security).toEqual({
      csrf: true,
      csp: true,
      rateLimit: true,
      auditLog: false,
      headers: true,
    })
  })

  it('should NOT override user-provided email config', () => {
    const config = applyDevDefaults({
      email: { adapter: 'resend' as const, from: 'hi@app.com' },
    })
    expect(config.email).toEqual({ adapter: 'resend', from: 'hi@app.com' })
  })

  it('should NOT override user-provided storage config', () => {
    const config = applyDevDefaults({
      storage: { adapter: 's3' as const },
    })
    expect(config.storage).toEqual({ adapter: 's3' })
  })

  it('should NOT override user-provided notifications config', () => {
    const config = applyDevDefaults({
      notifications: { enabled: false },
    })
    expect(config.notifications).toEqual({ enabled: false })
  })

  it('should preserve user config for other fields', () => {
    const config = applyDevDefaults({
      ai: { costTracking: true, validation: 'strict' as const },
      design: { theme: 'amber', radius: 'pill' as const },
    })
    expect(config.ai).toEqual({ costTracking: true, validation: 'strict' })
    expect(config.design).toEqual({ theme: 'amber', radius: 'pill' })
  })

  it('should NOT apply defaults in production', () => {
    ;(globalThis as any).process = { env: { NODE_ENV: 'production' } }
    const config = applyDevDefaults({})
    expect(config.email).toBeUndefined()
    expect(config.storage).toBeUndefined()
    expect(config.notifications).toBeUndefined()
  })

  it('should NOT default payments (requires API keys)', () => {
    const config = applyDevDefaults({})
    expect(config.payments).toBeUndefined()
  })

  it('should NOT default auth (user must opt in)', () => {
    const config = applyDevDefaults({})
    expect(config.auth).toBeUndefined()
  })
})
