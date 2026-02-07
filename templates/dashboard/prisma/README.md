# Prisma Database Setup - Dashboard Template

This template includes a comprehensive database schema for team dashboards with multi-tenancy, role-based access, feature flags, and audit logging.

## Quick Start

1. Set up your database URL in `.env`:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/fabrk_dashboard?schema=public"
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Push the schema to your database:
   ```bash
   pnpm dlx prisma db push
   ```

4. Generate Prisma Client:
   ```bash
   pnpm dlx prisma generate
   ```

## Schema Overview

### Authentication
- **User** - User accounts with email/password or OAuth
- **Account** - OAuth provider accounts (NextAuth compatible)
- **Session** - Active user sessions
- **VerificationToken** - Email verification tokens

### Organizations & Teams
- **Organization** - Multi-tenant organizations with slug-based URLs
- **OrgMember** - Team members with roles (owner, admin, member, viewer)
- **OrgInvite** - Pending team invitations with expiration

### Feature Flags
- **FeatureFlag** - Gradual rollout with targeting by user/role/org

### Audit Logging
- **AuditLog** - Immutable audit trail with blockchain-style hashing

### Webhooks (Optional)
- **Webhook** - Webhook configurations for integrations
- **WebhookDelivery** - Delivery attempts with retry logic

### Background Jobs (Optional)
- **Job** - Task queue for async processing

### Notifications
- **Notification** - In-app notifications with read/dismissed status

## Common Commands

```bash
# View database in Prisma Studio
pnpm dlx prisma studio

# Create a migration (for production)
pnpm dlx prisma migrate dev --name init

# Reset database (development only!)
pnpm dlx prisma migrate reset

# Pull schema from existing database
pnpm dlx prisma db pull

# Format schema file
pnpm dlx prisma format
```

## Usage in Code

### Organizations

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Create organization
const org = await prisma.organization.create({
  data: {
    name: 'Acme Corp',
    slug: 'acme-corp',
    ownerId: user.id,
    members: {
      create: {
        userId: user.id,
        role: 'owner'
      }
    }
  }
})

// Invite team member
const invite = await prisma.orgInvite.create({
  data: {
    email: 'newuser@example.com',
    orgId: org.id,
    role: 'member',
    token: generateToken(),
    inviterId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }
})

// Check user's role in org
const membership = await prisma.orgMember.findUnique({
  where: {
    userId_orgId: {
      userId: user.id,
      orgId: org.id
    }
  }
})
```

### Feature Flags

```typescript
// Create feature flag
await prisma.featureFlag.create({
  data: {
    name: 'new-dashboard',
    description: 'New dashboard UI',
    enabled: true,
    rolloutPercent: 50, // 50% rollout
    targetRoles: ['admin'] // Always enabled for admins
  }
})

// Check if feature is enabled for user
async function isFeatureEnabled(
  flagName: string,
  userId: string,
  role: string
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { name: flagName }
  })

  if (!flag || !flag.enabled) return false
  if (flag.targetUsers.includes(userId)) return true
  if (flag.targetRoles.includes(role)) return true

  // Rollout percentage check
  const hash = hashUserId(userId) // Deterministic hash
  return hash % 100 < flag.rolloutPercent
}
```

### Audit Logging

```typescript
// Create audit log entry
async function createAuditLog(
  action: string,
  resource: string,
  actorId: string,
  metadata: any
) {
  // Get previous hash for chain integrity
  const previous = await prisma.auditLog.findFirst({
    orderBy: { timestamp: 'desc' },
    select: { hash: true }
  })

  const entry = {
    action,
    resource,
    actorId,
    actorEmail: actor.email,
    metadata,
    previousHash: previous?.hash
  }

  const hash = createHash(JSON.stringify(entry))

  return prisma.auditLog.create({
    data: { ...entry, hash }
  })
}
```

## Environment Variables

Make sure to set these in your `.env` file:

- `DATABASE_URL` - PostgreSQL connection string (required)
- `NEXTAUTH_SECRET` - NextAuth secret for session encryption
- `NEXTAUTH_URL` - Your app URL
- `ENABLE_WEBHOOKS` - Enable webhook functionality
- `ENABLE_BACKGROUND_JOBS` - Enable background job queue

## Production Considerations

1. Use migrations instead of `db push`:
   ```bash
   pnpm dlx prisma migrate deploy
   ```

2. Enable connection pooling for serverless:
   ```
   DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"
   ```

3. Set up database backups regularly

4. Monitor audit log growth and archive old entries

5. Add indexes for performance (already included in schema)

6. Consider read replicas for analytics queries
