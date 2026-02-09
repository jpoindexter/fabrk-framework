# @fabrk/store-prisma

Prisma-based store implementations for FABRK Framework. Provides persistent database adapters that implement the store interfaces from `@fabrk/core`.

## Installation

```bash
npm install @fabrk/store-prisma
```

## Usage

```ts
import { PrismaTeamStore, PrismaAuditStore, PrismaJobStore } from '@fabrk/store-prisma'
import { autoWire } from '@fabrk/core'
import { prisma } from './lib/prisma'

const { registry, features } = await autoWire(config, {}, {
  team: new PrismaTeamStore(prisma),
  audit: new PrismaAuditStore(prisma),
  job: new PrismaJobStore(prisma),
})
```

Each store accepts your Prisma client instance and maps to the corresponding `@fabrk/core` store interface. Use as many or as few as you need.

## Store Adapters

- **PrismaTeamStore** - Organizations, members, and invite management
- **PrismaApiKeyStore** - API key storage with SHA-256 hashing, scopes, and revocation
- **PrismaAuditStore** - Tamper-proof audit event logging with flexible querying
- **PrismaNotificationStore** - User notifications with read/dismiss state and unread counts
- **PrismaJobStore** - Background job queue with priority, retries, and transactional dequeue
- **PrismaWebhookStore** - Webhook configuration and delivery record persistence
- **PrismaFeatureFlagStore** - Feature flags with rollout percentages and user/role targeting

## Prisma Schema

An example schema is included at `schema.example.prisma`. Copy the models you need into your own `schema.prisma`:

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  ownerId   String
  logoUrl   String?
  settings  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members OrganizationMember[]
  invites OrganizationInvite[]
}
```

All models are optional. Only include the ones for stores you are using.

## Note on Cost Tracking

`PrismaCostStore` lives in `@fabrk/ai` since cost types are defined there:

```ts
import { PrismaCostStore } from '@fabrk/ai'
```

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
