# FABRK Prisma Schema Quick Reference

This document provides a quick overview of the database models available in each template.

## Schema Comparison

| Feature | Basic | AI SaaS | Dashboard |
|---------|-------|---------|-----------|
| **Authentication** | ✅ | ✅ | ✅ |
| **Notifications** | ✅ | ✅ | ✅ |
| **API Keys** | ❌ | ✅ | ❌ |
| **AI Cost Tracking** | ❌ | ✅ | ❌ |
| **Payments (Stripe)** | ❌ | ✅ | ❌ |
| **Organizations** | ❌ | ❌ | ✅ |
| **Team Members** | ❌ | ❌ | ✅ |
| **Invitations** | ❌ | ❌ | ✅ |
| **Feature Flags** | ❌ | ❌ | ✅ |
| **Audit Logging** | ❌ | ❌ | ✅ |
| **Webhooks** | ❌ | ❌ | ✅ |
| **Background Jobs** | ❌ | ❌ | ✅ |
| **Total Models** | 5 | 9 | 14+ |

## Basic Template Models

### Core (5 models)

```
User                  - User accounts
  ├─ Account         - OAuth providers (NextAuth)
  ├─ Session         - Active sessions
  └─ Notification    - In-app notifications

VerificationToken    - Email verification
```

**Use Cases:**
- Simple web apps
- Landing pages with auth
- Starter projects
- Learning Prisma/NextAuth

## AI SaaS Template Models

### Core (9 models)

```
User                  - User accounts
  ├─ Account         - OAuth providers (NextAuth)
  ├─ Session         - Active sessions
  ├─ ApiKey          - User API keys with scopes
  ├─ AICostLog       - AI usage tracking
  ├─ Subscription    - Stripe subscriptions
  └─ Notification    - In-app notifications

VerificationToken    - Email verification
CheckoutSession      - Stripe checkout tracking
```

**Key Features:**

#### ApiKey Model
```prisma
model ApiKey {
  id        String
  userId    String
  name      String
  keyHash   String   @unique    // Bcrypt hash
  prefix    String               // Display: "sk_live_abc123..."
  scopes    String[]            // ["read:data", "write:data"]
  lastUsed  DateTime?
  expiresAt DateTime?
  revokedAt DateTime?
}
```

#### AICostLog Model
```prisma
model AICostLog {
  id           String
  userId       String?
  model        String          // "gpt-4-turbo", "claude-3-opus"
  provider     String          // "openai", "anthropic"
  inputTokens  Int
  outputTokens Int
  totalTokens  Int
  cost         Float           // USD
  feature      String?         // "chat", "code-gen"
  metadata     Json?
  timestamp    DateTime
}
```

#### Subscription Model
```prisma
model Subscription {
  id                   String
  userId               String   @unique
  stripeCustomerId     String   @unique
  stripeSubscriptionId String?  @unique
  stripePriceId        String
  status               String   // "active", "canceled", etc.
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean
  trialEnd             DateTime?
}
```

**Use Cases:**
- AI-powered SaaS products
- API-first applications
- Usage-based billing apps
- AI chatbots/assistants

## Dashboard Template Models

### Core (14+ models)

```
User                  - User accounts
  ├─ Account         - OAuth providers (NextAuth)
  ├─ Session         - Active sessions
  ├─ Organization    - Companies/teams (owner)
  ├─ OrgMember       - Team memberships
  ├─ OrgInvite       - Pending invitations
  ├─ Notification    - In-app notifications
  └─ AuditLog        - Activity logs (actor)

VerificationToken    - Email verification
FeatureFlag          - Gradual feature rollout
Webhook              - Integration webhooks
  └─ WebhookDelivery - Delivery tracking
Job                  - Background task queue
```

**Key Features:**

#### Organization Model
```prisma
model Organization {
  id        String
  name      String
  slug      String   @unique   // URL: /org/acme-corp
  ownerId   String
  logo      String?
  settings  Json?              // Org preferences
  members   OrgMember[]
  invites   OrgInvite[]
}
```

#### OrgMember Model
```prisma
model OrgMember {
  id       String
  userId   String
  orgId    String
  role     String    // "owner", "admin", "member", "viewer"
  joinedAt DateTime

  @@unique([userId, orgId])
}
```

#### FeatureFlag Model
```prisma
model FeatureFlag {
  id             String
  name           String   @unique
  enabled        Boolean
  rolloutPercent Int      // 0-100 for gradual rollout
  targetUsers    String[] // Specific user IDs
  targetRoles    String[] // ["admin", "beta-tester"]
  targetOrgs     String[] // Specific org IDs
}
```

#### AuditLog Model
```prisma
model AuditLog {
  id           String
  action       String    // "user.created", "org.deleted"
  resource     String    // "user:uuid", "org:uuid"
  actorId      String
  actorEmail   String
  metadata     Json      // Change details
  timestamp    DateTime
  hash         String    // Blockchain-style integrity
  previousHash String?
}
```

#### Webhook Model
```prisma
model Webhook {
  id          String
  url         String
  events      String[]  // ["user.created", "org.updated"]
  secret      String    // For HMAC signing
  enabled     Boolean
  deliveries  WebhookDelivery[]
}
```

#### Job Model
```prisma
model Job {
  id           String
  type         String    // "email.send", "report.generate"
  payload      Json
  status       String    // "pending", "processing", "completed"
  priority     Int
  attempts     Int
  maxAttempts  Int
  scheduledFor DateTime? // For delayed jobs
}
```

**Use Cases:**
- B2B SaaS platforms
- Team collaboration tools
- Multi-tenant applications
- Enterprise dashboards
- Admin panels

## Common Patterns

### NextAuth Integration

All templates include NextAuth-compatible models:

```typescript
// pages/api/auth/[...nextauth].ts
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  // ... rest of config
})
```

### Notification System

All templates include a unified notification model:

```typescript
await prisma.notification.create({
  data: {
    userId: user.id,
    type: 'success',      // 'info' | 'success' | 'warning' | 'error'
    title: 'Welcome!',
    message: 'Your account is ready.',
    link: '/getting-started'
  }
})
```

### UUID Primary Keys

All models use UUID for primary keys:

```prisma
model Example {
  id String @id @default(uuid())
}
```

Benefits:
- Globally unique
- No enumeration attacks
- Distributed system friendly
- Merge-safe across environments

### Snake Case Tables

All tables use snake_case in PostgreSQL:

```prisma
model UserProfile {
  createdAt DateTime @map("created_at")

  @@map("user_profiles")
}
```

This follows PostgreSQL conventions while keeping Prisma models camelCase.

## Migration Path

Start simple, expand as needed:

```
Basic Template
  └─> Add API keys → AI SaaS features
  └─> Add Organizations → Dashboard features
      └─> Add both → Full-featured app
```

You can copy models between templates as your needs grow.

## Quick Commands

```bash
# View schema in browser
pnpm dlx prisma studio

# Apply schema changes
pnpm dlx prisma db push

# Generate TypeScript types
pnpm dlx prisma generate

# Create migration
pnpm dlx prisma migrate dev --name description

# Deploy to production
pnpm dlx prisma migrate deploy
```

## File Locations

```
templates/
├─ PRISMA_GUIDE.md          ← Comprehensive guide
├─ SCHEMA_REFERENCE.md      ← This file
├─ basic/
│  ├─ .env.example
│  └─ prisma/
│     ├─ README.md
│     └─ schema.prisma      ← 5 models
├─ ai-saas/
│  ├─ .env.example
│  └─ prisma/
│     ├─ README.md
│     └─ schema.prisma      ← 9 models
└─ dashboard/
   ├─ .env.example
   └─ prisma/
      ├─ README.md
      └─ schema.prisma      ← 14+ models
```

## Resources

- **PRISMA_GUIDE.md** - Setup instructions and common workflows
- **templates/*/prisma/README.md** - Template-specific documentation
- [Prisma Docs](https://www.prisma.io/docs) - Official documentation
- [NextAuth Docs](https://next-auth.js.org) - Authentication setup

## Choosing a Template

| You Need | Template | Why |
|----------|----------|-----|
| Just auth + basic features | **Basic** | Minimal, easy to understand |
| AI features + payments | **AI SaaS** | Built for AI-powered products |
| Teams + permissions | **Dashboard** | Multi-tenant from day one |
| All features | **Dashboard** | Most comprehensive, copy what you need |

All schemas are production-ready with proper indexes, relations, and constraints.
