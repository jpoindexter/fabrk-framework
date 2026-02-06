/**
 * @fabrk/config
 *
 * Type-safe configuration builder
 */

import { z } from 'zod'

export const fabrkConfigSchema = z.object({
  ai: z.object({
    costTracking: z.boolean().default(true),
    validation: z.enum(['strict', 'loose', 'off']).default('strict'),
    providers: z.array(z.enum(['claude', 'openai', 'gemini'])).optional(),
    budget: z.object({
      daily: z.number().optional(),
      monthly: z.number().optional(),
    }).optional(),
  }).optional(),
  design: z.object({
    theme: z.string().default('terminal'),
    radius: z.enum(['sharp', 'rounded', 'pill']).default('sharp'),
  }).optional(),
  payments: z.object({
    provider: z.enum(['stripe', 'polar', 'lemonsqueezy']),
    mode: z.enum(['test', 'live']).default('test'),
  }).optional(),
})

export type FabrkConfig = z.infer<typeof fabrkConfigSchema>

/**
 * Define a type-safe FABRK configuration
 *
 * @param config - Configuration object
 * @returns Validated configuration
 *
 * @example
 * ```ts
 * import { defineFabrkConfig } from '@fabrk/config'
 *
 * export default defineFabrkConfig({
 *   ai: {
 *     costTracking: true,
 *     providers: ['claude', 'openai'],
 *   },
 *   design: {
 *     theme: 'terminal',
 *   },
 * })
 * ```
 */
export function defineFabrkConfig(config: FabrkConfig): FabrkConfig {
  return fabrkConfigSchema.parse(config)
}
