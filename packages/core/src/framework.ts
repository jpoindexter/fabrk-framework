import { FabrkConfig, FabrkInstance, fabrkConfigSchema } from './types'
import { createMiddleware } from './middleware'
import * as hooks from './hooks'

/**
 * Create a FABRK framework instance
 *
 * @param config - Framework configuration
 * @returns FABRK instance with middleware, providers, and hooks
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

  return {
    config: validatedConfig,
    middleware: createMiddleware(),
    hooks,
  }
}
