import { FabrkConfig, FabrkInstance, fabrkConfigSchema } from './types'
import { createMiddleware } from './middleware'
import { PluginRegistry } from './plugins'
import type { FabrkPlugin } from './plugins'
import * as hooks from './hooks'
import { autoWire, type AdapterOverrides, type FeatureModules } from './auto-wire'
import { applyDevDefaults } from './defaults'

export interface CreateFabrkOptions extends FabrkConfig {
  /** Plugins to register during initialization */
  plugins?: FabrkPlugin[]
  /** Adapter overrides (take priority over auto-detected adapters) */
  adapters?: AdapterOverrides
  /** Disable dev defaults (default: false). When false, dev defaults are applied in development mode. */
  disableDefaults?: boolean
}

/**
 * Create a FABRK framework instance (synchronous, no auto-wiring)
 *
 * Use this when you want to manually register adapters, or when
 * you don't need adapter auto-detection.
 *
 * @example
 * ```ts
 * import { createFabrk } from '@fabrk/core'
 *
 * const fabrk = createFabrk({
 *   ai: { costTracking: true },
 *   design: { theme: 'terminal' },
 * })
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

/**
 * Initialize a FABRK framework instance with auto-wiring.
 *
 * Reads the config and automatically creates + registers adapters
 * from installed @fabrk/* packages. This is the recommended way to
 * start FABRK in production.
 *
 * @example
 * ```ts
 * import { initFabrk } from '@fabrk/core'
 *
 * const fabrk = await initFabrk({
 *   payments: { provider: 'stripe', mode: 'live' },
 *   auth: { adapter: 'nextauth', apiKeys: true },
 *   email: { adapter: 'resend', from: 'hi@myapp.com' },
 *   notifications: { enabled: true },
 *   teams: { enabled: true },
 * })
 *
 * // All adapters are auto-created and registered:
 * const payments = fabrk.registry.getPayment() // StripeAdapter
 * const auth = fabrk.registry.getAuth()         // NextAuthAdapter
 * const email = fabrk.registry.getEmail()       // ResendAdapter
 * const { notifications, teams } = fabrk.features!
 * ```
 */
export async function initFabrk(options: CreateFabrkOptions = {}): Promise<FabrkInstance> {
  const { plugins, adapters, disableDefaults, ...config } = options
  const withDefaults = disableDefaults ? config : applyDevDefaults(config)
  const validatedConfig = fabrkConfigSchema.parse(withDefaults)

  const { registry, features } = await autoWire(validatedConfig, adapters)

  // Register any additional user-provided plugins
  if (plugins) {
    for (const plugin of plugins) {
      registry.addPlugin(plugin)
    }
  }

  return {
    config: validatedConfig,
    middleware: createMiddleware(),
    hooks,
    registry,
    features,
  }
}
