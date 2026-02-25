# @fabrk/config — Agent Reference

Type-safe configuration builder for the FABRK framework. All sections are optional — only configure what you use.

```ts
import { defineFabrkConfig } from '@fabrk/config'
import type { FabrkConfig, FabrkConfigInput } from '@fabrk/config'
```

---

## `defineFabrkConfig(config)` — main entry point

Validates input with Zod and returns a fully-typed `FabrkConfig` with all defaults applied.
Pass the result to `initFabrk()` or `autoWire()`.

```ts
// fabrk.config.ts
import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  framework: { runtime: 'nextjs', srcDir: 'src' },
  theme: { system: 'terminal', colorScheme: 'green' },
  auth: { adapter: 'nextauth', apiKeys: { enabled: true } },
  email: { adapter: 'resend', from: 'hi@myapp.com' },
  payments: { adapter: 'stripe', mode: 'live' },
})
```

**Signature:** `(config: FabrkConfigInput) => FabrkConfig`

- `FabrkConfigInput` — all fields optional (use for function parameters)
- `FabrkConfig` — all fields present with defaults filled in (use for internal/output types)

---

## Minimal Config

Only configure what you actually use. Everything else is optional.

```ts
export default defineFabrkConfig({
  theme: { system: 'terminal' },
})
```

---

## All 13 Config Sections

### `framework`
```ts
framework: {
  runtime: 'nextjs',          // 'nextjs' (default)
  typescript: true,            // default: true
  srcDir: 'src',               // default: 'src'
  database: 'prisma',          // 'prisma' | 'drizzle' | 'none' (default: 'none')
}
```

### `theme`
```ts
theme: {
  system: 'terminal',          // default: 'terminal'
  colorScheme: 'green',        // default: 'green'
  radius: 'sharp',             // 'sharp' | 'rounded' | 'pill' (default: 'sharp')
}
```

### `auth`
```ts
auth: {
  adapter: 'nextauth',         // 'nextauth' | 'custom' (default: 'nextauth')
  apiKeys: {
    enabled: true,             // default: false
    prefix: 'fabrk',           // default: 'fabrk'
    maxPerUser: 5,             // default: 5
  },
  mfa: {
    enabled: true,             // default: false
    issuer: 'MyApp',
    backupCodeCount: 10,       // default: 10
  },
  config: {
    providers: ['google', 'github', 'credentials', 'magic-link'],
    sessionStrategy: 'jwt',    // 'jwt' | 'database' (default: 'jwt')
  },
}
```

### `payments`
```ts
payments: {
  adapter: 'stripe',           // 'stripe' | 'polar' | 'lemonsqueezy' (required)
  mode: 'test',                // 'test' | 'live' (default: 'test')
  config: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceIds: { pro: 'price_xxx', team: 'price_yyy' },
  },
}
```

### `email`
```ts
email: {
  adapter: 'resend',           // 'resend' | 'console' | 'custom' (default: 'console')
  from: 'noreply@myapp.com',
  replyTo: 'support@myapp.com',
  config: { apiKey: process.env.RESEND_API_KEY },
}
```

### `storage`
```ts
storage: {
  adapter: 's3',               // 's3' | 'r2' | 'local' (default: 'local')
  maxFileSize: 10 * 1024 * 1024, // bytes, default: 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  config: {
    bucket: process.env.S3_BUCKET,
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
}
```

### `ai`
```ts
ai: {
  costTracking: true,          // default: true
  validation: 'strict',        // 'strict' | 'loose' | 'off' (default: 'strict')
  providers: ['claude', 'openai', 'gemini'],
  budget: {
    daily: 10.00,
    monthly: 200.00,
    alertThreshold: 0.8,       // 0-1, alert at 80% of budget
  },
}
```

### `security`
```ts
security: {
  csrf: { enabled: true, tokenLength: 32 },
  csp: {
    enabled: true,
    directives: { 'script-src': ["'self'", "'nonce-xxx'"] },
  },
  rateLimit: {
    enabled: true,
    adapter: 'memory',         // 'memory' | 'upstash' | 'custom'
    windowMs: 60_000,          // 1 minute
    maxRequests: 100,
  },
  auditLog: { enabled: true, tamperProof: true },
  headers: {
    hsts: true,
    xFrameOptions: 'DENY',     // 'DENY' | 'SAMEORIGIN'
    xContentTypeOptions: true,
  },
  cors: {
    enabled: true,
    origins: ['https://myapp.com'],
    methods: ['GET', 'POST'],
  },
}
```

### `notifications`
```ts
notifications: {
  enabled: true,               // default: true
  persistToDb: false,          // default: false
  maxPerUser: 100,             // default: 100
}
```

### `teams`
```ts
teams: {
  enabled: true,               // default: false
  maxMembers: 50,              // default: 50
  maxOrgsPerUser: 5,           // default: 5
  roles: ['owner', 'admin', 'member', 'guest'],
}
```

### `featureFlags`
```ts
featureFlags: {
  enabled: true,               // default: false
  adapter: 'memory',           // 'memory' | 'custom'
}
```

### `webhooks`
```ts
webhooks: {
  enabled: true,               // default: false
  signingSecret: process.env.WEBHOOK_SECRET,
  retryAttempts: 3,            // default: 3
  retryDelayMs: 1000,          // default: 1000
}
```

### `jobs`
```ts
jobs: {
  enabled: true,               // default: false
  adapter: 'memory',           // 'memory' | 'custom'
  concurrency: 5,              // default: 5
  retryAttempts: 3,            // default: 3
}
```

### `plugins`
```ts
plugins: [myCustomPlugin],     // FabrkPlugin[] — passed through to PluginRegistry
```

---

## Full Production Config Example

```ts
import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  framework: { runtime: 'nextjs', database: 'prisma' },
  theme: { system: 'terminal', colorScheme: 'green', radius: 'sharp' },
  auth: {
    adapter: 'nextauth',
    apiKeys: { enabled: true },
    mfa: { enabled: true, issuer: 'MyApp' },
    config: { providers: ['google', 'credentials'], sessionStrategy: 'jwt' },
  },
  payments: { adapter: 'stripe', mode: 'live' },
  email: { adapter: 'resend', from: 'noreply@myapp.com' },
  storage: { adapter: 's3' },
  ai: { costTracking: true, providers: ['claude'], budget: { monthly: 100 } },
  security: {
    csrf: { enabled: true },
    rateLimit: { enabled: true, adapter: 'memory' },
    auditLog: { enabled: true },
  },
  notifications: { enabled: true, persistToDb: true },
  teams: { enabled: true },
  featureFlags: { enabled: true },
  webhooks: { enabled: true },
  jobs: { enabled: true },
})
```

---

## Per-Section Schema Exports

Import individual Zod schemas for package-level validation:

```ts
import {
  fabrkConfigSchema,          // full config schema
  authConfigSchema,
  paymentsConfigSchema,
  emailConfigSchema,
  storageConfigSchema,
  aiConfigSchema,
  securityConfigSchema,
  notificationsConfigSchema,
  teamsConfigSchema,
  featureFlagsConfigSchema,
  webhooksConfigSchema,
  jobsConfigSchema,
  themeConfigSchema,
  frameworkConfigSchema,
} from '@fabrk/config'
```

Per-section types: `AuthConfig`, `PaymentsConfig`, `EmailConfig`, `StorageConfig`,
`AIConfig`, `SecurityConfig`, `NotificationsConfig`, `TeamsConfig`,
`FeatureFlagsConfig`, `WebhooksConfig`, `JobsConfig`, `ThemeConfig`, `FrameworkConfig`
