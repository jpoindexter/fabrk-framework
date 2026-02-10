# FABRK SaaS Analytics Dashboard

Complete SaaS analytics dashboard showcasing FABRK's data visualization and dashboard components.

<!-- screenshot -->

## FEATURES

- **Real-time KPI tracking** - MRR, active users, churn rate, ARPU metrics
- **Revenue analytics** - Monthly recurring revenue bar chart with growth trends
- **User engagement** - Daily active users line chart with 7-day trend
- **Customer insights** - Top accounts table with plan tier and status badges
- **Plan distribution** - Donut chart showing Free/Pro/Team plan breakdown
- **Responsive layout** - Full dashboard shell with sidebar navigation
- **Terminal aesthetic** - Monospace fonts, uppercase labels, bracket notation

## QUICK START

```bash
# From monorepo root
pnpm install

# Run the example (port 3002)
cd examples/saas-analytics
pnpm dev
```

Open [http://localhost:3002](http://localhost:3002) to view the dashboard.

## WHAT'S DEMONSTRATED

### @fabrk/components

- **DashboardShell** - Full dashboard layout with sidebar, header, user menu
- **DashboardHeader** - Page title and subtitle component
- **StatsGrid** - KPI cards with values and percentage changes
- **BarChart** - Monthly revenue visualization with custom formatters
- **LineChart** - Daily active users trend with monotone curves
- **DonutChart** - Plan distribution with legend and percentages
- **Table** - Customer data table with sortable columns
- **Badge** - Status indicators (Active, Churned, Trial)

### @fabrk/design-system

- **mode.radius** - Consistent border radius from active theme
- **mode.font** - Monospace terminal typography
- **Design tokens** - Semantic color tokens (primary, muted, destructive)
- **Theme-aware** - All colors via CSS variables for runtime theme switching

### @fabrk/core

- **cn()** - Utility for conditional className merging
- **Type-safe props** - Full TypeScript support for all components

## FILE STRUCTURE

```
saas-analytics/
├── src/
│   └── app/
│       ├── globals.css          # Tailwind + FABRK design tokens
│       ├── layout.tsx            # Next.js root layout
│       └── page.tsx              # Dashboard with mock data
├── package.json
├── tsconfig.json
└── next.config.mjs
```

## KEY PATTERNS

**Mock data structure:**
```tsx
const revenueData = [
  { month: 'Aug', revenue: 8200 },
  { month: 'Sep', revenue: 9100 },
  // ... monthly trend
]

const topCustomers = [
  { name: 'Acme Corp', plan: 'Team', mrr: '$2,400', status: 'active' },
  // ... customer accounts
]
```

**Chart formatters:**
```tsx
<BarChart
  data={revenueData}
  xAxisKey="month"
  series={[{ dataKey: 'revenue', name: 'Revenue' }]}
  yAxisFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
  tooltipFormatter={(v) => `$${v.toLocaleString()}`}
/>
```

**Responsive grid layout:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2">
  <div className="border-b border-r border-border p-4">
    <BarChart data={revenueData} />
  </div>
  <div className="border-b border-border p-4">
    <LineChart data={dauData} />
  </div>
</div>
```

## USE CASES

Perfect starting point for:
- SaaS admin dashboards
- Analytics platforms
- Business intelligence tools
- Subscription management UIs
- Financial reporting interfaces

Built with FABRK Framework - [github.com/fabrkframework/fabrk](https://github.com/fabrkframework/fabrk)
