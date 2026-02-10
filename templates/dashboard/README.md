# FABRK Dashboard

A production-ready admin dashboard built with [FABRK Framework](https://github.com/jpoindexter/fabrk-framework).

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Run development server:**
   ```bash
   pnpm dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## What's Included

- ✅ **DashboardShell** with responsive sidebar navigation
- ✅ **KPI Cards & Stats Grids** for metrics visualization
- ✅ **8+ Chart Components** (bar, line, area, pie, donut, funnel)
- ✅ **DataTable** with sorting, filtering, and pagination
- ✅ **Terminal Design System** with 18 themes
- ✅ **105+ UI Components** from `@fabrk/components`
- ✅ **Next.js 15** with App Router
- ✅ **TypeScript** for type safety

## Dashboard Components

```tsx
import {
  DashboardShell,
  DashboardHeader,
  StatsGrid,
  BarChart,
  LineChart,
  DataTable,
} from '@fabrk/components'

export default function Dashboard() {
  return (
    <DashboardShell
      sidebarItems={[
        { id: 'overview', label: 'Overview', href: '/dashboard' },
        { id: 'analytics', label: 'Analytics', href: '/dashboard/analytics' },
      ]}
      user={{ name: 'Jason', tier: 'pro' }}
      logo={<span className="text-accent text-xl">#</span>}
      onSignOut={() => signOut()}
    >
      <DashboardHeader title="Overview" subtitle="Last 30 days" />
      <StatsGrid items={[
        { label: 'Revenue', value: 45200, change: '+12%' },
        { label: 'Users', value: 1234, change: '+8%' },
      ]} />
      <div className="p-4">
        <LineChart data={chartData} />
        <DataTable columns={columns} data={tableData} />
      </div>
    </DashboardShell>
  )
}
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript checks

## Learn More

- [FABRK Documentation](https://github.com/jpoindexter/fabrk-framework)
- [Dashboard Components](https://github.com/jpoindexter/fabrk-framework/tree/main/packages/components)
- [Chart Examples](https://github.com/jpoindexter/fabrk-framework/tree/main/packages/components/src/charts)

## Deploy

The easiest way to deploy is with [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
