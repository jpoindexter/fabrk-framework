# AGENT_PROMPT.md

This is the actual prompt used to generate the CodeScan demo in this directory.
Copy and paste it into Claude Code (or any AI coding agent that has access to the FABRK Framework) to see it recreated in one shot.

---

## The Prompt

```
I want to build a GitHub analytics SaaS called "CodeScan" — it scans repos for security issues,
code quality metrics, and PR velocity. Build me a full Next.js app with three pages using
@fabrk/components. The app should look like a real product, not a tutorial.

Use these FABRK imports throughout:

  import {
    DashboardShell, DashboardHeader, StatsGrid, KpiCard,
    LineChart, BarChart, DataTable, PricingCard,
    Badge, Button, Card, CardContent, CardHeader,
    Tabs, TabsList, TabsTrigger, TabsContent,
    Input, Switch, Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue, Separator
  } from '@fabrk/components'
  import { mode } from '@fabrk/design-system'
  import { cn } from '@fabrk/core'

Pages to generate:

1. `/` — Marketing landing page
   - Sticky nav with logo, links, and CTA buttons (Button component)
   - Hero section: headline, subheadline, two CTAs, social proof strip
   - Features grid: 4 cards (Card + CardContent) — security scanning, code quality,
     PR velocity, branch comparison
   - Testimonials: 3 customer quotes with star ratings
   - Pricing section: 3 tiers — Hobby ($0), Pro ($29, featured with PricingCard component),
     Team ($99). Use PricingCard with urgencyMessage and highlights for the Pro tier.
   - CTA banner + footer

2. `/dashboard` — Main analytics dashboard
   - DashboardShell with sidebar (6 nav items: Overview, Repositories, Security, Pull Requests,
     Trends, Settings). Badge counts on Repositories (8) and Security (3).
   - DashboardHeader with title + subtitle + "Add Repo" button
   - StatsGrid with 4 items: repos connected, issues found, critical count, avg coverage
   - KPI row: 4 KpiCards — PR cycle time (trending down 14%), scans today (up 8.2%),
     passing repos (neutral), secrets caught this month
   - Two charts side by side (Card wrapper):
     - LineChart: Complexity vs Coverage % over 8 weeks (two series)
     - BarChart: Daily scans this week
   - Stacked BarChart: Issues by type (Security, Quality, Coverage, Duplication) with
     critical/high/medium segments
   - DataTable: 8 repos with columns for name, language, issue count, coverage %, grade
     (A/B/C badge), last scan time, status badge (passing/warning/failing)

3. `/dashboard/settings` — Settings page
   - Same DashboardShell, Settings item active
   - DashboardHeader: "SETTINGS" / subtitle
   - Tabs component with 4 tabs: WORKSPACE, NOTIFICATIONS, TEAM, API KEYS
   - WORKSPACE tab: 2 cards
     - Profile: workspace name input, slug input, default branch select, scan frequency select
     - Thresholds: min coverage %, max complexity, fail-on-critical select
     - Danger zone card with delete button
   - NOTIFICATIONS tab: 2 cards
     - Alert channels: 4 Switch toggles (Slack, email digest, PR comments, critical-only)
     - Slack integration: webhook URL input + channel input
   - TEAM tab: 2 cards
     - Members list: 4 members with avatar, name, email, role badge, last active, remove button
     - Invite form: email input + role select + invite button
   - API KEYS tab: 2 cards
     - Keys list: 2 keys with name, masked value, created date, last used, copy/revoke buttons
     - Create key form: name input + expiration select + generate button

Use realistic mock data throughout — not lorem ipsum. The product domain is GitHub analytics.
Think real repo names (api-gateway, auth-service, payment-processor, data-pipeline, etc.),
real metrics (1.8d cycle time, 91% coverage, Grade A/B/C), real company names.

Follow FABRK design system rules:
- Full borders always get mode.radius
- All text colors use semantic tokens (text-foreground, text-muted-foreground, etc.)
- Buttons are UPPERCASE with > prefix
- Badge labels are UPPERCASE
- Headlines are UPPERCASE

The app theme should feel like a clean engineering SaaS (Inter font, blues/greens for charts,
white cards on light gray background). Set CSS variables in globals.css for a blue accent
(--accent: 211 100% 50%).

Create:
- package.json (name: fabrk-agent-demo, next 15, react 19, workspace deps)
- tsconfig.json
- next.config.mjs (transpilePackages for @fabrk/*)
- postcss.config.mjs
- src/app/globals.css (Tailwind + CSS vars)
- src/app/layout.tsx
- src/app/page.tsx
- src/app/dashboard/page.tsx
- src/app/dashboard/settings/page.tsx

Do not run pnpm install or build — just create the files.
```

---

## What the agent produced

Running the above prompt against Claude Code with the FABRK Framework installed generated:

| File | Description |
|------|-------------|
| `package.json` | Next.js 15 app with workspace:* deps |
| `tsconfig.json` | Standard Next.js TypeScript config |
| `next.config.mjs` | transpilePackages for all @fabrk/* |
| `postcss.config.mjs` | Tailwind v4 via @tailwindcss/postcss |
| `src/app/globals.css` | Blue-accented theme, Inter font, CSS vars |
| `src/app/layout.tsx` | Root layout with Inter font link |
| `src/app/page.tsx` | Full marketing landing page (250 lines) |
| `src/app/dashboard/page.tsx` | Dashboard with charts, KPIs, and DataTable (230 lines) |
| `src/app/dashboard/settings/page.tsx` | Settings with Tabs, Switches, Selects (280 lines) |

**Total: ~760 lines of production-ready code generated in one shot.**

Without FABRK, an agent would generate:
- 400+ lines of custom sidebar/layout boilerplate
- 200+ lines of chart setup (Recharts config, tooltips, axes)
- 150+ lines of DataTable (TanStack setup, sorting, filtering, pagination)
- 100+ lines of form components

FABRK eliminates ~850 lines of boilerplate by letting agents import instead of generate.

---

## Running the demo

```bash
# From the monorepo root
pnpm install
cd examples/agent-demo
pnpm dev
```

Then open:
- http://localhost:3004 — Landing page with pricing
- http://localhost:3004/dashboard — Analytics dashboard
- http://localhost:3004/dashboard/settings — Settings with Tabs
