# @fabrk/store-prisma — Agent Reference

Prisma implementations of the store interfaces defined in `@fabrk/core`. Each store
class takes a Prisma client instance and fulfills one area of persistence. Use only
the stores you need — all are independently injectable.

## Install

```bash
pnpm add @fabrk/store-prisma
# Peer dep:
pnpm add @prisma/client
```

Copy the models you need from `schema.example.prisma` in this package into your own
`schema.prisma`, then run `prisma generate`.

---

## Store Classes

### `PrismaTeamStore`

Implements `TeamStore`. Manages organizations, membership, and invites.

```ts
import { PrismaTeamStore } from '@fabrk/store-prisma'
import { createTeamManager } from '@fabrk/core'

const teamStore = new PrismaTeamStore(prisma)
const teams = createTeamManager({ store: teamStore })

await teams.createOrg({ id, name, slug, ownerId, createdAt: new Date() })
await teams.addMember({ orgId, userId, role: 'member', joinedAt: new Date() })
const members = await teams.getMembers(orgId)

// Invites
await teams.createInvite({ id, orgId, email, role: 'member', token, invitedBy, expiresAt })
const invite = await teams.getInviteByToken(token)
await teams.acceptInvite(token)  // atomic — rejects expired/already-accepted
```

Prisma models required: `Organization`, `OrganizationMember`, `OrganizationInvite`

### `PrismaAuditStore`

Implements `AuditStore`. Append-only audit log with tamper-proof hash field.

```ts
import { PrismaAuditStore } from '@fabrk/store-prisma'

const audit = new PrismaAuditStore(prisma)

await audit.log({
  id, actorId, action: 'user.update', resourceType: 'user', resourceId,
  orgId?, ipAddress?, userAgent?, metadata?, timestamp: new Date()
})

const events = await audit.query({
  orgId, actorId?, resourceType?, action?,
  from?: new Date('2024-01-01'), to?: new Date(),
  limit?: 200, offset?: 0
})
```

Prisma model required: `AuditEvent`

### `PrismaJobStore`

Implements `JobStore`. Background job queue backed by PostgreSQL with `FOR UPDATE SKIP LOCKED`.

```ts
import { PrismaJobStore } from '@fabrk/store-prisma'

const jobs = new PrismaJobStore(prisma)

await jobs.enqueue({ id, type: 'send-email', payload: { to }, priority: 0,
                     maxRetries: 3, status: 'pending', attempts: 0,
                     createdAt: new Date() })

const job = await jobs.dequeue(['send-email']) // atomically claims one job
if (job) {
  // process...
  await jobs.update(job.id, { status: 'completed', completedAt: new Date() })
}

const failing = await jobs.getByStatus('failed', 50)
```

Prisma model required: `Job`

### `PrismaNotificationStore`

Implements `NotificationStore`. Per-user notification feed supporting multi-user
targeting via `userIds[]`.

```ts
import { PrismaNotificationStore } from '@fabrk/store-prisma'

const notifs = new PrismaNotificationStore(prisma)

await notifs.create({ id, type: 'info', title: 'Done', message: '...',
                      userIds: [userId], read: false, dismissed: false,
                      createdAt: new Date() })

const feed = await notifs.getByUser(userId, { unreadOnly: true, limit: 50 })
const count = await notifs.getUnreadCount(userId)
await notifs.markRead(id)
await notifs.markAllRead(userId)
await notifs.dismiss(id)
```

Prisma model required: `Notification`

### `PrismaFeatureFlagStore`

Implements `FeatureFlagStore`. Flags support percentage rollout and user/role targeting.

```ts
import { PrismaFeatureFlagStore } from '@fabrk/store-prisma'

const flags = new PrismaFeatureFlagStore(prisma)

await flags.set({ name: 'new-dashboard', enabled: true,
                  rolloutPercent: 50, targetUsers: [], targetRoles: ['admin'] })

const flag = await flags.get('new-dashboard')
const all  = await flags.getAll()  // up to 1000 flags — cache at app layer
await flags.delete('old-feature')
```

Prisma model required: `FeatureFlag`

### `PrismaWebhookStore`

Implements `WebhookStore`. Stores outbound webhook configs and delivery receipts.
Webhook secrets must be at least 32 characters. Secrets are masked (`'***'`) in
all read operations except `getSecret()`.

```ts
import { PrismaWebhookStore } from '@fabrk/store-prisma'

const hooks = new PrismaWebhookStore(prisma)

await hooks.create({ id, url: 'https://example.com/hook',
                     events: ['user.created'], secret: cryptoRandomString,
                     active: true, createdAt: new Date() })

const config = await hooks.getById(id)
const active = await hooks.listByEvent('user.created')
await hooks.update(id, { active: false })           // url, events, active only
await hooks.recordDelivery({ id, webhookId, event, statusCode, success, attempts, deliveredAt })
```

Prisma models required: `Webhook`, `WebhookDelivery`

### `PrismaApiKeyStore`

Implements `ApiKeyStore`. Stores SHA-256 hashed API keys; raw key is never stored.

```ts
import { PrismaApiKeyStore } from '@fabrk/store-prisma'

const keys = new PrismaApiKeyStore(prisma)

// hash the raw key in @fabrk/auth before calling create()
await keys.create({ id, prefix: 'sk_live_', hash, name: 'My Key',
                    scopes: ['read'], active: true, createdAt: new Date() })

const info = await keys.getByHash(hash)   // lookup on every authenticated request
const list = await keys.listByUser(userId)
await keys.updateLastUsed(id)
await keys.revoke(id)
```

Prisma model required: `ApiKey`

---

## Prisma Schema

Copy models from `schema.example.prisma` (in this package root) into your project.
Available models: `Organization`, `OrganizationMember`, `OrganizationInvite`,
`ApiKey`, `AuditEvent`, `Notification`, `Job`, `Webhook`, `WebhookDelivery`,
`FeatureFlag`, `AICostEvent`, `User`.

Only include the models for stores you're actually using.

> **Note:** `PrismaCostStore` (for AI cost tracking) lives in `@fabrk/ai` because
> the cost types are defined there.

---

## Security Notes

- `PrismaAuditStore.query()` — no authorization check; caller must verify permission
- `PrismaJobStore.update()` — no tenant isolation; caller must verify job ownership
- `PrismaNotificationStore.markRead/dismiss()` — caller must verify notification ownership
- `PrismaFeatureFlagStore.set/delete()` — caller must verify admin privileges
- `PrismaWebhookStore.delete()` — caller must verify webhook ownership
