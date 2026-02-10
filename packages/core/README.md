# @fabrk/core

Framework runtime and core utilities for FABRK applications. Provides auto-wiring, middleware composition, feature managers, and foundational utilities for building full-stack TypeScript applications.

## Installation

```bash
npm install @fabrk/core @fabrk/config @fabrk/design-system
```

## Usage

### Auto-Wiring (Zero-Config Development)

The `autoWire()` function creates all adapters and stores from your configuration automatically:

```tsx
import { autoWire, applyDevDefaults } from '@fabrk/core'
import { createFabrkConfig } from '@fabrk/config'

// Development: use in-memory defaults
const config = createFabrkConfig({
  auth: { provider: 'nextauth' },
  email: { provider: 'resend', apiKey: process.env.RESEND_API_KEY },
})

const devConfig = applyDevDefaults(config)
const { adapters, stores } = autoWire(devConfig)

// adapters.auth, adapters.email, adapters.payments, adapters.storage
// stores.team, stores.apiKey, stores.audit, stores.notification, etc.
```

### Production: Override with Prisma Stores

```tsx
import { autoWire } from '@fabrk/core'
import { createPrismaTeamStore, createPrismaAuditStore } from '@fabrk/store-prisma'
import { prisma } from './lib/prisma'

const { adapters, stores } = autoWire(prodConfig, undefined, {
  team: createPrismaTeamStore(prisma),
  audit: createPrismaAuditStore(prisma),
})
```

### Middleware Composition

Build composable middleware pipelines for API routes:

```tsx
import { createMiddleware, isDev } from '@fabrk/core'
import { withAuth } from '@fabrk/auth'

const middleware = createMiddleware([
  withAuth(authAdapter),
  withRateLimit({ maxRequests: 100, windowMs: 60000 }),
  withCSRF({ enabled: !isDev() }),
])

export const POST = middleware(async (req, context) => {
  // context.session, context.user available
  return Response.json({ success: true })
})
```

### Team Management

```tsx
import { createTeamManager } from '@fabrk/core'

const teamManager = createTeamManager(stores.team)

// Create team
const team = await teamManager.createTeam({
  name: 'Acme Corp',
  slug: 'acme',
  ownerId: userId,
})

// Manage members
await teamManager.addMember(team.id, userId, 'admin')
const members = await teamManager.getMembers(team.id)
const canEdit = await teamManager.checkPermission(team.id, userId, 'write')
```

### Feature Flags

```tsx
import { createFeatureFlagManager } from '@fabrk/core'

const flags = createFeatureFlagManager(stores.featureFlag)

// Create flag
await flags.createFlag({
  key: 'new-dashboard',
  enabled: true,
  rolloutPercentage: 50, // gradual rollout
})

// Check flag
const isEnabled = await flags.isEnabled('new-dashboard', { userId, teamId })
```

### Job Queue

```tsx
import { createJobQueue } from '@fabrk/core'

const jobs = createJobQueue(stores.job)

// Enqueue job
await jobs.enqueue('send-email', {
  to: 'user@example.com',
  template: 'welcome',
})

// Process jobs
await jobs.process('send-email', async (payload) => {
  await sendEmail(payload)
})
```

### Notification Manager

```tsx
import { createNotificationManager } from '@fabrk/core'

const notifications = createNotificationManager(stores.notification)

// Send notification
await notifications.create({
  userId,
  title: 'Welcome!',
  message: 'Your account is ready.',
  type: 'info',
})

// Get user notifications
const userNotifications = await notifications.getByUserId(userId, { unreadOnly: true })
await notifications.markAsRead(notificationId)
```

### Webhook Manager

```tsx
import { createWebhookManager } from '@fabrk/core'

const webhooks = createWebhookManager(stores.webhook)

// Register webhook
await webhooks.register({
  url: 'https://api.example.com/webhook',
  events: ['user.created', 'payment.succeeded'],
  secret: 'whsec_xxxxx',
})

// Dispatch event
await webhooks.dispatch('user.created', { userId, email })
```

## Features

- **Auto-Wiring** - `autoWire()` creates adapters and stores from configuration with zero boilerplate
- **Dev Defaults** - `applyDevDefaults()` applies in-memory stores and mock adapters for local development
- **Middleware System** - Composable middleware for authentication, rate limiting, CSRF, and custom logic
- **Team Management** - `createTeamManager()` for multi-tenant organizations with roles and permissions
- **Feature Flags** - `createFeatureFlagManager()` for gradual rollouts and A/B testing
- **Job Queue** - `createJobQueue()` for background task processing with retries
- **Notifications** - `createNotificationManager()` for in-app user notifications
- **Webhooks** - `createWebhookManager()` for event-driven integrations
- **Validation** - Code validators for hardcoded colors, inline styles, accessibility, and security issues
- **Type-Safe** - Full TypeScript support with exported types for all managers and stores
- **FabrkProvider** - React provider for theme management and framework context

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
