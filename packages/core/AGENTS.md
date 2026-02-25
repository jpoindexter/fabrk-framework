# @fabrk/core — Agent Reference

Framework runtime: plugins, adapters, middleware, feature modules, and utilities.

```ts
import { initFabrk, createFabrk, autoWire, applyDevDefaults } from '@fabrk/core'
import { PluginRegistry, createMiddleware } from '@fabrk/core'
import { createNotificationManager, createTeamManager } from '@fabrk/core'
import { createFeatureFlagManager, createWebhookManager, createJobQueue } from '@fabrk/core'
import { cn } from '@fabrk/core'
```

---

## Framework Initialization

### `initFabrk(options?)` — recommended entry point
Async. Auto-wires adapters from installed `@fabrk/*` packages based on config. Applies dev defaults in development.

```ts
import { initFabrk } from '@fabrk/core'

const fabrk = await initFabrk({
  payments: { adapter: 'stripe', mode: 'live' },
  auth: { adapter: 'nextauth', apiKeys: { enabled: true } },
  email: { adapter: 'resend', from: 'hi@myapp.com' },
  notifications: { enabled: true },
  teams: { enabled: true },
  featureFlags: { enabled: true },
  jobs: { enabled: true },
})

// Access auto-created adapters:
const payments = fabrk.registry.getPayment()   // StripeAdapter
const email    = fabrk.registry.getEmail()     // ResendAdapter
const { notifications, teams, featureFlags, jobs } = fabrk.features!
```

### `createFabrk(config?)` — synchronous, no auto-wiring
Use when manually registering adapters or when auto-detection is not needed.

```ts
const fabrk = createFabrk({ theme: { system: 'terminal' } })
fabrk.registry.register('email', myCustomEmailAdapter)
```

---

## Auto-Wiring

### `autoWire(config, adapterOverrides?, storeOverrides?)` — low-level
Called internally by `initFabrk`. Use directly when you need fine-grained control.

```ts
import { autoWire } from '@fabrk/core'
import { PrismaTeamStore } from '@fabrk/store-prisma'
import { prisma } from './lib/prisma'

const { registry, features } = await autoWire(
  { payments: { adapter: 'stripe' }, teams: { enabled: true } },
  {},                                        // adapter overrides
  { team: new PrismaTeamStore(prisma) }      // store overrides
)
```

**`AdapterOverrides`** — pass to skip auto-detection for specific adapters:
`{ payment?, auth?, email?, storage?, rateLimit? }`

**`StoreOverrides`** — replace in-memory stores with persistent ones (Prisma, etc.):
`{ team?, notification?, featureFlag?, webhook?, job?, audit? }`

### `applyDevDefaults(config)` — zero-config dev setup
Merges sensible defaults for development (console email, local storage, in-memory rate limiting). User config takes priority. No-op in production.

### `isDev()` — boolean
Returns `true` when `NODE_ENV` is not `production`.

---

## Plugin Registry

`PluginRegistry` manages adapter lifecycle. Access via `fabrk.registry`.

```ts
const registry = new PluginRegistry()

registry.register('payment', stripeAdapter)   // AdapterType: payment | auth | email | storage | rateLimit
registry.register('email', resendAdapter)

const payments = registry.getPayment()        // PaymentAdapter | null
const auth     = registry.getAuth()           // AuthAdapter | null
const email    = registry.getEmail()          // EmailAdapter | null
const storage  = registry.getStorage()        // StorageAdapter | null
const rl       = registry.getRateLimit()      // RateLimitAdapter | null

registry.has('payment')                       // boolean
registry.getRegisteredTypes()                 // AdapterType[]
await registry.initialize()                   // call initialize() on all adapters
await registry.destroy()                      // call destroy() on all adapters
```

**Adapter interfaces** (implement to build custom adapters):
- `PaymentAdapter` — `createCheckout`, `handleWebhook`, `getCustomer`, `getSubscription`, `cancelSubscription`
- `AuthAdapter` — `getSession`, `validateApiKey`, `createApiKey`, `revokeApiKey`, `listApiKeys`, `setupMfa?`, `verifyMfa?`
- `EmailAdapter` — `send`, `sendTemplate`
- `StorageAdapter` — `upload`, `getSignedUrl`, `delete`, `exists`
- `RateLimitAdapter` — `check`, `reset`

All adapters extend `FabrkPlugin` with `name`, `version`, `initialize?()`, `destroy?()`.

---

## Middleware

```ts
import { createMiddleware, compose } from '@fabrk/core'

const pipeline = createMiddleware<{ user: string | null }>()
  .use(async (ctx, next) => {
    console.log('before')
    await next()
    console.log('after')
  })
  .use(async (ctx, next) => {
    if (!ctx.user) throw new Error('Unauthorized')
    await next()
  })

await pipeline.run({ user: 'alice' })

// Compose multiple functions into one:
const combined = compose(authMiddleware, loggingMiddleware)
```

Types: `MiddlewareFunction<TContext>`, `Middleware<TContext>`

---

## Feature Flags

```ts
import { createFeatureFlagManager } from '@fabrk/core'
import type { FeatureFlagManager } from '@fabrk/core'

const flags = createFeatureFlagManager()   // in-memory; pass a FeatureFlagStore for persistence

await flags.set({ name: 'new-dashboard', enabled: true, rolloutPercent: 50 })
await flags.set({ name: 'beta-feature', enabled: true, targetUsers: ['user_123'] })

const on = await flags.isEnabled('new-dashboard', { userId: 'user_456' }) // deterministic hash
await flags.delete('beta-feature')
await flags.getAll()                       // FeatureFlagOptions[]
await flags.get('new-dashboard')           // FeatureFlagOptions | null
```

`FeatureFlagOptions`: `{ name, enabled, rolloutPercent?, targetUsers?, targetRoles? }`

---

## Job Queue

```ts
import { createJobQueue } from '@fabrk/core'
import type { JobQueue, Job } from '@fabrk/core'

const queue = createJobQueue()   // in-memory; pass a JobStore for persistence

// Register handlers before starting
queue.process('send-email', async (job: Job) => {
  await sendEmail(job.payload.to, job.payload.subject)
})

// Enqueue jobs
await queue.enqueue({
  type: 'send-email',
  payload: { to: 'user@example.com', subject: 'Welcome' },
  priority: 10,       // higher = processed first
  maxRetries: 3,
  delay: 5000,        // delay in ms
})

queue.start({ pollInterval: 1000 })   // start polling
queue.stop()

await queue.getJob(id)
await queue.getByStatus('pending')    // JobStatus: pending | running | completed | failed
```

---

## Notifications

```ts
import { createNotificationManager } from '@fabrk/core'
import type { NotificationManager, Notification } from '@fabrk/core'

const notifications = createNotificationManager()   // in-memory; pass a NotificationStore for persistence

// Subscribe to real-time notifications
const unsubscribe = notifications.subscribe((n: Notification) => {
  console.log('New notification:', n.title)
})

await notifications.notify({
  title: 'Payment received',
  message: 'Your payment of $49 was processed.',
  type: 'success',      // success | error | warning | info
  userIds: ['user_123'],
  persist: true,        // save to store; false = fire-and-forget
})

await notifications.getForUser('user_123', { unreadOnly: true, limit: 20 })
await notifications.getUnreadCount('user_123')
await notifications.markRead(id)
await notifications.markAllRead('user_123')
await notifications.dismiss(id)
```

---

## Teams / Organizations

```ts
import { createTeamManager, InMemoryTeamStore } from '@fabrk/core'
import type { TeamManager, Organization, OrgMember } from '@fabrk/core'

const teams = createTeamManager(new InMemoryTeamStore())
// Production: createTeamManager(new PrismaTeamStore(prisma))

const org = await teams.createOrg({
  name: 'Acme Corp', slug: 'acme',
  ownerId: 'user_123', ownerEmail: 'owner@acme.com',
})

await teams.getOrg(org.id)
await teams.getOrgBySlug('acme')
await teams.addMember(org.id, 'user_456', 'member', { email: 'alice@acme.com' })
await teams.updateMemberRole(org.id, 'user_456', 'admin')
await teams.removeMember(org.id, 'user_456')

const invite = await teams.createInvite(org.id, 'bob@acme.com', 'member', 'user_123')
await teams.acceptInvite(invite.token, 'user_789')
```

`OrgRole`: `'owner' | 'admin' | 'member' | 'guest'`

Note: `updateOrg`, `deleteOrg`, `updateMemberRole`, `removeMember` perform no authorization checks — callers must verify permissions.

---

## Webhooks

```ts
import { createWebhookManager } from '@fabrk/core'
import type { WebhookManager } from '@fabrk/core'

const webhooks = createWebhookManager()   // in-memory; pass a WebhookStore for persistence

const webhook = await webhooks.register({
  url: 'https://example.com/webhook',
  events: ['user.created', 'payment.completed'],
})
// webhook.secret is returned ONCE — store it securely, it cannot be recovered

await webhooks.dispatch('user.created', { userId: 'user_123' })
await webhooks.verify(payload, signature, secret)   // HMAC-SHA256
await webhooks.list()                               // secrets are masked as '***'
await webhooks.unregister(webhook.id)
```

URLs are validated against SSRF (private IPs, loopback, IPv6, non-http(s) schemes are rejected).

---

## Utility

### `cn(...classes)` — classname merging
Combines `clsx` + `tailwind-merge`. Required for all Tailwind class composition.

```ts
import { cn } from '@fabrk/core'

cn('border', isActive && 'border-primary', mode.radius)
// → 'border border-primary rounded-none' (last radius wins)
```

---

## Validation Utilities

```ts
import {
  validateFile, checkHardcodedColors, checkAccessibility,
  createComponentRegistry, generateReport
} from '@fabrk/core'
import type { ValidationReport, ComponentMeta, ComponentRegistry } from '@fabrk/core'
```

Validators: `checkHardcodedColors`, `checkInlineStyles`, `checkEvalUsage`,
`checkDangerousHTML`, `checkHardcodedSecrets`, `checkAccessibility`

---

## Key Types

```ts
import type {
  FabrkConfigInput,   // input type for config (optional fields, z.input<>)
  FabrkInstance,      // returned by createFabrk / initFabrk
  FeatureModules,     // { notifications, teams, featureFlags, webhooks, jobs }
  AutoWireResult,     // { registry, features }
  AdapterOverrides,   // { payment?, auth?, email?, storage?, rateLimit? }
  StoreOverrides,     // { team?, notification?, featureFlag?, webhook?, job?, audit? }
  Job, JobOptions, JobStatus,
  Notification, NotificationOptions,
  Organization, OrgMember, OrgInvite, OrgRole,
  WebhookConfig, WebhookDelivery,
  FeatureFlagOptions,
} from '@fabrk/core'
```
