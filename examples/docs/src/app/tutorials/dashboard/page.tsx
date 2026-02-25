'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function DashboardTutorialPage() {
  return (
    <DocLayout
      title="BUILD A DASHBOARD"
      description="Build a full admin dashboard with FABRK in 7 steps. Every code block is copy-paste ready."
    >
      <InfoCard title="WHAT YOU WILL BUILD">
        A complete admin dashboard with sidebar navigation, KPI cards, bar and line charts,
        a sortable data table, and production deployment. Estimated time: 10 minutes.
      </InfoCard>

      {/* STEP 1 — SCAFFOLD */}
      <Section title="STEP 1 — SCAFFOLD">
        <p className="text-sm text-muted-foreground mb-4">
          Use the FABRK CLI to scaffold a new project with the dashboard template.
          This gives you a Next.js app pre-wired with all FABRK packages.
        </p>
        <CodeBlock title="terminal">{`npx create-fabrk-app my-dashboard --template dashboard
cd my-dashboard
pnpm install`}</CodeBlock>
        <p className="text-sm text-muted-foreground mt-3">
          The dashboard template includes the design system, components, core runtime,
          and a starter layout. You can also start from scratch with the basic template.
        </p>
      </Section>

      {/* STEP 2 — CONFIGURE */}
      <Section title="STEP 2 — CONFIGURE">
        <p className="text-sm text-muted-foreground mb-4">
          Edit <code className="text-primary">fabrk.config.ts</code> at your project root
          to enable teams, feature flags, and notifications for your dashboard.
        </p>
        <CodeBlock title="fabrk.config.ts">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  app: {
    name: 'My Dashboard',
    url: 'http://localhost:3000',
  },
  teams: {
    enabled: true,
    roles: ['admin', 'editor', 'viewer'],
    maxMembers: 25,
  },
  featureFlags: {
    enabled: true,
    flags: {
      'advanced-analytics': { enabled: false, description: 'Show advanced charts' },
      'export-csv': { enabled: true, description: 'Allow CSV export' },
    },
  },
  notifications: {
    enabled: true,
    channels: ['in-app'],
  },
})`}</CodeBlock>
        <InfoCard title="TIP">
          Every config section has sensible defaults. You only need to specify the
          sections you want to customize. The <code className="text-primary">defineFabrkConfig</code> function
          provides full type safety and autocomplete.
        </InfoCard>
      </Section>

      {/* STEP 3 — LAYOUT */}
      <Section title="STEP 3 — LAYOUT">
        <p className="text-sm text-muted-foreground mb-4">
          Create a dashboard layout with sidebar navigation using <code className="text-primary">DashboardShell</code>.
          The sidebar uses a partial border (border-r) so it does NOT get mode.radius.
        </p>
        <CodeBlock title="src/app/dashboard/layout.tsx">{`'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sidebarItems = [
  { id: 'overview', label: 'OVERVIEW', href: '/dashboard' },
  { id: 'analytics', label: 'ANALYTICS', href: '/dashboard/analytics' },
  { id: 'users', label: 'USERS', href: '/dashboard/users' },
  { id: 'settings', label: 'SETTINGS', href: '/dashboard/settings' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — partial border, NO mode.radius */}
      <aside className="w-64 border-r border-border bg-card p-4 shrink-0">
        <div className={cn('text-primary font-bold text-lg mb-8', mode.font)}>
          {'>'} MY DASHBOARD
        </div>
        <nav className="space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'block px-3 py-2 text-xs transition-colors',
                mode.font,
                pathname === item.href
                  ? 'text-primary bg-primary/10 border-l-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}`}</CodeBlock>
      </Section>

      {/* STEP 4 — KPI CARDS */}
      <Section title="STEP 4 — KPI CARDS">
        <p className="text-sm text-muted-foreground mb-4">
          Add KPI cards to show key metrics at the top of your dashboard.
          Each card shows a title, value, and optional trend indicator.
        </p>
        <CodeBlock title="src/app/dashboard/page.tsx (part 1)">{`'use client'

import { KPICard } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

const stats = [
  { title: 'REVENUE', value: '$48,290', trend: 12.5 },
  { title: 'USERS', value: '3,847', trend: 8.3 },
  { title: 'ORDERS', value: '1,024', trend: -2.1 },
  { title: 'UPTIME', value: '99.97%', trend: 0.1 },
]

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className={cn('text-xl font-bold uppercase', mode.font)}>
          OVERVIEW
        </h1>
        <p className="text-sm text-muted-foreground">
          Your dashboard at a glance.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <KPICard
            key={s.title}
            title={s.title}
            value={s.value}
            trend={s.trend}
          />
        ))}
      </div>
    </div>
  )
}`}</CodeBlock>
        <InfoCard title="DESIGN RULE">
          KPICard uses a full border internally, so mode.radius is applied automatically.
          Trend values are color-coded: positive values show green, negative show red.
        </InfoCard>
      </Section>

      {/* STEP 5 — CHARTS */}
      <Section title="STEP 5 — CHARTS">
        <p className="text-sm text-muted-foreground mb-4">
          Add <code className="text-primary">BarChart</code> and <code className="text-primary">LineChart</code> components
          for data visualization. Wrap them in a Card with a full border (needs mode.radius).
        </p>
        <CodeBlock title="src/app/dashboard/page.tsx (add below KPI row)">{`import { KPICard, Card, BarChart, LineChart } from '@fabrk/components'

const revenueData = [
  { label: 'Mon', value: 6200 },
  { label: 'Tue', value: 7800 },
  { label: 'Wed', value: 5400 },
  { label: 'Thu', value: 8200 },
  { label: 'Fri', value: 9100 },
  { label: 'Sat', value: 4300 },
  { label: 'Sun', value: 3800 },
]

const trendData = [
  { label: 'Week 1', value: 18200 },
  { label: 'Week 2', value: 22400 },
  { label: 'Week 3', value: 19800 },
  { label: 'Week 4', value: 28100 },
]

// Add this inside DashboardPage, below the KPI row:
{/* Charts row */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <Card className={cn('p-6 border border-border', mode.radius)}>
    <h3 className={cn(
      'text-xs uppercase text-muted-foreground mb-4',
      mode.font
    )}>
      [WEEKLY REVENUE]
    </h3>
    <BarChart data={revenueData} />
  </Card>
  <Card className={cn('p-6 border border-border', mode.radius)}>
    <h3 className={cn(
      'text-xs uppercase text-muted-foreground mb-4',
      mode.font
    )}>
      [MONTHLY TREND]
    </h3>
    <LineChart data={trendData} />
  </Card>
</div>`}</CodeBlock>
        <InfoCard title="DESIGN RULE">
          Card uses a full border, so it ALWAYS needs mode.radius. The chart title uses
          bracket notation [WEEKLY REVENUE] following the terminal aesthetic. Labels are
          UPPERCASE with mode.font for the monospace look.
        </InfoCard>
      </Section>

      {/* STEP 6 — DATA TABLE */}
      <Section title="STEP 6 — DATA TABLE">
        <p className="text-sm text-muted-foreground mb-4">
          Add a <code className="text-primary">DataTable</code> with sortable columns
          to display structured data. The table header uses a partial border (border-b),
          so it does NOT get mode.radius.
        </p>
        <CodeBlock title="src/app/dashboard/page.tsx (add below charts)">{`import { Card, Badge, DataTable } from '@fabrk/components'

const users = [
  { name: 'Jason', email: 'jason@example.com', role: 'Admin', status: 'Active' },
  { name: 'Sarah', email: 'sarah@example.com', role: 'Editor', status: 'Active' },
  { name: 'Mike', email: 'mike@example.com', role: 'Viewer', status: 'Invited' },
  { name: 'Alex', email: 'alex@example.com', role: 'Editor', status: 'Active' },
]

const columns = [
  { key: 'name', label: 'NAME', sortable: true },
  { key: 'email', label: 'EMAIL', sortable: true },
  { key: 'role', label: 'ROLE' },
  { key: 'status', label: 'STATUS' },
]

// Add this inside DashboardPage, below the charts:
{/* Data table */}
<Card className={cn('border border-border', mode.radius)}>
  <div className="p-4 border-b border-border flex items-center justify-between">
    <h3 className={cn(
      'text-xs uppercase text-muted-foreground',
      mode.font
    )}>
      [RECENT USERS]
    </h3>
    <Badge variant="secondary">[{users.length} TOTAL]</Badge>
  </div>
  <DataTable columns={columns} data={users} />
</Card>`}</CodeBlock>
        <InfoCard title="DESIGN RULE">
          The outer Card has a full border and needs mode.radius. The inner header div uses
          border-b (partial border) so it does NOT get mode.radius. Table cells (th, td)
          NEVER get mode.radius as it breaks the table layout.
        </InfoCard>
      </Section>

      {/* STEP 7 — DEPLOY */}
      <Section title="STEP 7 — DEPLOY">
        <p className="text-sm text-muted-foreground mb-4">
          Build and deploy your dashboard. The FABRK CLI handles production optimization.
        </p>
        <CodeBlock title="terminal">{`# Build for production
fabrk build

# Deploy to Vercel
vercel

# Or deploy to any Node.js host
fabrk build && node .next/standalone/server.js`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-4">
          Set your environment variables on the hosting platform before deploying.
        </p>
        <CodeBlock title="environment variables">{`# Required
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="https://yourdomain.com"

# Optional (based on config)
STRIPE_SECRET_KEY="sk_live_..."
RESEND_API_KEY="re_..."
ANTHROPIC_API_KEY="sk-ant-..."
S3_BUCKET="your-bucket"
S3_REGION="us-east-1"`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-6 mb-3', mode.font)}>
          PRODUCTION CONFIG
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Update your fabrk.config.ts for production with security features enabled.
        </p>
        <CodeBlock title="fabrk.config.ts (production)">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  app: {
    name: 'My Dashboard',
    url: 'https://yourdomain.com',
  },
  security: {
    csrf: true,
    csp: true,
    rateLimit: true,
    auditLog: true,
    headers: true,
    cors: {
      origins: ['https://yourdomain.com'],
    },
  },
  email: {
    adapter: 'resend',
    from: 'noreply@yourdomain.com',
  },
})`}</CodeBlock>

        <InfoCard title="PRODUCTION CHECKLIST">
          <ul className="space-y-1 mt-1">
            <li>Enable CSRF, CSP, and rate limiting in security config</li>
            <li>Switch email from console adapter to Resend</li>
            <li>Set NEXTAUTH_URL to your production domain</li>
            <li>Generate a strong NEXTAUTH_SECRET with <code className="text-primary">openssl rand -base64 32</code></li>
            <li>Use PrismaTeamStore and PrismaAuditStore instead of in-memory stores</li>
            <li>Configure connection pooling for serverless databases</li>
          </ul>
        </InfoCard>
      </Section>

      {/* COMPLETE EXAMPLE */}
      <Section title="COMPLETE EXAMPLE">
        <p className="text-sm text-muted-foreground mb-4">
          Here is the full dashboard page with all components combined into a single file.
          Copy this for a complete working dashboard.
        </p>
        <CodeBlock title="src/app/dashboard/page.tsx">{`'use client'

import { KPICard, Card, Badge, BarChart, LineChart, DataTable } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

const stats = [
  { title: 'REVENUE', value: '$48,290', trend: 12.5 },
  { title: 'USERS', value: '3,847', trend: 8.3 },
  { title: 'ORDERS', value: '1,024', trend: -2.1 },
  { title: 'UPTIME', value: '99.97%', trend: 0.1 },
]

const revenueData = [
  { label: 'Mon', value: 6200 },
  { label: 'Tue', value: 7800 },
  { label: 'Wed', value: 5400 },
  { label: 'Thu', value: 8200 },
  { label: 'Fri', value: 9100 },
  { label: 'Sat', value: 4300 },
  { label: 'Sun', value: 3800 },
]

const trendData = [
  { label: 'Week 1', value: 18200 },
  { label: 'Week 2', value: 22400 },
  { label: 'Week 3', value: 19800 },
  { label: 'Week 4', value: 28100 },
]

const users = [
  { name: 'Jason', email: 'jason@example.com', role: 'Admin', status: 'Active' },
  { name: 'Sarah', email: 'sarah@example.com', role: 'Editor', status: 'Active' },
  { name: 'Mike', email: 'mike@example.com', role: 'Viewer', status: 'Invited' },
  { name: 'Alex', email: 'alex@example.com', role: 'Editor', status: 'Active' },
]

const columns = [
  { key: 'name', label: 'NAME', sortable: true },
  { key: 'email', label: 'EMAIL', sortable: true },
  { key: 'role', label: 'ROLE' },
  { key: 'status', label: 'STATUS' },
]

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className={cn('text-xl font-bold uppercase', mode.font)}>OVERVIEW</h1>
        <p className="text-sm text-muted-foreground">Your dashboard at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <KPICard key={s.title} title={s.title} value={s.value} trend={s.trend} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={cn('p-6 border border-border', mode.radius)}>
          <h3 className={cn('text-xs uppercase text-muted-foreground mb-4', mode.font)}>
            [WEEKLY REVENUE]
          </h3>
          <BarChart data={revenueData} />
        </Card>
        <Card className={cn('p-6 border border-border', mode.radius)}>
          <h3 className={cn('text-xs uppercase text-muted-foreground mb-4', mode.font)}>
            [MONTHLY TREND]
          </h3>
          <LineChart data={trendData} />
        </Card>
      </div>

      <Card className={cn('border border-border', mode.radius)}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className={cn('text-xs uppercase text-muted-foreground', mode.font)}>
            [RECENT USERS]
          </h3>
          <Badge variant="secondary">[4 TOTAL]</Badge>
        </div>
        <DataTable columns={columns} data={users} />
      </Card>
    </div>
  )
}`}</CodeBlock>

        <InfoCard title="NEXT STEPS">
          <ul className="space-y-1 mt-1">
            <li>Add authentication with the <a href="/guides#auth" className="text-primary underline">Authentication Guide</a></li>
            <li>Add payments with the <a href="/guides#payments" className="text-primary underline">Payments Guide</a></li>
            <li>Add AI features with the <a href="/guides#ai" className="text-primary underline">AI Integration Guide</a></li>
            <li>Customize the theme in your design system config</li>
          </ul>
        </InfoCard>
      </Section>
    </DocLayout>
  )
}
