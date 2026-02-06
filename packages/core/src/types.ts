import { z } from 'zod'

/**
 * FABRK framework configuration schema
 */
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

export interface FabrkInstance {
  config: FabrkConfig
  middleware: any // TODO: Define middleware type
  providers: any // TODO: Define providers type
  hooks: {
    useCostTracking: () => any
    useDesignSystem: () => any
  }
}
