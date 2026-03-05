import { FabrkConfigInput, FabrkInstance, fabrkConfigSchema } from './types'
import { createMiddleware } from './middleware'
import { PluginRegistry } from './plugins'
import type { FabrkPlugin } from './plugins'
import { autoWire, type AdapterOverrides } from './auto-wire'
import { applyDevDefaults } from './defaults'

export interface CreateFabrkOptions extends FabrkConfigInput {
  /** Plugins to register during initialization */
  plugins?: FabrkPlugin[]
  /** Adapter overrides (take priority over auto-detected adapters) */
  adapters?: AdapterOverrides
  /** Disable dev defaults (default: false). When false, dev defaults are applied in development mode. */
  disableDefaults?: boolean
}

export function createFabrk(config: FabrkConfigInput = {}): FabrkInstance {
  const validatedConfig = fabrkConfigSchema.parse(config)
  const registry = new PluginRegistry()

  return {
    config: validatedConfig,
    middleware: createMiddleware(),
    registry,
  }
}

export async function initFabrk(options: CreateFabrkOptions = {}): Promise<FabrkInstance> {
  const { plugins, adapters, disableDefaults, ...config } = options
  const withDefaults = disableDefaults ? config : applyDevDefaults(config)
  const validatedConfig = fabrkConfigSchema.parse(withDefaults)

  const { registry, features } = await autoWire(validatedConfig, adapters)

  if (plugins) {
    for (const plugin of plugins) {
      registry.addPlugin(plugin)
    }
  }

  return {
    config: validatedConfig,
    middleware: createMiddleware(),
    registry,
    features,
  }
}
