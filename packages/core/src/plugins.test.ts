import { describe, it, expect, vi } from 'vitest'
import { PluginRegistry } from './plugins'
import type { FabrkPlugin, PaymentAdapter, AuthAdapter } from './plugins'

function createMockPlugin(name: string, version = '1.0.0'): FabrkPlugin {
  return {
    name,
    version,
    initialize: vi.fn(),
    destroy: vi.fn(),
  }
}

describe('PluginRegistry', () => {
  it('should register and retrieve a payment adapter', () => {
    const registry = new PluginRegistry()
    const adapter = {
      ...createMockPlugin('stripe'),
      isConfigured: () => true,
      createCheckout: vi.fn(),
      handleWebhook: vi.fn(),
      getCustomer: vi.fn(),
      getSubscription: vi.fn(),
      cancelSubscription: vi.fn(),
    } as unknown as PaymentAdapter

    registry.register('payment', adapter)

    expect(registry.getPayment()).toBe(adapter)
    expect(registry.has('payment')).toBe(true)
  })

  it('should return null for unregistered adapter types', () => {
    const registry = new PluginRegistry()
    expect(registry.getPayment()).toBeNull()
    expect(registry.getAuth()).toBeNull()
    expect(registry.getEmail()).toBeNull()
    expect(registry.getStorage()).toBeNull()
    expect(registry.getRateLimit()).toBeNull()
  })

  it('should track registered types', () => {
    const registry = new PluginRegistry()
    const mockAdapter = createMockPlugin('mock')

    registry.register('payment', mockAdapter)
    registry.register('auth', mockAdapter)

    const types = registry.getRegisteredTypes()
    expect(types).toContain('payment')
    expect(types).toContain('auth')
    expect(types).toHaveLength(2)
  })

  it('should support chaining register calls', () => {
    const registry = new PluginRegistry()
    const result = registry
      .register('payment', createMockPlugin('stripe'))
      .register('auth', createMockPlugin('nextauth'))

    expect(result).toBe(registry)
    expect(registry.has('payment')).toBe(true)
    expect(registry.has('auth')).toBe(true)
  })

  it('should add generic plugins', () => {
    const registry = new PluginRegistry()
    const plugin = createMockPlugin('analytics')

    const result = registry.addPlugin(plugin)
    expect(result).toBe(registry)
  })

  it('should initialize all adapters and plugins', async () => {
    const registry = new PluginRegistry()
    const adapter = createMockPlugin('stripe')
    const plugin = createMockPlugin('analytics')

    registry.register('payment', adapter)
    registry.addPlugin(plugin)

    await registry.initialize()

    expect(adapter.initialize).toHaveBeenCalled()
    expect(plugin.initialize).toHaveBeenCalled()
  })

  it('should destroy all adapters and plugins and clear registry', async () => {
    const registry = new PluginRegistry()
    const adapter = createMockPlugin('stripe')
    const plugin = createMockPlugin('analytics')

    registry.register('payment', adapter)
    registry.addPlugin(plugin)

    await registry.destroy()

    expect(adapter.destroy).toHaveBeenCalled()
    expect(plugin.destroy).toHaveBeenCalled()
    expect(registry.has('payment')).toBe(false)
    expect(registry.getRegisteredTypes()).toHaveLength(0)
  })

  it('should handle plugins without initialize/destroy gracefully', async () => {
    const registry = new PluginRegistry()
    const plugin: FabrkPlugin = { name: 'simple', version: '1.0.0' }

    registry.addPlugin(plugin)

    // Should not throw
    await registry.initialize()
    await registry.destroy()
  })

  it('should override adapter when re-registering same type', () => {
    const registry = new PluginRegistry()
    const adapter1 = createMockPlugin('stripe')
    const adapter2 = createMockPlugin('polar')

    registry.register('payment', adapter1)
    registry.register('payment', adapter2)

    expect(registry.getPayment()?.name).toBe('polar')
  })
})
