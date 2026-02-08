# AGENTS.md — FABRK Dashboard App

## Stack

| | |
|---|---|
| **Framework** | Next.js 15 (App Router) + React 19 |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS 4 + FABRK Design System |
| **UI Library** | @fabrk/components (70+ components, 8 chart types) |
| **Config** | @fabrk/config (fabrk.config.ts) |

## Quick Start

```bash
cp .env.example .env.local
# Add DATABASE_URL and NEXTAUTH_SECRET
pnpm install && pnpm dev
```

## FABRK Packages Available

```typescript
// UI + Charts
import { Button, Card, BarChart, LineChart, KPICard } from '@fabrk/components'

// Framework + Hooks
import {
  FabrkProvider, useTeam, useNotifications, useFeatureFlag,
  useWebhooks, useJobs, cn
} from '@fabrk/core'

// Design System
import { mode } from '@fabrk/design-system'

// Config
import { defineFabrkConfig } from '@fabrk/config'
```

## Key Features

### Teams / Organizations

```tsx
import { useTeam } from '@fabrk/core'

function TeamPage() {
  const { manager } = useTeam()
  if (!manager) return <p>Teams not enabled</p>

  const handleCreate = async () => {
    await manager.createOrg({ name: 'Acme', slug: 'acme', ownerId: userId })
  }
}
```

### Feature Flags

```tsx
import { useFeatureFlag } from '@fabrk/core'

function BetaFeature() {
  const { enabled, isLoading } = useFeatureFlag('new-dashboard')
  if (!enabled) return null
  return <NewDashboard />
}
```

### Notifications

```tsx
import { useNotifications } from '@fabrk/core'

function NotifyButton() {
  const { manager } = useNotifications()
  const handleNotify = () => manager?.notify({
    type: 'success', title: 'Done', message: 'Task complete', userId
  })
}
```

## Critical Rules

### 1. USE @fabrk/components — DON'T rebuild from scratch

### 2. USE design tokens — NEVER hardcode colors

`bg-primary`, `text-foreground`, `border-border` etc.

### 3. USE mode.radius for full borders

```tsx
className={cn("border border-border", mode.radius)}
```

### 4. Terminal text casing

- Labels: UPPERCASE `[SYSTEM]`
- Buttons: `> SUBMIT`
- Headlines: UPPERCASE

## Configuration

```typescript
// fabrk.config.ts
import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  theme: { system: 'terminal', colorScheme: 'dark' },
  notifications: { enabled: true },
  teams: { enabled: true, maxMembers: 50 },
  featureFlags: { enabled: true },
})
```

## Project Structure

```
app/
  layout.tsx         ← Root layout with FabrkProvider
  page.tsx           ← Dashboard home
  api/               ← API routes
  globals.css
fabrk.config.ts      ← FABRK configuration
prisma/
  schema.prisma      ← User, Organization, OrgMember, FeatureFlag, AuditLog, etc.
.env.example         ← Database URL + auth secrets
```

## Database Models

| Model | Purpose |
|-------|---------|
| User, Account, Session | NextAuth authentication |
| Organization | Teams/companies |
| OrgMember | Team membership + roles |
| OrgInvite | Invitation system |
| FeatureFlag | Gradual feature rollout |
| AuditLog | Tamper-proof activity logging |
| Webhook + WebhookDelivery | Integration webhooks |
| Job | Background task queue |
| Notification | In-app notifications |

## Commands

```bash
pnpm dev                                 # Start dev server
pnpm build                               # Production build
fabrk lint                               # FABRK compliance check
fabrk generate component MetricsCard     # Scaffold component
fabrk generate page settings             # Scaffold page
fabrk generate api webhooks              # Scaffold API route
```

## Environment Variables

```bash
DATABASE_URL=            # PostgreSQL URL
NEXTAUTH_SECRET=         # Session encryption key
NEXTAUTH_URL=            # App URL (http://localhost:3000)
```
