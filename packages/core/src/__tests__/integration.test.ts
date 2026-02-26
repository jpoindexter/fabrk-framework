/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { autoWire } from '../auto-wire'
import type { AutoWireResult } from '../auto-wire'
import { applyDevDefaults, isDev } from '../defaults'
import { PluginRegistry } from '../plugins'
import type { AuthAdapter, EmailAdapter, StorageAdapter, RateLimitAdapter } from '../plugins'
import { createMiddleware, compose } from '../middleware'
import { InMemoryTeamStore } from '../teams/memory-store'
import type { FabrkConfigInput } from '../types'

describe('Auto-Wiring Integration', () => {
  it('should return a registry and features from autoWire with minimal config', async () => {
    const config: FabrkConfigInput = {}
    const result = await autoWire(config)

    expect(result).toBeDefined()
    expect(result.registry).toBeInstanceOf(PluginRegistry)
    expect(result.features).toBeDefined()
    expect(result.features.notifications).not.toBeNull()
    // Teams, featureFlags, webhooks, jobs are null by default (not enabled)
    expect(result.features.teams).toBeNull()
    expect(result.features.featureFlags).toBeNull()
    expect(result.features.webhooks).toBeNull()
    expect(result.features.jobs).toBeNull()
  })

  it('should enable all feature modules when configured', async () => {
    const config: FabrkConfigInput = {
      notifications: { enabled: true },
      teams: { enabled: true },
      featureFlags: { enabled: true },
      webhooks: { enabled: true },
      jobs: { enabled: true },
    }

    const result = await autoWire(config)

    expect(result.features.notifications).not.toBeNull()
    expect(result.features.teams).not.toBeNull()
    expect(result.features.featureFlags).not.toBeNull()
    expect(result.features.webhooks).not.toBeNull()
    expect(result.features.jobs).not.toBeNull()
  })

  it('should register user-provided adapter overrides', async () => {
    const mockAuth: AuthAdapter = {
      name: 'mock-auth',
      version: '1.0.0',
      isConfigured: () => true,
      getSession: async () => ({
        userId: 'mock-user',
        email: 'mock@test.com',
      }),
      validateApiKey: async () => null,
      createApiKey: async () => ({ id: '1', key: 'mock_key', prefix: 'mock' }),
      revokeApiKey: async () => {},
      listApiKeys: async () => [],
    }

    const config: FabrkConfigInput = {}
    const result = await autoWire(config, { auth: mockAuth })

    const registeredAuth = result.registry.getAuth()
    expect(registeredAuth).not.toBeNull()
    expect(registeredAuth!.name).toBe('mock-auth')
    expect(registeredAuth!.isConfigured()).toBe(true)

    const session = await registeredAuth!.getSession()
    expect(session).not.toBeNull()
    expect(session!.userId).toBe('mock-user')
  })

  it('should not override user-provided adapters with auto-detected ones', async () => {
    const mockEmail: EmailAdapter = {
      name: 'custom-email',
      version: '2.0.0',
      isConfigured: () => true,
      send: async () => ({ id: 'msg-1', success: true }),
      sendTemplate: async () => ({ id: 'msg-2', success: true }),
    }

    // Even with email config, the override takes priority
    const config: FabrkConfigInput = {
      email: { adapter: 'resend', from: 'test@example.com' },
    }
    const result = await autoWire(config, { email: mockEmail })

    const registeredEmail = result.registry.getEmail()
    expect(registeredEmail).not.toBeNull()
    expect(registeredEmail!.name).toBe('custom-email')
  })

  it('should accept store overrides for feature modules', async () => {
    const teamStore = new InMemoryTeamStore()

    const config: FabrkConfigInput = {
      teams: { enabled: true },
    }

    const result = await autoWire(config, {}, { team: teamStore })

    expect(result.features.teams).not.toBeNull()

    // Use the teams manager to create an org and verify it works
    const org = await result.features.teams!.createOrg({
      name: 'Test Org',
      slug: 'test-org',
      ownerId: 'user-1',
      ownerEmail: 'owner@test.com',
    })

    expect(org.name).toBe('Test Org')
    expect(org.slug).toBe('test-org')

    // Retrieve it via the store
    const retrieved = await teamStore.getOrg(org.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.name).toBe('Test Org')
  })

  it('should disable notifications when explicitly set to false', async () => {
    const config: FabrkConfigInput = {
      notifications: { enabled: false },
    }

    const result = await autoWire(config)
    expect(result.features.notifications).toBeNull()
  })

  it('should initialize all registered adapters', async () => {
    let initialized = false

    const mockStorage: StorageAdapter = {
      name: 'test-storage',
      version: '1.0.0',
      isConfigured: () => true,
      async initialize() {
        initialized = true
      },
      upload: async () => ({ key: 'test', size: 0, contentType: 'text/plain' }),
      getSignedUrl: async () => ({ url: 'https://test.com', expiresAt: new Date() }),
      delete: async () => {},
      exists: async () => false,
    }

    await autoWire({}, { storage: mockStorage })

    // initialize() is called as part of autoWire
    expect(initialized).toBe(true)
  })
})

describe('Dev Defaults', () => {
  it('should detect dev environment', () => {
    // In test environment, isDev() should return true
    expect(isDev()).toBe(true)
  })

  it('should apply dev defaults to empty config', () => {
    const config = applyDevDefaults({})

    expect(config.email).toEqual({ adapter: 'console' })
    expect(config.storage).toEqual({ adapter: 'local' })
    expect(config.notifications).toEqual({ enabled: true, persistToDb: false })
    expect(config.featureFlags).toEqual({ enabled: true })
    expect(config.jobs).toEqual({ enabled: true })
    expect(config.security).toBeDefined()
    expect(config.security!.csrf).toEqual({ enabled: true })
    expect(config.security!.csp).toEqual({ enabled: true })
    expect(config.security!.rateLimit).toEqual({ enabled: true })
  })

  it('should preserve user overrides over defaults', () => {
    const config = applyDevDefaults({
      email: { adapter: 'resend' as const, from: 'hi@myapp.com' },
      storage: { adapter: 's3' as const },
    })

    // User config should be preserved
    expect(config.email).toEqual({ adapter: 'resend', from: 'hi@myapp.com' })
    expect(config.storage).toEqual({ adapter: 's3' })

    // Defaults still apply for unset fields
    expect(config.notifications).toEqual({ enabled: true, persistToDb: false })
    expect(config.featureFlags).toEqual({ enabled: true })
  })

  it('should work end-to-end with autoWire', async () => {
    const config = applyDevDefaults({
      teams: { enabled: true },
    })

    const result = await autoWire(config)

    // Verify features enabled by defaults
    expect(result.features.notifications).not.toBeNull()
    expect(result.features.featureFlags).not.toBeNull()
    expect(result.features.jobs).not.toBeNull()

    // Verify explicitly enabled feature
    expect(result.features.teams).not.toBeNull()
  })
})

describe('PluginRegistry', () => {
  it('should register and retrieve adapters by type', () => {
    const registry = new PluginRegistry()

    const mockAuth: AuthAdapter = {
      name: 'test-auth',
      version: '1.0.0',
      isConfigured: () => true,
      getSession: async () => null,
      validateApiKey: async () => null,
      createApiKey: async () => ({ id: '1', key: 'k', prefix: 'p' }),
      revokeApiKey: async () => {},
      listApiKeys: async () => [],
    }

    registry.register('auth', mockAuth)

    expect(registry.has('auth')).toBe(true)
    expect(registry.has('payment')).toBe(false)
    expect(registry.getAuth()).toBe(mockAuth)
    expect(registry.getPayment()).toBeNull()
  })

  it('should return all registered types', () => {
    const registry = new PluginRegistry()

    const mockAuth: AuthAdapter = {
      name: 'a', version: '1', isConfigured: () => true,
      getSession: async () => null, validateApiKey: async () => null,
      createApiKey: async () => ({ id: '', key: '', prefix: '' }),
      revokeApiKey: async () => {}, listApiKeys: async () => [],
    }

    const mockRateLimit: RateLimitAdapter = {
      name: 'r', version: '1', isConfigured: () => true,
      check: async () => ({ allowed: true, remaining: 10, limit: 100, resetAt: new Date() }),
      reset: async () => {},
    }

    registry.register('auth', mockAuth)
    registry.register('rateLimit', mockRateLimit)

    const types = registry.getRegisteredTypes()
    expect(types).toContain('auth')
    expect(types).toContain('rateLimit')
    expect(types).toHaveLength(2)
  })

  it('should initialize and destroy all plugins', async () => {
    const registry = new PluginRegistry()
    const log: string[] = []

    registry.addPlugin({
      name: 'test-plugin',
      version: '1.0.0',
      async initialize() {
        log.push('initialized')
      },
      async destroy() {
        log.push('destroyed')
      },
    })

    await registry.initialize()
    expect(log).toEqual(['initialized'])

    await registry.destroy()
    expect(log).toEqual(['initialized', 'destroyed'])
  })
})

describe('Middleware System', () => {
  it('should run middleware in order', async () => {
    const order: number[] = []

    const mw = createMiddleware<{ value: number }>()
      .use(async (ctx, next) => {
        order.push(1)
        await next()
        order.push(4)
      })
      .use(async (ctx, next) => {
        order.push(2)
        await next()
        order.push(3)
      })

    await mw.run({ value: 42 })

    expect(order).toEqual([1, 2, 3, 4])
  })

  it('should pass context through middleware chain', async () => {
    const ctx = { count: 0 }

    const mw = createMiddleware<{ count: number }>()
      .use(async (ctx, next) => {
        ctx.count += 1
        await next()
      })
      .use(async (ctx, next) => {
        ctx.count += 10
        await next()
      })

    await mw.run(ctx)
    expect(ctx.count).toBe(11)
  })

  it('should allow middleware to short-circuit by not calling next', async () => {
    const log: string[] = []

    const mw = createMiddleware<{ authorized: boolean }>()
      .use(async (ctx, next) => {
        log.push('auth-check')
        if (!ctx.authorized) {
          log.push('rejected')
          return // Short circuit
        }
        await next()
      })
      .use(async (_ctx, next) => {
        log.push('handler')
        await next()
      })

    await mw.run({ authorized: false })
    expect(log).toEqual(['auth-check', 'rejected'])

    log.length = 0
    await mw.run({ authorized: true })
    expect(log).toEqual(['auth-check', 'handler'])
  })

  it('should compose multiple middleware functions', async () => {
    const log: string[] = []

    const combined = compose<{ value: string }>(
      async (ctx, next) => {
        log.push(`a:${ctx.value}`)
        await next()
      },
      async (ctx, next) => {
        log.push(`b:${ctx.value}`)
        await next()
      },
      async (ctx, next) => {
        log.push(`c:${ctx.value}`)
        await next()
      }
    )

    const mw = createMiddleware<{ value: string }>().use(combined)
    await mw.run({ value: 'x' })

    expect(log).toEqual(['a:x', 'b:x', 'c:x'])
  })
})

describe('Feature Modules via autoWire', () => {
  let result: AutoWireResult

  it('should create working notification manager', async () => {
    result = await autoWire({
      notifications: { enabled: true },
    })

    const nm = result.features.notifications!

    // Send a notification
    const notification = await nm.notify({
      type: 'info',
      title: 'Test Notification',
      message: 'Hello from integration test',
    })

    expect(notification.id).toBeDefined()
    expect(notification.title).toBe('Test Notification')
    expect(notification.read).toBe(false)

    const count = await nm.getUnreadCount('any-user')
    expect(count).toBeGreaterThanOrEqual(1)

    await nm.markRead(notification.id, 'any-user')

    let received: any = null
    const unsubscribe = nm.subscribe((n) => {
      received = n
    })

    await nm.notify({
      type: 'success',
      title: 'Another',
      message: 'Received via subscription',
    })

    expect(received).not.toBeNull()
    expect(received.title).toBe('Another')

    unsubscribe()
  })

  it('should create working feature flag manager', async () => {
    result = await autoWire({
      featureFlags: { enabled: true },
    })

    const ff = result.features.featureFlags!

    await ff.set({ name: 'dark-mode', enabled: true })
    const enabled = await ff.isEnabled('dark-mode')
    expect(enabled).toBe(true)

    const missing = await ff.isEnabled('non-existent')
    expect(missing).toBe(false)

    await ff.set({ name: 'dark-mode', enabled: false })
    const disabled = await ff.isEnabled('dark-mode')
    expect(disabled).toBe(false)

    await ff.set({
      name: 'beta-feature',
      enabled: true,
      targetUsers: ['user-1', 'user-2'],
    })

    const forUser1 = await ff.isEnabled('beta-feature', { userId: 'user-1' })
    expect(forUser1).toBe(true)

    const allFlags = await ff.getAll()
    expect(allFlags.length).toBeGreaterThanOrEqual(2)

    await ff.delete('dark-mode')
    const deleted = await ff.get('dark-mode')
    expect(deleted).toBeNull()
  })

  it('should create working job queue', async () => {
    result = await autoWire({
      jobs: { enabled: true },
    })

    const queue = result.features.jobs!

    const job = await queue.enqueue({
      type: 'send-email',
      payload: { to: 'user@example.com', subject: 'Test' },
      priority: 5,
    })

    expect(job.id).toBeDefined()
    expect(job.status).toBe('pending')
    expect(job.type).toBe('send-email')
    expect(job.payload).toEqual({ to: 'user@example.com', subject: 'Test' })

    const retrieved = await queue.getJob(job.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.id).toBe(job.id)

    const pending = await queue.getByStatus('pending')
    expect(pending.length).toBeGreaterThanOrEqual(1)
    expect(pending.some((j) => j.id === job.id)).toBe(true)
  })

  it('should create working team manager', async () => {
    result = await autoWire({
      teams: { enabled: true },
    })

    const teams = result.features.teams!

    const org = await teams.createOrg({
      name: 'Acme Corp',
      slug: 'acme-corp',
      ownerId: 'owner-1',
      ownerEmail: 'owner@acme.com',
    })

    expect(org.id).toBeDefined()
    expect(org.name).toBe('Acme Corp')
    expect(org.slug).toBe('acme-corp')
    expect(org.ownerId).toBe('owner-1')

    const retrieved = await teams.getOrg(org.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.name).toBe('Acme Corp')

    const bySlug = await teams.getOrgBySlug('acme-corp')
    expect(bySlug).not.toBeNull()
    expect(bySlug!.id).toBe(org.id)

    await teams.addMember(org.id, 'member-1', 'member', {
      name: 'Jane Doe',
      email: 'jane@acme.com',
    })

    const members = await teams.getMembers(org.id)
    expect(members.length).toBe(2)

    const invite = await teams.createInvite(org.id, 'new@acme.com', 'member', 'owner-1')
    expect(invite.token).toBeDefined()
    expect(invite.email).toBe('new@acme.com')

    const accepted = await teams.acceptInvite(invite.token, 'new-user-id')
    expect(accepted).not.toBeNull()
    expect(accepted!.email).toBe(invite.email)
    expect(accepted!.userId).toBe('new-user-id')
  })
})
