import { FabrkConfig, FabrkInstance, fabrkConfigSchema } from './types'
import { createMiddleware } from './middleware'
import { PluginRegistry } from './plugins'
import type { FabrkPlugin } from './plugins'
import * as hooks from './hooks'

export interface CreateFabrkOptions extends FabrkConfig {
  /** Plugins to register during initialization */
  plugins?: FabrkPlugin[]
}

/**
 * Create a FABRK framework instance
 *
 * @param config - Framework configuration
 * @returns FABRK instance with middleware, providers, hooks, and plugin registry
 *
 * @example
 * ```ts
 * import { createFabrk } from '@fabrk/core'
 *
 * const fabrk = createFabrk({
 *   ai: { costTracking: true },
 *   design: { theme: 'terminal' },
 * })
 *
 * // With plugins
 * import { createStripeAdapter } from '@fabrk/payments'
 *
 * const fabrk = createFabrk({
 *   payments: { provider: 'stripe', mode: 'live' },
 * })
 * fabrk.registry.register('payment', createStripeAdapter({ ... }))
 * ```
 */
export function createFabrk(config: FabrkConfig = {}): FabrkInstance {
  const validatedConfig = fabrkConfigSchema.parse(config)
  const registry = new PluginRegistry()

  return {
    config: validatedConfig,
    middleware: createMiddleware(),
    hooks,
    registry,
  }
}
