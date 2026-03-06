 
import { describe, it, expect, afterEach } from 'vitest'
import { isDev, applyDevDefaults } from './defaults'

describe('isDev', () => {
  const originalProcess = globalThis.process

  afterEach(() => {
    ;(globalThis as any).process = originalProcess
  })

  it('should return true for development, test, undefined; false for production', () => {
    ;(globalThis as any).process = { env: { NODE_ENV: 'development' } }
    expect(isDev()).toBe(true)

    ;(globalThis as any).process = { env: { NODE_ENV: 'test' } }
    expect(isDev()).toBe(true)

    ;(globalThis as any).process = { env: {} }
    expect(isDev()).toBe(true)

    ;(globalThis as any).process = undefined
    expect(isDev()).toBe(true)

    ;(globalThis as any).process = { env: { NODE_ENV: 'production' } }
    expect(isDev()).toBe(false)
  })
})

describe('applyDevDefaults', () => {
  const originalProcess = globalThis.process

  afterEach(() => {
    ;(globalThis as any).process = originalProcess
  })

  it('should apply all dev defaults in development', () => {
    ;(globalThis as any).process = { env: { NODE_ENV: 'development' } }
    const config = applyDevDefaults({})

    expect(config.email).toEqual({ adapter: 'console' })
    expect(config.storage).toEqual({ adapter: 'local' })
    expect(config.notifications).toEqual({ enabled: true, persistToDb: false })
    expect(config.featureFlags).toEqual({ enabled: true })
    expect(config.jobs).toEqual({ enabled: true })
    expect(config.security).toEqual({
      csrf: { enabled: true },
      csp: { enabled: true },
      rateLimit: { enabled: true },
      auditLog: { enabled: false },
    })
    // Should NOT default auth or payments
    expect(config.auth).toBeUndefined()
    expect(config.payments).toBeUndefined()
  })

  it('should NOT override user-provided config', () => {
    ;(globalThis as any).process = { env: { NODE_ENV: 'development' } }
    const config = applyDevDefaults({
      email: { adapter: 'resend' as const, from: 'hi@app.com' },
      storage: { adapter: 's3' as const },
      notifications: { enabled: false },
    })

    expect(config.email).toEqual({ adapter: 'resend', from: 'hi@app.com' })
    expect(config.storage).toEqual({ adapter: 's3' })
    expect(config.notifications).toEqual({ enabled: false })
  })

  it('should NOT apply defaults in production', () => {
    ;(globalThis as any).process = { env: { NODE_ENV: 'production' } }
    const config = applyDevDefaults({})
    expect(config.email).toBeUndefined()
    expect(config.storage).toBeUndefined()
    expect(config.notifications).toBeUndefined()
  })
})
