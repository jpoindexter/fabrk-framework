# Supporting Packages

These packages provide the infrastructure layer that the rest of the framework builds on. Each follows the same pattern: a service interface, an in-memory default implementation for dev/testing, and pluggable adapters for production.

---

## @fabrk/config

Zod-validated configuration schemas for the full stack. Its purpose is to give you type errors at startup if you misconfigure something, rather than at runtime.

```bash
pnpm add @fabrk/config
```

```ts
import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  framework: { runtime: 'vite', database: 'prisma' },

  ai: {
    costTracking: true,
    providers: ['claude', 'openai'],
    budget: { daily: 100, alertThreshold: 0.8 },
  },

  auth: {
    adapter: 'nextauth',
    apiKeys: { enabled: true, prefix: 'sk', maxPerUser: 10 },
    mfa: { enabled: true, backupCodeCount: 10 },
  },

  payments: { adapter: 'stripe', mode: 'test' },

  email: { adapter: 'resend', from: 'hello@myapp.com' },

  storage: {
    adapter: 's3',
    maxFileSize: 50 * 1024 * 1024,  // 50MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },

  security: {
    csrf: { enabled: true },
    rateLimit: { enabled: true, adapter: 'memory', windowMs: 60_000, maxRequests: 100 },
    auditLog: { enabled: true },
  },

  teams: { enabled: true, maxMembers: 25, roles: ['owner', 'admin', 'member'] },
})
```

`defineFabrkConfig` calls `fabrkConfigSchema.parse()` which throws a `ZodError` with detailed messages on invalid values. All 13 sections are optional — only configure what you use.

The config is separate from `fabrk.config.ts` (the Vite plugin config). This schema is for application-level configuration you pass to `createFabrk()` at startup.

---

## @fabrk/design-system

The visual foundation. 18 themes, design tokens, the `mode` object, and `ThemeProvider`.

```bash
pnpm add @fabrk/design-system
```

### ThemeProvider

Wrap your app once at the root. It injects CSS variables and handles dark/light mode toggling.

```tsx
import { ThemeProvider, ThemeScript } from '@fabrk/design-system'

// In your root layout:
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* Prevents flash of unstyled content — renders synchronously */}
        <ThemeScript defaultTheme="terminal" storageKey="app-theme" />
      </head>
      <body>
        <ThemeProvider defaultTheme="terminal" storageKey="app-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Available themes

18 themes are available. The default terminal theme has a monospace, command-line aesthetic.

```ts
import { THEME_NAMES } from '@fabrk/design-system'
// ['terminal', 'clean', 'brutalist', 'corporate', 'retro', 'neon',
//  'pastel', 'nature', 'ocean', 'sunset', 'forest', 'midnight',
//  'sakura', 'desert', 'arctic', 'volcanic', 'cosmos', 'minimal']
```

### Using the theme context

```tsx
import { useThemeContext } from '@fabrk/design-system'

function ThemeSwitcher() {
  const { theme, setTheme, colorTheme, setColorTheme } = useThemeContext()

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      {THEME_NAMES.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  )
}
```

### The mode object

`mode` is a pre-populated `ModeConfig` that maps semantic names to Tailwind class strings for the terminal theme. 100+ components use it. This is what makes components theme-aware without hardcoding colors.

```ts
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'

// Border radius
mode.radius        // e.g. 'rounded-none' (terminal theme is sharp)

// Font
mode.font          // e.g. 'font-mono'

// Colors
mode.color.bg.base           // 'bg-background'
mode.color.bg.surface        // 'bg-card'
mode.color.text.muted        // 'text-muted-foreground'
mode.color.border.default    // 'border-border'
mode.color.icon.accent       // 'text-accent'

// Typography
mode.typography.body.m       // 'text-body-m'
mode.typography.label.s      // 'text-label-s'
mode.typography.caps         // 'uppercase tracking-caps'

// Sizing
mode.sizing.sidebar          // 'w-sidebar'
mode.sizing.auth             // 'max-w-auth'

// State
mode.state.hover.bg          // 'hover:bg-muted'
mode.state.disabled.opacity  // 'disabled:opacity-40'
```

### Chart colors

```ts
import { getChartColors, getChartColor } from '@fabrk/design-system'

const colors = getChartColors(5)  // ['var(--chart-1)', 'var(--chart-2)', ...]
const first = getChartColor(0)    // 'var(--chart-1)'
```

### Text formatting helpers

```ts
import { formatButtonText, formatLabelText, formatCardHeader } from '@fabrk/design-system'

formatButtonText('submit')     // '> SUBMIT' (terminal mode)
formatLabelText('status')      // '[STATUS]'
formatCardHeader('User Info')  // '[USER INFO]'
```

---

## @fabrk/core

Framework runtime utilities: plugin system, middleware, notifications, teams, feature flags, webhooks, background jobs, and the `cn()` function.

```bash
pnpm add @fabrk/core
```

### cn()

Tailwind class merging — `clsx` + `tailwind-merge`. Every component uses this.

```ts
import { cn } from '@fabrk/core'

cn('px-4 py-2', isActive && 'bg-primary', className)
```

### autoWire

Creates all service adapters from a config object in one call. Useful for `src/lib/fabrk.ts` style setup files:

```ts
import { autoWire, applyDevDefaults } from '@fabrk/core'
import config from '../fabrk.config'

export const {
  payments,  // PaymentAdapter
  auth,      // AuthAdapter
  email,     // EmailAdapter
  storage,   // StorageAdapter
  security,  // SecurityAdapter
} = await autoWire(applyDevDefaults(config))
```

`applyDevDefaults` substitutes in-memory stores and console adapters for any service not explicitly configured. This means you get a working app locally with zero external dependencies.

### Teams / organizations

```ts
import { createTeamManager, InMemoryTeamStore } from '@fabrk/core'

const store = new InMemoryTeamStore()  // Or PrismaTeamStore from @fabrk/store-prisma
const teams = createTeamManager(store)

const org = await teams.createOrganization({ name: 'Acme', ownerId: userId })
await teams.addMember(org.id, { userId: memberId, role: 'member' })
const members = await teams.listMembers(org.id)
```

### Feature flags

```ts
import { createFeatureFlagManager } from '@fabrk/core'

const flags = createFeatureFlagManager(store)

await flags.define({ key: 'new-editor', defaultEnabled: false })
await flags.enableForUser('new-editor', userId)
const enabled = await flags.isEnabled('new-editor', { userId })
```

### Background jobs

```ts
import { createJobQueue } from '@fabrk/core'

const jobs = createJobQueue(store)

jobs.register('send-welcome-email', async (payload) => {
  await email.send({ to: payload.email, subject: 'Welcome!' })
})

await jobs.enqueue('send-welcome-email', { email: 'user@example.com' }, {
  delay: 0,
  maxRetries: 3,
})
```

### Webhooks

```ts
import { createWebhookManager } from '@fabrk/core'

const webhooks = createWebhookManager(store, { signingSecret: process.env.WEBHOOK_SECRET! })

await webhooks.register({ url: 'https://partner.com/webhook', events: ['payment.completed'] })
await webhooks.deliver('payment.completed', { orderId: '123', amount: 99.99 })
```

Delivery is retried up to the configured `retryAttempts` with exponential backoff.

### Web Crypto utilities

```ts
import { bytesToHex, generateRandomHex, hashPayload, timingSafeEqual } from '@fabrk/core'

// Random hex tokens (for API keys, session tokens, CSRF tokens)
const token = await generateRandomHex(32)  // 64-char hex string

// Hex encoding
const hex = bytesToHex(new Uint8Array([0xff, 0x00]))  // 'ff00'

// HMAC-SHA256 hash (constant-time comparison via Web Crypto)
const hash = await hashPayload(secretKey, data)

// Timing-safe equality (uses HMAC to prevent timing attacks)
const equal = await timingSafeEqual(expected, actual)
```

Never inline `Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')` — use `bytesToHex` instead.

---

## @fabrk/auth

Authentication adapters covering session auth (NextAuth), programmatic API keys, and TOTP MFA.

```bash
pnpm add @fabrk/auth
```

### NextAuth adapter

```ts
import { createNextAuthAdapter } from '@fabrk/auth'

export const { handlers, auth, signIn, signOut } = createNextAuthAdapter({
  providers: ['google', 'github'],
  sessionStrategy: 'jwt',
  store: authStore,  // InMemoryAuthStore or a Prisma implementation
})
```

### API keys

```ts
import { generateApiKey, hashApiKey, createApiKeyValidator } from '@fabrk/auth'

// Generate a key for a user
const { key, prefix, hash } = await generateApiKey({ prefix: 'sk' })
// key = 'sk_abc123...' — shown to user once
// hash = SHA-256 hash — stored in DB
// prefix = 'sk_abc' — stored for display in UI

// Store hash, not the key itself
await db.apiKey.create({ data: { hash, prefix, userId } })

// Validate incoming key
const validator = createApiKeyValidator({
  store: apiKeyStore,
})

const result = await validator.validate(incomingKey)
// result.valid, result.userId, result.keyId
```

### Route middleware

```ts
import { withAuth, withApiKey, withAuthOrApiKey } from '@fabrk/auth'

// Require session auth
export const GET = withAuth(async (req, { session }) => {
  return Response.json({ user: session.user })
})

// Require API key
export const POST = withApiKey(async (req, { keyId, userId }) => {
  return Response.json({ ok: true })
})

// Accept either
export const PUT = withAuthOrApiKey(async (req, { session, keyId }) => {
  const userId = session?.user.id ?? keyId
  return Response.json({ userId })
})
```

### TOTP MFA

```ts
import { generateTotpSecret, generateTotpUri, verifyTotp, generateBackupCodes, verifyBackupCode } from '@fabrk/auth'

// Setup
const secret = generateTotpSecret()
const uri = generateTotpUri(secret, user.email, 'MyApp')
// Show uri as QR code to the user

// Verify OTP during setup and login
const valid = verifyTotp(secret, userEnteredOtp)

// Backup codes (generate once, hash and store)
const codes = generateBackupCodes(10)  // ['abc-def', 'ghi-jkl', ...]
const hashes = await hashBackupCodes(codes)  // Store these
// Show codes to user once

// Verify backup code at login
const { valid, usedCodeIndex } = await verifyBackupCode(enteredCode, storedHashes)
if (valid) {
  // Invalidate storedHashes[usedCodeIndex] in DB
}
```

---

## @fabrk/payments

Three payment providers behind a unified interface. Switching providers is a one-line config change.

```bash
pnpm add @fabrk/payments
```

```ts
import { createStripeAdapter, createPolarAdapter, createLemonSqueezyAdapter } from '@fabrk/payments'

// Stripe
const payments = createStripeAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  priceIds: {
    pro_monthly: 'price_xxx',
    pro_annual: 'price_yyy',
  },
  store: paymentStore,
})

// Polar.sh (open source billing)
const payments = createPolarAdapter({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  organizationId: process.env.POLAR_ORG_ID!,
  store: paymentStore,
})

// Lemon Squeezy
const payments = createLemonSqueezyAdapter({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  storeId: process.env.LEMONSQUEEZY_STORE_ID!,
  store: paymentStore,
})
```

All three adapters expose the same `PaymentAdapter` interface:

```ts
// Create a checkout session
const session = await payments.createCheckoutSession({
  userId,
  priceId: 'pro_monthly',
  successUrl: 'https://myapp.com/success',
  cancelUrl: 'https://myapp.com/cancel',
})
redirect(session.url)

// Handle webhook events
const event = await payments.handleWebhook(req)
if (event.type === 'subscription.created') {
  await db.user.update({ where: { id: event.userId }, data: { tier: 'pro' } })
}

// Check subscription status
const sub = await payments.getSubscription(userId)
console.log(sub?.status)  // 'active' | 'cancelled' | 'past_due'
```

The `InMemoryPaymentStore` stores subscription state in memory for tests. In production, implement `PaymentStore` against your database or use `@fabrk/store-prisma`.

---

## @fabrk/email

Email sending with templating. The console adapter prints to stdout in development — no SMTP or API key needed locally.

```bash
pnpm add @fabrk/email
```

```ts
import { createResendAdapter, createConsoleAdapter } from '@fabrk/email'

// Production
const email = createResendAdapter({
  apiKey: process.env.RESEND_API_KEY!,
  from: 'hello@myapp.com',
})

// Development (logs to console)
const email = createConsoleAdapter({ from: 'hello@myapp.com' })

// Send an email
await email.send({
  to: 'user@example.com',
  subject: 'Welcome to MyApp',
  html: '<p>Hello!</p>',
  text: 'Hello!',
})
```

### Built-in templates

Four templates are provided. They all accept plain data objects and return `{ subject, html, text }`:

```ts
import {
  verificationTemplate,
  resetTemplate,
  welcomeTemplate,
  inviteTemplate,
  renderTemplate,
  registerTemplate,
} from '@fabrk/email'

// Use a built-in template
const { subject, html, text } = renderTemplate(verificationTemplate, {
  appName: 'MyApp',
  verificationUrl: 'https://myapp.com/verify?token=abc',
  userName: 'Alice',
})

await email.send({ to: user.email, subject, html, text })

// Register a custom template
registerTemplate('custom-welcome', {
  render: (data) => ({
    subject: `Welcome ${data.name}!`,
    html: `<h1>Hi ${data.name}</h1>`,
    text: `Hi ${data.name}`,
  }),
})

const { subject, html, text } = renderTemplate('custom-welcome', { name: 'Bob' })
```

---

## @fabrk/storage

File upload and retrieval for S3, Cloudflare R2, and local filesystem. The interface is identical across all three — swap adapters via config with no code changes.

```bash
pnpm add @fabrk/storage
```

```ts
import { createS3Adapter, createR2Adapter, createLocalAdapter, validateFile } from '@fabrk/storage'

// S3
const storage = createS3Adapter({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: 'us-east-1',
  bucket: 'my-uploads',
  publicUrl: 'https://cdn.myapp.com',
})

// Cloudflare R2
const storage = createR2Adapter({
  accountId: process.env.CF_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucket: 'my-uploads',
  publicUrl: 'https://assets.myapp.com',
})

// Local filesystem (dev)
const storage = createLocalAdapter({
  localPath: './uploads',
  publicUrl: 'http://localhost:3000/uploads',
})
```

All adapters expose the same interface:

```ts
// Validate before upload (magic bytes check, not just extension)
const validation = validateFile(file, {
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
})
if (!validation.valid) throw new Error(validation.error)

// Upload
const key = generateStorageKey({ userId, originalName: file.name })
const url = await storage.upload(key, buffer, { contentType: file.type })

// Download
const buffer = await storage.download(key)

// Delete
await storage.delete(key)

// Presigned URL (for direct browser uploads)
const uploadUrl = await storage.presignedUpload(key, { expiresIn: 300 })
```

`validateFile` checks magic bytes (not just file extension) to prevent content-type spoofing. Use this on every upload endpoint.

---

## @fabrk/security

Security primitives that cover the OWASP Top 10 for web applications.

```bash
pnpm add @fabrk/security
```

### CSRF protection

```ts
import { createCsrfProtection } from '@fabrk/security'

const csrf = createCsrfProtection({ tokenLength: 32, cookieName: '_csrf' })

// Middleware: generate and verify tokens
app.use(async (req, res, next) => {
  if (req.method === 'GET') {
    const token = await csrf.generateToken(req, res)
    res.locals.csrfToken = token
    return next()
  }
  const valid = await csrf.verifyToken(req)
  if (!valid) return res.status(403).json({ error: 'Invalid CSRF token' })
  next()
})
```

### Content Security Policy

```ts
import { generateCspHeader, generateNonce } from '@fabrk/security'

const nonce = generateNonce()
const cspHeader = generateCspHeader({
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'https://api.myapp.com'],
  },
})

res.setHeader('Content-Security-Policy', cspHeader)
```

### Rate limiting

```ts
import { createMemoryRateLimiter } from '@fabrk/security'

const limiter = createMemoryRateLimiter({
  windowMs: 60_000,      // 1 minute
  maxRequests: 100,
  keyFn: (req) => req.ip ?? 'unknown',
})

// Middleware
app.use('/api', async (req, res, next) => {
  const result = await limiter.check(req)
  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterMs / 1000))
    return res.status(429).json({ error: 'Too many requests' })
  }
  next()
})
```

For distributed rate limiting across multiple servers, use `createUpstashRateLimiter` (requires `@upstash/redis`).

### Audit logging

```ts
import { createAuditLogger, InMemoryAuditStore } from '@fabrk/security'

const logger = createAuditLogger({
  store: new InMemoryAuditStore(),  // Or PrismaAuditStore from @fabrk/store-prisma
  tamperProof: true,  // Adds HMAC chain to detect log tampering
})

await logger.log({
  action: 'user.login',
  actorId: userId,
  resourceType: 'session',
  resourceId: sessionId,
  metadata: { ip: req.ip, userAgent: req.headers['user-agent'] },
})

const events = await logger.query({ actorId: userId, limit: 50 })
```

### GDPR utilities

```ts
import { anonymizeEmail, anonymizeIp, redactFields, createConsentManager } from '@fabrk/security'

// Data anonymization for GDPR compliance
anonymizeEmail('alice@example.com')   // 'a***@e***.com'
anonymizeIp('192.168.1.100')          // '192.168.x.x'
redactFields({ name: 'Alice', password: 'secret', email: 'alice@example.com' }, ['password'])
// { name: 'Alice', password: '[REDACTED]', email: 'alice@example.com' }

// Consent management
const consent = createConsentManager(store)
await consent.record({ userId, purpose: 'analytics', granted: true })
const hasConsent = await consent.check(userId, 'analytics')
```

### Bot protection

```ts
import { detectBot, validateHoneypot } from '@fabrk/security'

// Header-based bot detection
const result = detectBot(req.headers)
if (result.isBot) {
  return res.status(403).json({ error: 'Bots not allowed' })
}

// Honeypot field validation (submit empty field to prove human)
const isHuman = validateHoneypot(req.body.honeypot)
```

### Security headers

```ts
import { getSecurityHeaders } from '@fabrk/security'

const headers = getSecurityHeaders({
  hsts: true,
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
})

// Apply to all responses
res.set(headers)
```

---

## @fabrk/store-prisma

Prisma implementations of the store interfaces defined by `@fabrk/core` and `@fabrk/security`. Swap an in-memory default for a Prisma implementation with a one-line change.

```bash
pnpm add @fabrk/store-prisma
```

```ts
import { PrismaClient } from '@prisma/client'
import { PrismaTeamStore, PrismaApiKeyStore, PrismaAuditStore, PrismaNotificationStore, PrismaJobStore, PrismaWebhookStore, PrismaFeatureFlagStore } from '@fabrk/store-prisma'

const prisma = new PrismaClient()

// Drop-in replacements for InMemory* stores
const teamStore = new PrismaTeamStore(prisma)
const apiKeyStore = new PrismaApiKeyStore(prisma)
const auditStore = new PrismaAuditStore(prisma)
const notificationStore = new PrismaNotificationStore(prisma)
const jobStore = new PrismaJobStore(prisma)
const webhookStore = new PrismaWebhookStore(prisma)
const featureFlagStore = new PrismaFeatureFlagStore(prisma)
```

Each store requires its corresponding Prisma model to exist in your schema. An example `schema.prisma` with all models is included in the package at `node_modules/@fabrk/store-prisma/prisma/schema.prisma`. Copy the relevant models into your own schema.

The stores only depend on the Prisma client interface — they work with any Prisma-supported database (PostgreSQL, MySQL, SQLite, etc.).
