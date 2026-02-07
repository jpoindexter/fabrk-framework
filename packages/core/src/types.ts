import { z } from 'zod'
import type { Middleware } from './middleware'
import type { PluginRegistry } from './plugins'
import type * as hooks from './hooks'

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
  auth: z.object({
    adapter: z.enum(['nextauth', 'custom']).default('nextauth'),
    apiKeys: z.boolean().default(false),
    mfa: z.boolean().default(false),
  }).optional(),
  email: z.object({
    adapter: z.enum(['resend', 'console']).default('console'),
    from: z.string().optional(),
  }).optional(),
  storage: z.object({
    adapter: z.enum(['s3', 'r2', 'local']).default('local'),
  }).optional(),
  security: z.object({
    csrf: z.boolean().default(true),
    csp: z.boolean().default(true),
    rateLimit: z.boolean().default(true),
    auditLog: z.boolean().default(false),
    headers: z.boolean().default(true),
  }).optional(),
  notifications: z.object({
    enabled: z.boolean().default(true),
    persistToDb: z.boolean().default(false),
  }).optional(),
  teams: z.object({
    enabled: z.boolean().default(false),
    maxMembers: z.number().default(50),
  }).optional(),
  featureFlags: z.object({
    enabled: z.boolean().default(false),
  }).optional(),
  webhooks: z.object({
    enabled: z.boolean().default(false),
  }).optional(),
  jobs: z.object({
    enabled: z.boolean().default(false),
  }).optional(),
  plugins: z.array(z.unknown()).optional(),
})

export type FabrkConfig = z.infer<typeof fabrkConfigSchema>

export interface FabrkInstance {
  config: FabrkConfig
  middleware: Middleware
  hooks: typeof hooks
  registry: PluginRegistry
  /** Auto-wired feature modules (available after autoWire()) */
  features?: {
    notifications: unknown
    teams: unknown
    featureFlags: unknown
    webhooks: unknown
    jobs: unknown
  }
}
