# fabrk-agent-demo

**The FABRK Framework agent demo.**

This is "CodeScan" — a realistic GitHub analytics SaaS built entirely with `@fabrk/components`.
It exists to prove one thing: an AI coding agent can build a full, production-quality SaaS dashboard
in a single prompt without writing any layout, chart, or table boilerplate from scratch.

## Pages

| Route | What it shows |
|-------|--------------|
| `/` | Marketing landing page with pricing, testimonials, and feature grid |
| `/dashboard` | Analytics dashboard: KPIs, charts, stacked bar, DataTable of repos |
| `/dashboard/settings` | Tabbed settings: Workspace, Notifications, Team, API Keys |

## Running locally

```bash
# From monorepo root (first time)
pnpm install

# Start the demo
cd examples/agent-demo
pnpm dev
# Open http://localhost:3004
```

## What it demonstrates

Every piece of UI in this app comes from `@fabrk/components` or `@fabrk/design-system`:

```tsx
import {
  DashboardShell, DashboardHeader, StatsGrid, KpiCard,
  LineChart, BarChart, DataTable, PricingCard,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Input, Switch, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Separator,
  Badge, Button, Card, CardContent, CardHeader,
} from '@fabrk/components'
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'
```

No custom sidebar, no Recharts wiring, no TanStack table setup, no tab plumbing.
The agent just imports and composes.

## How it was generated

See [AGENT_PROMPT.md](./AGENT_PROMPT.md) for the exact prompt used — copy-paste it into
Claude Code and watch the same app regenerate in one shot.
