import { describe, it, expect } from 'vitest'
import { defineFabrkConfig, fabrkConfigSchema } from './index'

describe('fabrkConfigSchema', () => {
  it('should accept empty config', () => {
    const result = fabrkConfigSchema.parse({})
    expect(result).toBeDefined()
  })

  it('should accept full config', () => {
    const config = defineFabrkConfig({
      ai: {
        costTracking: true,
        validation: 'strict',
        providers: ['claude', 'openai'],
        budget: { daily: 10, monthly: 100 },
      },
      theme: {
        system: 'terminal',
        colorScheme: 'green',
        radius: 'sharp',
      },
      payments: {
        adapter: 'stripe',
        mode: 'test',
      },
      auth: {
        adapter: 'nextauth',
        apiKeys: { enabled: true },
        mfa: { enabled: true },
      },
      email: {
        adapter: 'resend',
        from: 'noreply@example.com',
      },
      storage: {
        adapter: 's3',
        maxFileSize: 5 * 1024 * 1024,
      },
      security: {
        csrf: { enabled: true },
        rateLimit: { enabled: true, adapter: 'memory' },
        auditLog: { enabled: true },
      },
      notifications: {
        enabled: true,
        persistToDb: false,
      },
      teams: {
        enabled: true,
        maxMembers: 25,
      },
      featureFlags: {
        enabled: true,
      },
      webhooks: {
        enabled: true,
        retryAttempts: 5,
      },
      jobs: {
        enabled: true,
        adapter: 'memory',
        concurrency: 3,
      },
    })

    expect(config.ai?.costTracking).toBe(true)
    expect(config.payments?.adapter).toBe('stripe')
    expect(config.auth?.adapter).toBe('nextauth')
    expect(config.security?.csrf?.enabled).toBe(true)
    expect(config.teams?.maxMembers).toBe(25)
  })

  it('should apply defaults', () => {
    const config = defineFabrkConfig({
      ai: {},
      theme: {},
    })

    expect(config.ai?.costTracking).toBe(true)
    expect(config.ai?.validation).toBe('strict')
    expect(config.theme?.system).toBe('terminal')
    expect(config.theme?.colorScheme).toBe('green')
    expect(config.theme?.radius).toBe('sharp')
  })

  it('should reject invalid payment adapter', () => {
    expect(() =>
      fabrkConfigSchema.parse({
        payments: { adapter: 'invalid' },
      })
    ).toThrow()
  })

  it('should reject invalid validation mode', () => {
    expect(() =>
      fabrkConfigSchema.parse({
        ai: { validation: 'invalid' },
      })
    ).toThrow()
  })

  it('should reject invalid auth adapter', () => {
    expect(() =>
      fabrkConfigSchema.parse({
        auth: { adapter: 'invalid' },
      })
    ).toThrow()
  })

  it('should reject invalid storage adapter', () => {
    expect(() =>
      fabrkConfigSchema.parse({
        storage: { adapter: 'invalid' },
      })
    ).toThrow()
  })

  it('should accept only valid rate limit adapters', () => {
    const config = defineFabrkConfig({
      security: {
        rateLimit: { enabled: true, adapter: 'upstash' },
      },
    })
    expect(config.security?.rateLimit?.adapter).toBe('upstash')

    expect(() =>
      fabrkConfigSchema.parse({
        security: {
          rateLimit: { adapter: 'redis' },
        },
      })
    ).toThrow()
  })

  it('should validate budget alertThreshold range', () => {
    const config = defineFabrkConfig({
      ai: {
        budget: { alertThreshold: 0.8 },
      },
    })
    expect(config.ai?.budget?.alertThreshold).toBe(0.8)

    expect(() =>
      fabrkConfigSchema.parse({
        ai: { budget: { alertThreshold: 1.5 } },
      })
    ).toThrow()
  })

  it('should accept plugins array', () => {
    const config = defineFabrkConfig({
      plugins: [{ name: 'custom', version: '1.0.0' }],
    })
    expect(config.plugins).toHaveLength(1)
  })
})

describe('defineFabrkConfig', () => {
  it('should return parsed config', () => {
    const config = defineFabrkConfig({})
    expect(config).toBeDefined()
  })

  it('should throw on invalid config', () => {
    expect(() =>
      defineFabrkConfig({
        payments: { adapter: 'nope' as any },
      })
    ).toThrow()
  })
})
