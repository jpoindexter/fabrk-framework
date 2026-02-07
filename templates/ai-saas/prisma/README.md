# Prisma Database Setup - AI SaaS Template

This template includes a complete database schema for an AI-powered SaaS application with authentication, payments, cost tracking, and notifications.

## Quick Start

1. Set up your database URL in `.env`:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/fabrk_ai_saas?schema=public"
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

### API Keys
- **ApiKey** - User API keys with scopes and expiration

### AI Cost Tracking
- **AICostLog** - Tracks AI usage by model, tokens, and cost

### Payments (Stripe)
- **Subscription** - User subscriptions with Stripe integration
- **CheckoutSession** - Stripe checkout sessions

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

// Track AI cost
await prisma.aICostLog.create({
  data: {
    userId: user.id,
    model: 'gpt-4-turbo',
    provider: 'openai',
    inputTokens: 100,
    outputTokens: 200,
    totalTokens: 300,
    cost: 0.015,
    feature: 'chat'
  }
})

// Get user's API keys
const apiKeys = await prisma.apiKey.findMany({
  where: { userId: user.id, revokedAt: null }
})

// Check subscription status
const subscription = await prisma.subscription.findUnique({
  where: { userId: user.id }
})
```

## Environment Variables

Make sure to set these in your `.env` file:

- `DATABASE_URL` - PostgreSQL connection string (required)
- `NEXTAUTH_SECRET` - NextAuth secret for session encryption
- `NEXTAUTH_URL` - Your app URL
- `STRIPE_SECRET_KEY` - Stripe secret key for payments
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` - AI provider keys

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

4. Monitor database performance with indexes (already included in schema)
