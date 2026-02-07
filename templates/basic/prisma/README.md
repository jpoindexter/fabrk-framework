# Prisma Database Setup - Basic Template

This template includes a minimal database schema with authentication and notifications - perfect for starting simple and expanding later.

## Quick Start

1. Set up your database URL in `.env`:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/fabrk_basic?schema=public"
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

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Get user by email
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' }
})

// Create notification
await prisma.notification.create({
  data: {
    userId: user.id,
    type: 'info',
    title: 'Welcome!',
    message: 'Thanks for signing up.',
    link: '/getting-started'
  }
})

// Get unread notifications
const notifications = await prisma.notification.findMany({
  where: {
    userId: user.id,
    read: false,
    dismissed: false
  },
  orderBy: { createdAt: 'desc' }
})

// Mark notification as read
await prisma.notification.update({
  where: { id: notification.id },
  data: { read: true }
})
```

## Environment Variables

Make sure to set these in your `.env` file:

- `DATABASE_URL` - PostgreSQL connection string (required)
- `NEXTAUTH_SECRET` - NextAuth secret for session encryption
- `NEXTAUTH_URL` - Your app URL

Generate a secret with:
```bash
openssl rand -base64 32
```

## Expanding the Schema

This basic schema is intentionally minimal. As your app grows, you can add:

- Organizations and teams
- API keys
- Payments/subscriptions
- File uploads
- Feature flags
- Audit logging

See the `ai-saas` and `dashboard` templates for more complete examples.

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

4. Monitor database performance
