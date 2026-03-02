/**
 * @fabrk/config
 *
 * Type-safe configuration builder for the FABRK framework.
 * All sections are optional — only configure what you use.
 */

import { z } from 'zod'

// ─── Framework ───────────────────────────────────────

const frameworkConfigSchema = z.object({
  runtime: z.enum(['nextjs', 'vite']).default('nextjs'),
  typescript: z.boolean().default(true),
  srcDir: z.string().default('src'),
  database: z.enum(['prisma', 'drizzle', 'none']).default('none'),
})

// ─── AI ───────────────────────────────────────────────

const aiConfigSchema = z.object({
  costTracking: z.boolean().default(true),
  validation: z.enum(['strict', 'loose', 'off']).default('strict'),
  providers: z.array(z.enum(['claude', 'openai', 'gemini'])).optional(),
  budget: z.object({
    daily: z.number().optional(),
    monthly: z.number().optional(),
    alertThreshold: z.number().min(0).max(1).optional(),
  }).optional(),
})

// ─── Theme ───────────────────────────────────────────

const themeConfigSchema = z.object({
  system: z.string().default('terminal'),
  colorScheme: z.string().default('green'),
  radius: z.enum(['sharp', 'rounded', 'pill']).default('sharp'),
})

// ─── Payments ─────────────────────────────────────────

const paymentsConfigSchema = z.object({
  adapter: z.enum(['stripe', 'polar', 'lemonsqueezy']),
  mode: z.enum(['test', 'live']).default('test'),
  config: z.object({
    secretKey: z.string().optional(),
    publishableKey: z.string().optional(),
    webhookSecret: z.string().optional(),
    priceIds: z.record(z.string()).optional(),
  }).optional(),
})

// ─── Auth ─────────────────────────────────────────────

const authConfigSchema = z.object({
  adapter: z.enum(['nextauth', 'custom']).default('nextauth'),
  apiKeys: z.object({
    enabled: z.boolean().default(false),
    prefix: z.string().default('fabrk'),
    maxPerUser: z.number().default(5),
  }).optional(),
  mfa: z.object({
    enabled: z.boolean().default(false),
    issuer: z.string().optional(),
    backupCodeCount: z.number().default(10),
  }).optional(),
  config: z.object({
    providers: z.array(z.enum(['google', 'github', 'credentials', 'magic-link'])).optional(),
    sessionStrategy: z.enum(['jwt', 'database']).default('jwt'),
  }).optional(),
})

// ─── Email ────────────────────────────────────────────

const emailConfigSchema = z.object({
  adapter: z.enum(['resend', 'console', 'custom']).default('console'),
  from: z.string().optional(),
  replyTo: z.string().optional(),
  config: z.object({
    apiKey: z.string().optional(),
  }).optional(),
})

// ─── Storage ──────────────────────────────────────────

const storageConfigSchema = z.object({
  adapter: z.enum(['s3', 'r2', 'local']).default('local'),
  maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
  allowedTypes: z.array(z.string()).optional(),
  config: z.object({
    bucket: z.string().optional(),
    region: z.string().optional(),
    endpoint: z.string().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    publicUrl: z.string().optional(),
    localPath: z.string().optional(),
  }).optional(),
})

// ─── Security ─────────────────────────────────────────

const securityConfigSchema = z.object({
  csrf: z.object({
    enabled: z.boolean().default(true),
    tokenLength: z.number().default(32),
  }).optional(),
  csp: z.object({
    enabled: z.boolean().default(true),
    directives: z.record(z.array(z.string())).optional(),
  }).optional(),
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    adapter: z.enum(['memory', 'upstash', 'custom']).default('memory'),
    windowMs: z.number().default(60_000),
    maxRequests: z.number().default(100),
  }).optional(),
  auditLog: z.object({
    enabled: z.boolean().default(false),
    tamperProof: z.boolean().default(true),
  }).optional(),
  headers: z.object({
    hsts: z.boolean().default(true),
    xFrameOptions: z.enum(['DENY', 'SAMEORIGIN']).default('DENY'),
    xContentTypeOptions: z.boolean().default(true),
  }).optional(),
  cors: z.object({
    enabled: z.boolean().default(false),
    origins: z.array(z.string()).optional(),
    methods: z.array(z.string()).optional(),
  }).optional(),
})

// ─── Notifications ────────────────────────────────────

const notificationsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  persistToDb: z.boolean().default(false),
  maxPerUser: z.number().default(100),
})

// ─── Teams / Organizations ────────────────────────────

const teamsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  maxMembers: z.number().default(50),
  maxOrgsPerUser: z.number().default(5),
  roles: z.array(z.string()).default(['owner', 'admin', 'member', 'guest']),
})

// ─── Feature Flags ────────────────────────────────────

const featureFlagsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  adapter: z.enum(['memory', 'custom']).default('memory'),
})

// ─── Webhooks ─────────────────────────────────────────

const webhooksConfigSchema = z.object({
  enabled: z.boolean().default(false),
  signingSecret: z.string().optional(),
  retryAttempts: z.number().default(3),
  retryDelayMs: z.number().default(1000),
})

// ─── Job Queue ────────────────────────────────────────

const jobsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  adapter: z.enum(['memory', 'custom']).default('memory'),
  concurrency: z.number().default(5),
  retryAttempts: z.number().default(3),
})

// ─── Full Config ──────────────────────────────────────

export const fabrkConfigSchema = z.object({
  framework: frameworkConfigSchema.optional(),
  ai: aiConfigSchema.optional(),
  theme: themeConfigSchema.optional(),
  payments: paymentsConfigSchema.optional(),
  auth: authConfigSchema.optional(),
  email: emailConfigSchema.optional(),
  storage: storageConfigSchema.optional(),
  security: securityConfigSchema.optional(),
  notifications: notificationsConfigSchema.optional(),
  teams: teamsConfigSchema.optional(),
  featureFlags: featureFlagsConfigSchema.optional(),
  webhooks: webhooksConfigSchema.optional(),
  jobs: jobsConfigSchema.optional(),
  plugins: z.array(z.unknown()).optional(),
})

export type FabrkConfig = z.infer<typeof fabrkConfigSchema>
export type FabrkConfigInput = z.input<typeof fabrkConfigSchema>

// Re-export individual schema sections for package-level validation
export {
  frameworkConfigSchema,
  aiConfigSchema,
  themeConfigSchema,
  paymentsConfigSchema,
  authConfigSchema,
  emailConfigSchema,
  storageConfigSchema,
  securityConfigSchema,
  notificationsConfigSchema,
  teamsConfigSchema,
  featureFlagsConfigSchema,
  webhooksConfigSchema,
  jobsConfigSchema,
}

export type FrameworkConfig = z.infer<typeof frameworkConfigSchema>
export type AIConfig = z.infer<typeof aiConfigSchema>
export type ThemeConfig = z.infer<typeof themeConfigSchema>
export type PaymentsConfig = z.infer<typeof paymentsConfigSchema>
export type AuthConfig = z.infer<typeof authConfigSchema>
export type EmailConfig = z.infer<typeof emailConfigSchema>
export type StorageConfig = z.infer<typeof storageConfigSchema>
export type SecurityConfig = z.infer<typeof securityConfigSchema>
export type NotificationsConfig = z.infer<typeof notificationsConfigSchema>
export type TeamsConfig = z.infer<typeof teamsConfigSchema>
export type FeatureFlagsConfig = z.infer<typeof featureFlagsConfigSchema>
export type WebhooksConfig = z.infer<typeof webhooksConfigSchema>
export type JobsConfig = z.infer<typeof jobsConfigSchema>

/**
 * Define a type-safe FABRK configuration.
 * All sections are optional — only configure what you use.
 *
 * @example
 * ```ts
 * import { defineFabrkConfig } from '@fabrk/config'
 *
 * export default defineFabrkConfig({
 *   framework: {
 *     runtime: 'vite',
 *     typescript: true,
 *     srcDir: 'src',
 *   },
 *   theme: {
 *     system: 'terminal',
 *     colorScheme: 'green',
 *   },
 *   ai: {
 *     costTracking: true,
 *     providers: ['claude', 'openai'],
 *   },
 *   payments: {
 *     adapter: 'stripe',
 *     mode: 'test',
 *   },
 *   auth: {
 *     adapter: 'nextauth',
 *     apiKeys: { enabled: true },
 *     mfa: { enabled: true },
 *   },
 *   security: {
 *     csrf: { enabled: true },
 *     rateLimit: { enabled: true, adapter: 'memory' },
 *   },
 * })
 * ```
 */
export function defineFabrkConfig(config: FabrkConfigInput): FabrkConfig {
  return fabrkConfigSchema.parse(config)
}
