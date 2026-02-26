# AGENTS.md — FABRK Framework

> For AI coding agents: Claude Code, Cursor, GitHub Copilot, v0.dev, Windsurf, etc.

## TL;DR

- **What**: AI-first React UI framework — 12 packages, 109+ components, 18 themes
- **Stack**: TypeScript 5.x • React 19 • Next.js 16 • pnpm workspaces • Turbo
- **Package manager**: pnpm (NOT npm, NOT yarn)
- **Rule #1**: USE EXISTING COMPONENTS — don't rebuild what's already here

## Quick Start

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all 17 packages (12 libs + 5 examples)
pnpm dev              # Watch mode
pnpm test             # Run 748 tests
pnpm type-check       # TypeScript validation
pnpm lint             # Lint all packages
pnpm size             # Bundle size tracking
```

## Package Map

| Package | Purpose | Key Exports |
|---------|---------|-------------|
| `@fabrk/core` | Runtime, plugins, middleware, teams, jobs, flags | `cn()`, `createPlugin()`, `defineMiddleware()` |
| `@fabrk/components` | 109+ UI components, 11 chart types, dashboard shell, 15 hooks | `DashboardShell`, `KpiCard`, `DataTable`, `LineChart` |
| `@fabrk/design-system` | 18 themes, design tokens | `mode` (radius, font, etc.), theme CSS vars |
| `@fabrk/config` | Type-safe config (13 sections, Zod) | `defineFabrkConfig()`, section schemas |
| `@fabrk/ai` | AI toolkit: LLM providers, streaming, cost tracking | `ai.generate()`, `claude`, `openai`, `AICostTracker` |
| `@fabrk/auth` | NextAuth, API keys, MFA (TOTP + backup codes) | `createNextAuthAdapter()`, `generateApiKey()`, `verifyTotp()` |
| `@fabrk/payments` | Stripe, Polar, Lemon Squeezy adapters | `createStripeAdapter()`, `createPolarAdapter()` |
| `@fabrk/security` | CSRF, CSP, rate limiting, audit, GDPR, CORS | `createCsrfProtection()`, `createMemoryRateLimiter()`, `createAuditLogger()` |
| `@fabrk/email` | Resend adapter + templates | `createResendAdapter()`, `createConsoleAdapter()` |
| `@fabrk/storage` | S3, R2, local filesystem adapters | `createS3Adapter()`, `createR2Adapter()`, `createLocalAdapter()` |
| `@fabrk/store-prisma` | 7 Prisma store adapters | `PrismaTeamStore`, `PrismaAuditStore`, `PrismaJobStore` |
| `create-fabrk-app` | CLI scaffolding tool | `npx create-fabrk-app` |

## Component Categories

When a user asks you to build UI, check these first:

### Dashboard & Layout
`DashboardShell`, `DashboardHeader`, `Sidebar`, `RightRail`, `PageHeader`, `Breadcrumb`

### Data Display
`DataTable`, `KPICard`, `StatsGrid`, `TierBadge`, `UsageBar`, `ProgressCard`

### Charts (8 types)
`LineChart`, `BarChart`, `AreaChart`, `PieChart`, `DonutChart`, `FunnelChart`, `Heatmap`, `StackedBarChart`

### AI & Chat
`AiChat`, `AiChatInput`, `AiChatMessageList`, `AiChatSidebar`, `AiChatAttachmentPreview`

### Admin
`AuditLog`, `AdminMetricsCard`, `SystemHealthWidget`

### Security
`MfaCard`, `MfaSetupDialog`, `BackupCodesModal`

### Organization
`OrgSwitcher`, `MemberCard`, `TeamActivityFeed`

### Feedback & Notifications
`NotificationCenter`, `NotificationList`, `Toast`

### Forms & UI Primitives
`Button`, `Card`, `Dialog`, `Select`, `Input`, `Textarea`, `Accordion`, `Badge`, `Avatar`, `Checkbox`, `Switch`, `Tabs`, `Tooltip`, `Popover`, `DropdownMenu`, `Sheet`, `AlertDialog`, `CodeBlock`, `TerminalCard`

## Design System Rules (Non-Negotiable)

### Use Design Tokens
```tsx
// CORRECT
className="bg-primary text-primary-foreground"
className="bg-card border-border"

// WRONG — breaks theme switching
className="bg-blue-500 text-white"
```

### Border + Radius
```tsx
import { mode } from '@fabrk/design-system'

// Full border → ALWAYS add mode.radius
<Card className={cn("border border-border", mode.radius)}>

// Partial border → NEVER add mode.radius
<div className="border-t border-border">
```

### Terminal Aesthetic
- Labels/Badges: UPPERCASE `[SYSTEM]`, `[STATUS]`
- Buttons: UPPERCASE with `>`: `> SUBMIT`
- Headlines: UPPERCASE
- Body: Normal sentence case

## Dependency Graph

```
@fabrk/config ←── @fabrk/core ←── @fabrk/ai
@fabrk/design-system ←─┘     ←── @fabrk/auth
                              ←── @fabrk/payments
                              ←── @fabrk/security
                              ←── @fabrk/email
                              ←── @fabrk/storage
                              ←── @fabrk/components
```

## Example: Build a Dashboard

```tsx
import {
  DashboardShell, DashboardHeader, StatsGrid,
  LineChart, KPICard, DataTable
} from '@fabrk/components'
import { mode } from '@fabrk/design-system'

export default function Dashboard() {
  return (
    <DashboardShell
      sidebarItems={[
        { id: 'overview', label: 'Overview', href: '/dashboard' },
        { id: 'analytics', label: 'Analytics', href: '/dashboard/analytics' },
      ]}
      user={{ name: 'Jason', tier: 'pro' }}
    >
      <DashboardHeader title="Overview" />
      <StatsGrid items={[
        { label: 'Users', value: 1572 },
        { label: 'Revenue', value: '$12.4K', change: '+12%' },
      ]} />
      <LineChart data={weekTrend} />
    </DashboardShell>
  )
}
```

## Reference

- **CLAUDE.md** — Full project documentation, design rules, workflows
- **DESIGN_SYSTEM_RULES.md** — Detailed design system rules
- **COMPONENT_INVENTORY.md** — Complete component list with categories
- Per-package `AGENTS.md` files in `packages/*/AGENTS.md`
