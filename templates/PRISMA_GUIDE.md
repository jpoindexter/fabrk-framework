# Prisma Database Guide for FABRK Templates

This guide explains how to work with the Prisma database schemas included in FABRK framework templates.

## Overview

Each FABRK template includes a pre-configured Prisma schema tailored to its use case:

| Template | Schema Focus | Models Included |
|----------|-------------|-----------------|
| **basic** | Minimal setup | Auth + Notifications (5 models) |
| **ai-saas** | AI-powered SaaS | Auth + API Keys + AI Cost Tracking + Payments (9 models) |
| **dashboard** | Team dashboards | Auth + Organizations + Audit Logs + Feature Flags (14+ models) |

## Initial Setup

### 1. Choose Your Database

All schemas use PostgreSQL by default. Supported options:

- **Local PostgreSQL** - Best for development
- **Supabase** - Free tier available, managed PostgreSQL
- **Neon** - Serverless PostgreSQL with free tier
- **Railway** - One-click PostgreSQL deployment
- **Vercel Postgres** - Integrated with Vercel hosting

### 2. Set Database URL

Copy `.env.example` to `.env` and update `DATABASE_URL`:

```bash
cp .env.example .env
```

Example connection strings:

```bash
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/myapp"

# Supabase
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Neon
DATABASE_URL="postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb"

# Railway
DATABASE_URL="postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway"
```

### 3. Initialize Database

Choose one approach:

#### Option A: Push Schema (Development)

Fast, no migration files:

```bash
pnpm dlx prisma db push
pnpm dlx prisma generate
```

#### Option B: Create Migration (Production)

Generates migration files for version control:

```bash
pnpm dlx prisma migrate dev --name init
pnpm dlx prisma generate
```

## Common Workflows

### Development

```bash
# Make schema changes in schema.prisma, then:
pnpm dlx prisma db push           # Quick update (no migration file)
pnpm dlx prisma studio            # View/edit data in browser
pnpm dlx prisma format            # Format schema.prisma
```

### Production Deployment

```bash
# Add to your deployment pipeline:
pnpm dlx prisma migrate deploy    # Run pending migrations
pnpm dlx prisma generate          # Generate Prisma Client
```

### Database Management

```bash
# Reset database (WARNING: deletes all data!)
pnpm dlx prisma migrate reset

# Pull schema from existing database
pnpm dlx prisma db pull

# Seed database (if seed script exists)
pnpm dlx prisma db seed
```

## Schema Customization

### Adding New Models

1. Edit `prisma/schema.prisma`:

```prisma
model Post {
  id        String   @id @default(uuid())
  title     String
  content   String   @db.Text
  authorId  String   @map("author_id")
  createdAt DateTime @default(now()) @map("created_at")

  author User @relation(fields: [authorId], references: [id])

  @@map("posts")
}
```

2. Update User model to include relation:

```prisma
model User {
  // ... existing fields
  posts Post[]
}
```

3. Apply changes:

```bash
pnpm dlx prisma db push
pnpm dlx prisma generate
```

### Modifying Existing Models

Example: Add a `bio` field to User:

```prisma
model User {
  id    String  @id @default(uuid())
  name  String?
  email String  @unique
  bio   String? @db.Text  // New field
  // ... rest of fields
}
```

Then run:

```bash
pnpm dlx prisma db push
```

## Template-Specific Patterns

### AI SaaS Template

```typescript
// Track AI usage
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

await prisma.aICostLog.create({
  data: {
    userId: session.user.id,
    model: 'gpt-4-turbo',
    provider: 'openai',
    inputTokens: 500,
    outputTokens: 1000,
    totalTokens: 1500,
    cost: 0.045,
    feature: 'chat-completion'
  }
})

// Get user's API keys
const apiKeys = await prisma.apiKey.findMany({
  where: {
    userId: session.user.id,
    revokedAt: null
  }
})

// Check subscription
const subscription = await prisma.subscription.findUnique({
  where: { userId: session.user.id }
})
const isActive = subscription?.status === 'active'
```

### Dashboard Template

```typescript
// Create organization
const org = await prisma.organization.create({
  data: {
    name: 'Acme Corp',
    slug: 'acme-corp',
    ownerId: session.user.id,
    members: {
      create: {
        userId: session.user.id,
        role: 'owner'
      }
    }
  }
})

// Check user's role in org
const membership = await prisma.orgMember.findUnique({
  where: {
    userId_orgId: {
      userId: session.user.id,
      orgId: params.orgId
    }
  }
})

const hasPermission = ['owner', 'admin'].includes(membership?.role)

// Create audit log
await prisma.auditLog.create({
  data: {
    action: 'org.member.invited',
    resource: `org:${org.id}`,
    actorId: session.user.id,
    actorEmail: session.user.email,
    metadata: {
      invitedEmail: 'newuser@example.com',
      role: 'member'
    }
  }
})
```

### Basic Template

```typescript
// Simple notification creation
await prisma.notification.create({
  data: {
    userId: session.user.id,
    type: 'success',
    title: 'Profile Updated',
    message: 'Your profile has been updated successfully.',
    link: '/profile'
  }
})

// Get unread count
const unreadCount = await prisma.notification.count({
  where: {
    userId: session.user.id,
    read: false,
    dismissed: false
  }
})
```

## Performance Tips

### 1. Use Indexes

Already included in schemas for common queries:

```prisma
@@index([userId, timestamp])  // Compound index
@@index([status])             // Single field index
```

### 2. Connection Pooling

For serverless (Vercel, Netlify), use connection pooling:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

Update DATABASE_URL for pooling:

```
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"
```

### 3. Select Only Needed Fields

```typescript
// Bad: fetches all fields
const user = await prisma.user.findUnique({ where: { id } })

// Good: only fetches needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true }
})
```

### 4. Use Transactions

For multi-step operations:

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { email, name } })
  await tx.notification.create({
    data: {
      userId: user.id,
      type: 'info',
      title: 'Welcome!',
      message: 'Thanks for signing up.'
    }
  })
})
```

## Migration to Production

### 1. Create Migrations Locally

```bash
pnpm dlx prisma migrate dev --name add_user_bio
```

This creates `prisma/migrations/[timestamp]_add_user_bio/migration.sql`

### 2. Commit Migration Files

```bash
git add prisma/migrations
git commit -m "feat: add user bio field"
```

### 3. Deploy Migrations

In your CI/CD or production environment:

```bash
pnpm dlx prisma migrate deploy
pnpm dlx prisma generate
```

## Troubleshooting

### "Environment variable not found: DATABASE_URL"

Make sure `.env` exists and contains `DATABASE_URL`:

```bash
cp .env.example .env
# Edit .env and add your database URL
```

### "Error: P1001: Can't reach database server"

Check:
1. Database is running
2. Connection string is correct
3. Firewall allows connections
4. Database credentials are valid

### "Error: P3009: migrate failed to apply cleanly to the shadow database"

Reset and recreate:

```bash
pnpm dlx prisma migrate reset
pnpm dlx prisma migrate dev
```

### Type Errors After Schema Changes

Regenerate Prisma Client:

```bash
pnpm dlx prisma generate
```

Restart your dev server.

## Next Steps

- Read template-specific `prisma/README.md` for detailed usage
- Explore [Prisma documentation](https://www.prisma.io/docs)
- Add seed data with [Prisma seeding](https://www.prisma.io/docs/guides/database/seed-database)
- Set up database backups for production
- Monitor query performance with Prisma logging

## Resources

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Deployment Guides](https://www.prisma.io/docs/guides/deployment)
