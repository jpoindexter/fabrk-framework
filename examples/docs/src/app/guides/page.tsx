import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function GuidesPage() {
  return (
    <DocLayout
      title="GUIDES"
      description="Production-grade guides for building with FABRK. Each guide explains architecture decisions, includes complete code, and covers what to watch out for in production."
    >
      {/* Guide index */}
      <Section title="GUIDE INDEX">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a href="#dashboard" className="block border border-border bg-card p-4 transition-colors hover:border-primary">
            <div className="text-xs font-bold text-primary uppercase">BUILD A DASHBOARD</div>
            <div className="text-xs text-muted-foreground mt-1">KPIs, charts with xAxisKey/series, data tables, sidebar navigation, responsive layout</div>
          </a>
          <a href="#auth" className="block border border-border bg-card p-4 transition-colors hover:border-primary">
            <div className="text-xs font-bold text-primary uppercase">AUTHENTICATION</div>
            <div className="text-xs text-muted-foreground mt-1">Session handling, API keys with SHA-256, MFA (TOTP + backup codes), middleware chains, protected routes</div>
          </a>
          <a href="#payments" className="block border border-border bg-card p-4 transition-colors hover:border-primary">
            <div className="text-xs font-bold text-primary uppercase">PAYMENTS</div>
            <div className="text-xs text-muted-foreground mt-1">Checkout, subscriptions, plan switching, webhooks with replay protection, billing portal</div>
          </a>
          <a href="#ai" className="block border border-border bg-card p-4 transition-colors hover:border-primary">
            <div className="text-xs font-bold text-primary uppercase">AI INTEGRATION</div>
            <div className="text-xs text-muted-foreground mt-1">LLM providers, streaming, cost tracking, budget enforcement, prompt composition, provider fallback</div>
          </a>
          <a href="#deployment" className="block border border-border bg-card p-4 transition-colors hover:border-primary">
            <div className="text-xs font-bold text-primary uppercase">DEPLOYMENT</div>
            <div className="text-xs text-muted-foreground mt-1">Vercel deploy, staging vs production, health checks, CI/CD, security checklist, monitoring</div>
          </a>
        </div>
      </Section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* DASHBOARD GUIDE                                                 */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <Section id="dashboard" title="BUILD A DASHBOARD">
        <p className="text-sm text-muted-foreground mb-4">
          Build a complete admin dashboard with KPIs, charts, data tables, and sidebar
          navigation. This guide covers the full flow from project setup through responsive
          layout, and explains the design system rules that keep your UI consistent across
          all 18 themes.
        </p>

        <InfoCard title="WHY THIS APPROACH">
          FABRK components use the <code>mode</code> design system for theme-aware styling
          through CSS variables. This means your dashboard works with all 18 built-in themes
          without any code changes. The key rule: full borders (like <code>border</code>) always
          get <code>mode.radius</code>, while partial borders (like <code>border-r</code> on the
          sidebar) never do. Table cells also never get radius.
        </InfoCard>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          1. SCAFFOLD THE PROJECT
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          The dashboard template includes pre-configured sidebar, theme support, and example pages.
          If you already have an existing project, skip to step 2 and install the packages manually.
        </p>
        <CodeBlock title="terminal">{`npx create-fabrk-app my-dashboard --template dashboard
cd my-dashboard
pnpm install`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. CREATE THE SIDEBAR LAYOUT
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          The sidebar uses a partial border (<code>border-r</code>) which means it does NOT get{' '}
          <code>mode.radius</code>. This is a critical design system rule: partial borders define
          edges, not containers, so rounded corners would look broken. Active nav items use a
          left border accent (<code>border-l-2</code>) which is also partial and stays sharp.
        </p>
        <CodeBlock title="app/dashboard/layout.tsx">{`'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

const navItems = [
  { id: 'overview', label: 'OVERVIEW', href: '/dashboard' },
  { id: 'analytics', label: 'ANALYTICS', href: '/dashboard/analytics' },
  { id: 'users', label: 'USERS', href: '/dashboard/users' },
  { id: 'settings', label: 'SETTINGS', href: '/dashboard/settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — partial border (border-r), NO mode.radius */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card p-4 shrink-0 flex-col">
        <div className={cn('text-primary font-bold text-lg mb-8', mode.font)}>
          {'>'} MY APP
        </div>
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={cn(
                'block px-3 py-2 text-xs transition-colors',
                mode.font,
                'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="text-xs text-muted-foreground border-t border-border pt-3">
          [v1.0.0]
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}`}</CodeBlock>

        <InfoCard title="RESPONSIVE TIP">
          The sidebar uses <code>hidden md:flex</code> to collapse on mobile. For mobile
          navigation, use the <code>MobileNav</code> component from <code>@fabrk/components</code>{' '}
          which provides a slide-out drawer with the same nav items.
        </InfoCard>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. ADD KPI CARDS AND CHARTS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          This is the main dashboard page. It combines KPI cards for at-a-glance metrics,
          a BarChart for categorical data, a LineChart for trends, and a DataTable for
          detailed records. Pay close attention to the chart props.
        </p>

        <InfoCard title="CHART API EXPLAINED">
          Both <code>BarChart</code> and <code>LineChart</code> require three props:{' '}
          <code>data</code> (array of objects), <code>xAxisKey</code> (string identifying which
          key in each data object maps to the X axis), and <code>series</code> (array of{' '}
          <code>{`{ dataKey, name }`}</code> objects defining each line or bar). The <code>dataKey</code>{' '}
          must match a numeric key in your data objects. The <code>name</code> appears in tooltips
          and legends. Optional props include <code>showLegend</code>, <code>showGrid</code>,{' '}
          <code>height</code>, and formatter functions for axes and tooltips.
        </InfoCard>

        <CodeBlock title="src/app/dashboard/page.tsx">{`'use client'

import { KPICard, Card, Badge, BarChart, LineChart, DataTable } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

// KPI data — in production, fetch this from your API
const stats = [
  { title: 'REVENUE', value: '$48,290', trend: 12.5 },
  { title: 'USERS', value: '3,847', trend: 8.3 },
  { title: 'ORDERS', value: '1,024', trend: -2.1 },
  { title: 'UPTIME', value: '99.97%', trend: 0.1 },
]

// Bar chart data — each object has an X-axis key and numeric value keys.
// xAxisKey="day" tells the chart which field labels the X axis.
// series=[{ dataKey: 'revenue', name: 'Revenue' }] tells it which field(s) to plot as bars.
const revenueByDay = [
  { day: 'Mon', revenue: 6200, costs: 2100 },
  { day: 'Tue', revenue: 7800, costs: 2400 },
  { day: 'Wed', revenue: 5400, costs: 1900 },
  { day: 'Thu', revenue: 8200, costs: 2800 },
  { day: 'Fri', revenue: 9100, costs: 3100 },
  { day: 'Sat', revenue: 4300, costs: 1500 },
  { day: 'Sun', revenue: 3800, costs: 1200 },
]

// Line chart data — uses the same xAxisKey/series pattern.
// Multiple series overlay lines on the same chart.
const trafficTrend = [
  { date: 'Jan', pageViews: 12400, uniqueVisitors: 4200 },
  { date: 'Feb', pageViews: 15800, uniqueVisitors: 5100 },
  { date: 'Mar', pageViews: 14200, uniqueVisitors: 4800 },
  { date: 'Apr', pageViews: 18900, uniqueVisitors: 6300 },
  { date: 'May', pageViews: 22100, uniqueVisitors: 7600 },
  { date: 'Jun', pageViews: 19800, uniqueVisitors: 6900 },
]

// Table data
const recentUsers = [
  { name: 'Jason Poindexter', email: 'jason@example.com', role: 'Admin', status: 'Active', joined: '2025-01-15' },
  { name: 'Sarah Chen', email: 'sarah@example.com', role: 'Editor', status: 'Active', joined: '2025-02-03' },
  { name: 'Mike Torres', email: 'mike@example.com', role: 'Viewer', status: 'Invited', joined: '2025-02-20' },
  { name: 'Lisa Park', email: 'lisa@example.com', role: 'Editor', status: 'Active', joined: '2025-02-18' },
]

const columns = [
  { key: 'name', label: 'NAME', sortable: true },
  { key: 'email', label: 'EMAIL', sortable: true },
  { key: 'role', label: 'ROLE' },
  { key: 'status', label: 'STATUS' },
  { key: 'joined', label: 'JOINED', sortable: true },
]

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className={cn('text-xl font-bold uppercase', mode.font)}>OVERVIEW</h1>
        <p className="text-sm text-muted-foreground">Your dashboard at a glance.</p>
      </div>

      {/* KPI row — responsive: 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <KPICard key={s.title} title={s.title} value={s.value} trend={s.trend} />
        ))}
      </div>

      {/* Charts row — stacks vertically on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BarChart: revenue + costs by day of week */}
        <Card className={cn('p-6 border border-border', mode.radius)}>
          <h3 className={cn('text-xs uppercase text-muted-foreground mb-4', mode.font)}>
            [WEEKLY REVENUE VS COSTS]
          </h3>
          <BarChart
            data={revenueByDay}
            xAxisKey="day"
            series={[
              { dataKey: 'revenue', name: 'Revenue' },
              { dataKey: 'costs', name: 'Costs' },
            ]}
            showLegend
            yAxisFormatter={(value) => \`$\${(value / 1000).toFixed(0)}k\`}
            tooltipFormatter={(value) => \`$\${value.toLocaleString()}\`}
          />
        </Card>

        {/* LineChart: traffic trend with two series */}
        <Card className={cn('p-6 border border-border', mode.radius)}>
          <h3 className={cn('text-xs uppercase text-muted-foreground mb-4', mode.font)}>
            [TRAFFIC TREND]
          </h3>
          <LineChart
            data={trafficTrend}
            xAxisKey="date"
            series={[
              { dataKey: 'pageViews', name: 'Page Views' },
              { dataKey: 'uniqueVisitors', name: 'Unique Visitors', dashed: true },
            ]}
            showLegend
            yAxisFormatter={(value) => \`\${(value / 1000).toFixed(0)}k\`}
          />
        </Card>
      </div>

      {/* Data table — Card gets mode.radius because it has a full border */}
      <Card className={cn('border border-border', mode.radius)}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className={cn('text-xs uppercase text-muted-foreground', mode.font)}>
            [RECENT USERS]
          </h3>
          <Badge variant="secondary">[{recentUsers.length} TOTAL]</Badge>
        </div>
        <DataTable columns={columns} data={recentUsers} />
      </Card>
    </div>
  )
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          4. CHART VARIATIONS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Both chart components support extensive customization. Here are common patterns
          you will use in production dashboards.
        </p>
        <CodeBlock title="chart variations">{`// Stacked bar chart — group bars by a shared stackId
<BarChart
  data={revenueByDay}
  xAxisKey="day"
  series={[
    { dataKey: 'revenue', name: 'Revenue', stackId: 'money' },
    { dataKey: 'costs', name: 'Costs', stackId: 'money' },
  ]}
  showLegend
/>

// Horizontal bar chart — useful for ranking/leaderboard views
<BarChart
  data={topPages}
  xAxisKey="page"
  series={[{ dataKey: 'views', name: 'Views' }]}
  horizontal
  height={400}
/>

// Color each bar differently by index (no series colors needed)
<BarChart
  data={categoryBreakdown}
  xAxisKey="category"
  series={[{ dataKey: 'value', name: 'Value' }]}
  colorByIndex
/>

// Line chart with stepped interpolation (good for pricing tiers, discrete values)
<LineChart
  data={pricingHistory}
  xAxisKey="month"
  series={[
    { dataKey: 'price', name: 'Price', type: 'step', showDots: true, dotSize: 6 },
  ]}
  yAxisFormatter={(v) => \`$\${v}\`}
/>

// Card-wrapped chart using the built-in BarChartCard/LineChartCard
// These add a terminal-style header with code prefix and title
import { BarChartCard, LineChartCard } from '@fabrk/components'

<BarChartCard
  title="Revenue"
  code="0xA1"
  data={revenueByDay}
  xAxisKey="day"
  series={[{ dataKey: 'revenue', name: 'Revenue' }]}
/>

<LineChartCard
  title="Traffic"
  code="0xB2"
  description="Last 6 months"
  data={trafficTrend}
  xAxisKey="date"
  series={[{ dataKey: 'pageViews', name: 'Page Views' }]}
/>`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          5. ADD FEATURE FLAGS AND NOTIFICATIONS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Feature flags let you ship dark features and gradually roll them out. The notification
          center gives users real-time updates without leaving the dashboard.
        </p>
        <CodeBlock title="feature flags + notifications">{`import { useFeatureFlag, useNotifications } from '@fabrk/core'
import { NotificationCenter } from '@fabrk/components'

function DashboardPage() {
  const { enabled: showAnalytics } = useFeatureFlag('advanced-analytics')
  const { manager, notifications } = useNotifications()

  return (
    <div className="p-6 space-y-6">
      {/* Header with notification center */}
      <div className="flex items-center justify-between">
        <h1 className={cn('text-xl font-bold uppercase', mode.font)}>OVERVIEW</h1>
        <NotificationCenter
          notifications={notifications}
          onMarkRead={(id) => manager.markRead(id, userId)}
          onMarkAllRead={() => manager.markAllRead()}
        />
      </div>

      <KPICards />
      <Charts />

      {/* Only render when feature flag is enabled */}
      {showAnalytics && <AdvancedAnalytics />}

      <RecentUsers />
    </div>
  )
}`}</CodeBlock>

        <InfoCard title="DESIGN SYSTEM RULES SUMMARY">
          <ul className="space-y-1 mt-1">
            <li>Full borders (<code>border</code>, <code>border-2</code>) ALWAYS get <code>mode.radius</code></li>
            <li>Partial borders (<code>border-t</code>, <code>border-b</code>, <code>border-l</code>, <code>border-r</code>) NEVER get <code>mode.radius</code></li>
            <li>Table cells (<code>th</code>, <code>td</code>) NEVER get <code>mode.radius</code></li>
            <li>Use design tokens (<code>bg-card</code>, <code>text-foreground</code>, <code>border-border</code>) not hardcoded colors</li>
            <li>Headlines and labels are UPPERCASE, body text is sentence case</li>
            <li>Buttons use <code>{'>'}</code> prefix: <code>{'>'} SUBMIT</code></li>
          </ul>
        </InfoCard>
      </Section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* AUTHENTICATION GUIDE                                            */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <Section id="auth" title="AUTHENTICATION SETUP">
        <p className="text-sm text-muted-foreground mb-4">
          FABRK auth provides three layers: session-based auth (NextAuth), API key auth
          (SHA-256 hashed), and MFA (TOTP RFC 6238 with backup codes). This guide covers all
          three, including the middleware chain that protects your routes, and explains the
          security decisions behind each layer.
        </p>

        <InfoCard title="ARCHITECTURE DECISIONS">
          <strong>Why SHA-256 for API keys?</strong> API keys are hashed before storage using
          Web Crypto SHA-256. The raw key is returned exactly once at creation time. If your
          database is compromised, attackers cannot recover working keys from the hashes. We use
          Web Crypto (not Node.js <code>crypto</code>) for edge runtime compatibility.
          <br /><br />
          <strong>Why the adapter pattern?</strong> All auth operations go through the{' '}
          <code>AuthAdapter</code> interface. You can swap NextAuth for Clerk, Auth0, or any
          custom provider by implementing the same interface. Your route handlers never change.
          <br /><br />
          <strong>Why callback props on MFA components?</strong> Components like{' '}
          <code>MfaSetupDialog</code> accept callbacks (<code>onSetup</code>) instead of making
          API calls directly. This keeps the component package free of server dependencies
          and lets you control exactly how secrets are stored.
        </InfoCard>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          1. CONFIGURE AUTH
        </h3>
        <CodeBlock title="fabrk.config.ts">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  auth: {
    adapter: 'nextauth',
    apiKeys: true,              // Enable API key auth
    mfa: true,                  // Enable TOTP MFA
    config: {
      providers: ['google', 'credentials'],
    },
  },

  // Rate limiting protects login endpoints from brute-force attacks
  security: {
    rateLimit: true,
  },
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. PROTECT ROUTES WITH MIDDLEWARE
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          FABRK provides three middleware wrappers: <code>withAuth</code> (session only),{' '}
          <code>withApiKey</code> (API key only), and <code>withAuthOrApiKey</code> (either).
          Each wraps your route handler and returns 401/403 automatically if auth fails.
          The API key middleware also supports scope checking.
        </p>
        <CodeBlock title="src/app/api/dashboard/stats/route.ts">{`import { withAuth, withApiKey, withAuthOrApiKey } from '@fabrk/auth'
import { createNextAuthAdapter } from '@fabrk/auth'

const auth = createNextAuthAdapter({ /* your NextAuth config */ })

// Session-only: only browser users with active sessions
export const GET = withAuth(auth, async (req, session) => {
  // session has: { userId, email, role }
  const stats = await db.stats.findFirst({
    where: { teamId: session.userId },
  })
  return Response.json(stats)
})

// API key only: for external integrations and CLI tools
// Requires 'read:stats' scope — returns 403 if the key lacks it
export const POST = withApiKey(auth, async (req, keyInfo) => {
  // keyInfo has: { id, name, scopes, userId, active, expiresAt }
  const body = await req.json()
  return Response.json({ received: body })
}, { requiredScopes: ['read:stats'] })

// Either session OR API key: flexible endpoints used by both web and API
export const PUT = withAuthOrApiKey(auth, async (req, { session, apiKey }) => {
  // Exactly one of session or apiKey will be defined
  const userId = session?.userId ?? apiKey?.userId
  if (!userId) {
    return new Response(JSON.stringify({ error: 'No user context' }), { status: 401 })
  }

  // For session auth, check role manually (scopes only apply to API keys)
  if (session && session.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin required' }), { status: 403 })
  }

  return Response.json({ ok: true })
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. GENERATE AND VALIDATE API KEYS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          API keys use the format <code>fabrk_live_xxxx</code> (or <code>fabrk_test_xxxx</code>).
          The random part uses base62 encoding with rejection sampling to eliminate modulo bias.
          Keys are at least 16 bytes of entropy. The hash prefix (<code>sha256:</code>) is stored
          alongside the hex digest for future algorithm upgrades.
        </p>
        <CodeBlock title="src/app/api/keys/route.ts">{`import { generateApiKey, hashApiKey, createApiKeyValidator } from '@fabrk/auth'
import { withAuth } from '@fabrk/auth'

const auth = createNextAuthAdapter({ /* config */ })

// POST /api/keys — Create a new API key (session-authenticated users only)
export const POST = withAuth(auth, async (req, session) => {
  const { name, scopes = ['*'] } = await req.json()

  // Generate a secure key — returns { key, prefix, hash }
  // key:    "fabrk_live_a1b2c3d4e5f6..." (shown to user ONCE)
  // prefix: "fabrk_live_a1b2c3"          (stored for display in settings)
  // hash:   "sha256:abcdef..."            (stored for validation)
  const { key, prefix, hash } = await generateApiKey({
    prefix: 'fabrk',
    environment: 'live',
    keyLength: 32,  // 32 bytes of entropy (default)
  })

  // Store the hash (NEVER the raw key) and metadata
  await db.apiKey.create({
    data: {
      hash,
      prefix,
      userId: session.userId,
      name,
      scopes,
      active: true,
      // Optional: set expiration for time-limited keys
      // expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  })

  // Return the raw key exactly once. After this, it cannot be recovered.
  return Response.json({
    key,
    prefix,
    name,
    message: 'Save this key now. It will not be shown again.',
  })
})

// DELETE /api/keys/[id] — Revoke an API key
export const DELETE = withAuth(auth, async (req, session) => {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing key ID' }), { status: 400 })
  }

  // Ensure the user owns this key
  const key = await db.apiKey.findFirst({
    where: { id, userId: session.userId },
  })

  if (!key) {
    return new Response(JSON.stringify({ error: 'Key not found' }), { status: 404 })
  }

  await db.apiKey.update({
    where: { id },
    data: { active: false },
  })

  return Response.json({ revoked: true })
})`}</CodeBlock>

        <InfoCard title="PRODUCTION WARNING: EXPIRED KEY HANDLING">
          When querying API keys by hash, always filter for expiration in the database query:
          <code className="block mt-2 text-xs">
            {`WHERE hash = ? AND active = true AND (expires_at IS NULL OR expires_at > NOW())`}
          </code>
          Checking <code>active: true</code> alone does not exclude expired keys. The FABRK
          validator handles this correctly, but if you write custom queries, include the
          expiration check.
        </InfoCard>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          4. ADD RATE LIMITING TO AUTH ENDPOINTS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Login and API key endpoints are prime targets for brute-force attacks. Apply rate
          limiting before authentication, not after.
        </p>
        <CodeBlock title="src/app/api/auth/login/route.ts">{`import { createMemoryRateLimiter } from '@fabrk/security'

// In production, use UpstashRateLimiter for distributed rate limiting
// across multiple server instances. Memory rate limiter only works for
// single-server deployments.
const rateLimit = createMemoryRateLimiter({
  defaultMax: 5,              // 5 attempts
  defaultWindowSeconds: 300,  // per 5-minute window
})

export async function POST(req: Request) {
  // Rate limit by IP address
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const result = await rateLimit.check({
    identifier: ip,
    limit: 'login',
    max: 5,
    windowSeconds: 300,
  })

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many login attempts. Try again later.',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
        },
      }
    )
  }

  // Proceed with authentication...
  const { email, password } = await req.json()
  const user = await authenticateUser(email, password)

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Invalid credentials' }),
      { status: 401 }
    )
  }

  // Reset rate limit on successful login
  await rateLimit.reset(ip, 'login')

  return Response.json({ session: user.sessionToken })
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          5. ENABLE MFA (TOTP + BACKUP CODES)
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          MFA uses TOTP (RFC 6238) with a 30-second window and 6-digit codes. The{' '}
          <code>MfaSetupDialog</code> component accepts a <code>renderQrCode</code> render prop
          so you can use any QR library (it is not bundled to keep the package small). Backup
          codes are hex-encoded from cryptographically random bytes.
        </p>
        <CodeBlock title="src/app/settings/mfa.tsx">{`'use client'

import { useState } from 'react'
import { MfaSetupDialog, BackupCodesModal, MfaCard } from '@fabrk/components'

// QR code library is optional — pass it via render prop
import QRCode from 'qrcode.react'

export default function MFASettings({ user }: { user: { mfaEnabled: boolean } }) {
  const [mfaEnabled, setMfaEnabled] = useState(user.mfaEnabled)
  const [showSetup, setShowSetup] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  return (
    <div className="space-y-4">
      {/* Status card — shows current MFA state with enable/disable toggle */}
      <MfaCard
        enabled={mfaEnabled}
        onEnable={() => setShowSetup(true)}
        onDisable={async () => {
          const res = await fetch('/api/mfa/disable', { method: 'POST' })
          if (res.ok) setMfaEnabled(false)
        }}
      />

      {/* Setup dialog — walks the user through scanning a QR code */}
      <MfaSetupDialog
        open={showSetup}
        onOpenChange={setShowSetup}
        onSetup={async (secret) => {
          // POST the TOTP secret to your backend for storage
          const res = await fetch('/api/mfa/enable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret }),
          })
          if (!res.ok) throw new Error('Failed to enable MFA')

          const { codes } = await res.json()
          setBackupCodes(codes)
          setMfaEnabled(true)
        }}
        renderQrCode={(uri) => (
          <QRCode value={uri} size={200} level="M" />
        )}
      />

      {/* Backup codes modal — shown once after MFA setup */}
      {backupCodes.length > 0 && (
        <BackupCodesModal
          codes={backupCodes}
          onRegenerate={async () => {
            const res = await fetch('/api/mfa/regenerate-backup-codes', { method: 'POST' })
            const { codes } = await res.json()
            setBackupCodes(codes)
          }}
        />
      )}
    </div>
  )
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          6. MFA VERIFICATION IN API ROUTES
        </h3>
        <CodeBlock title="src/app/api/mfa/verify/route.ts">{`import { verifyTOTP } from '@fabrk/auth'

export async function POST(req: Request) {
  const { code, userId } = await req.json()

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  })

  if (!user?.mfaEnabled || !user.mfaSecret) {
    return new Response(
      JSON.stringify({ error: 'MFA not enabled' }),
      { status: 400 }
    )
  }

  // verifyTOTP checks the current and adjacent time windows
  // to handle clock drift (standard RFC 6238 tolerance)
  const valid = verifyTOTP(code, user.mfaSecret)

  if (!valid) {
    return new Response(
      JSON.stringify({ error: 'Invalid verification code' }),
      { status: 401 }
    )
  }

  // Mark session as MFA-verified
  await db.session.update({
    where: { userId },
    data: { mfaVerified: true, mfaVerifiedAt: new Date() },
  })

  return Response.json({ verified: true })
}`}</CodeBlock>

        <InfoCard title="PRODUCTION CHECKLIST: AUTH">
          <ul className="space-y-1 mt-1">
            <li>Generate <code>NEXTAUTH_SECRET</code> with <code>openssl rand -base64 32</code></li>
            <li>Set <code>NEXTAUTH_URL</code> to your production domain (not localhost)</li>
            <li>Use Upstash rate limiter in production (memory limiter is single-server only)</li>
            <li>API key expiration: set a TTL, or require periodic rotation</li>
            <li>Audit log all auth events (login, logout, MFA enable/disable, key creation)</li>
            <li>Use <code>PrismaApiKeyStore</code> in production, not in-memory store</li>
          </ul>
        </InfoCard>
      </Section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* PAYMENTS GUIDE                                                  */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <Section id="payments" title="PAYMENTS INTEGRATION">
        <p className="text-sm text-muted-foreground mb-4">
          Integrate Stripe (or Polar, or Lemon Squeezy) with proper webhook verification,
          subscription lifecycle management, and plan switching. The adapter pattern means your
          route handlers work identically regardless of which payment provider you use.
        </p>

        <InfoCard title="WHY THE ADAPTER PATTERN">
          All payment providers implement the same <code>PaymentAdapter</code> interface from{' '}
          <code>@fabrk/core</code>. This means <code>createCheckout</code>,{' '}
          <code>handleWebhook</code>, <code>getSubscription</code>, and{' '}
          <code>cancelSubscription</code> all have the same signatures. To switch from Stripe to
          Polar, you change one line in your config. Your route handlers, webhook processing,
          and UI code stay exactly the same.
        </InfoCard>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          1. CONFIGURE THE PAYMENT ADAPTER
        </h3>
        <CodeBlock title="src/lib/payments.ts">{`import { createStripeAdapter } from '@fabrk/payments'

// Initialize once and export for use across route handlers.
// The adapter lazy-loads the stripe SDK on first use, so this
// is safe to import in edge functions.
export const payments = createStripeAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  // apiVersion defaults to '2024-12-18.acacia'
})

// To switch providers, change one line:
// import { createPolarAdapter } from '@fabrk/payments'
// export const payments = createPolarAdapter({ ... })
//
// import { createLemonSqueezyAdapter } from '@fabrk/payments'
// export const payments = createLemonSqueezyAdapter({ ... })`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. CREATE A CHECKOUT SESSION
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          The checkout flow creates a Stripe Checkout session and redirects the user to the
          hosted payment page. Pass metadata to associate the payment with your internal records.
        </p>
        <CodeBlock title="src/app/api/checkout/route.ts">{`import { payments } from '@/lib/payments'
import { withAuth } from '@fabrk/auth'

const auth = createNextAuthAdapter({ /* config */ })

export const POST = withAuth(auth, async (req, session) => {
  const { priceId, plan } = await req.json()

  if (!priceId || typeof priceId !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Invalid price ID' }),
      { status: 400 }
    )
  }

  try {
    const checkout = await payments.createCheckout({
      priceId,
      customerId: session.stripeCustomerId,  // undefined for new customers
      customerEmail: session.email,           // fallback for new customers
      subscription: true,                     // create a subscription, not one-time payment
      trialDays: 14,                          // optional free trial
      successUrl: \`\${process.env.NEXTAUTH_URL}/dashboard?upgraded=true\`,
      cancelUrl: \`\${process.env.NEXTAUTH_URL}/pricing\`,
      metadata: {
        userId: session.userId,
        plan,
      },
    })

    // checkout.id   — Stripe session ID (for recovery)
    // checkout.url  — redirect URL for the user
    // checkout.raw  — full Stripe session object (if you need it)
    return Response.json({ url: checkout.url })
  } catch (err) {
    // Do not leak Stripe error details to the client
    console.error('Checkout creation failed:', err)
    return new Response(
      JSON.stringify({ error: 'Unable to create checkout session' }),
      { status: 500 }
    )
  }
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. HANDLE WEBHOOKS SECURELY
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Webhook verification is critical. The FABRK Stripe adapter performs three security
          checks: (1) cryptographic signature verification via <code>stripe.webhooks.constructEvent</code>,
          (2) two-sided timestamp validation that rejects events older than 5 minutes AND events
          with future timestamps (this prevents replay attacks where an attacker sets a
          far-future timestamp to keep the event "valid" forever), and (3) idempotency checking
          to reject duplicate event IDs.
        </p>
        <CodeBlock title="src/app/api/webhooks/stripe/route.ts">{`import { payments } from '@/lib/payments'

// IMPORTANT: Do not apply body parsing middleware to webhook routes.
// You need the raw body string for signature verification.
export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing signature' }),
      { status: 400 }
    )
  }

  // handleWebhook performs all three security checks:
  // 1. Cryptographic signature verification
  // 2. Two-sided timestamp check (rejects > 5min old AND future-dated)
  // 3. Idempotency: rejects duplicate event IDs
  const result = await payments.handleWebhook(body, signature)

  if (!result.verified) {
    console.error('Webhook verification failed:', result.error)
    return new Response(
      JSON.stringify({ error: 'Webhook verification failed' }),
      { status: 400 }
    )
  }

  // Duplicate events are verified but should be skipped
  if (result.duplicate) {
    return Response.json({ received: true, duplicate: true })
  }

  const event = result.event!

  switch (event.type) {
    case 'checkout.session.completed': {
      const data = event.data as Record<string, any>
      await db.subscription.create({
        data: {
          userId: data.metadata?.userId,
          stripeSubscriptionId: data.subscription,
          stripeCustomerId: data.customer,
          plan: data.metadata?.plan ?? 'pro',
          status: 'active',
        },
      })

      // Also update user record with Stripe customer ID
      if (data.metadata?.userId && data.customer) {
        await db.user.update({
          where: { id: data.metadata.userId },
          data: { stripeCustomerId: data.customer },
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const data = event.data as Record<string, any>
      await db.subscription.update({
        where: { stripeSubscriptionId: data.id },
        data: {
          status: data.status,
          cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
          currentPeriodEnd: data.current_period_end
            ? new Date(data.current_period_end * 1000)
            : undefined,
        },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const data = event.data as Record<string, any>
      await db.subscription.update({
        where: { stripeSubscriptionId: data.id },
        data: { status: 'canceled' },
      })
      break
    }

    case 'invoice.payment_failed': {
      const data = event.data as Record<string, any>
      // Notify the user that their payment failed
      await db.subscription.update({
        where: { stripeCustomerId: data.customer },
        data: { status: 'past_due' },
      })
      // Send email notification
      break
    }
  }

  return Response.json({ received: true })
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          4. SUBSCRIPTION MANAGEMENT
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          After checkout, you need to handle plan switching, cancellation, and the billing
          portal. The adapter provides methods for all of these.
        </p>
        <CodeBlock title="src/app/api/subscription/route.ts">{`import { payments } from '@/lib/payments'
import { withAuth } from '@fabrk/auth'

// GET /api/subscription — Get current subscription status
export const GET = withAuth(auth, async (req, session) => {
  const sub = await db.subscription.findFirst({
    where: { userId: session.userId, status: { in: ['active', 'trialing', 'past_due'] } },
  })

  if (!sub) {
    return Response.json({ subscription: null, plan: 'free' })
  }

  // Fetch live status from Stripe (includes current_period_end, cancel_at_period_end)
  const stripeInfo = await payments.getSubscription(sub.stripeSubscriptionId)

  return Response.json({
    subscription: {
      id: sub.id,
      plan: sub.plan,
      status: stripeInfo?.status ?? sub.status,
      currentPeriodEnd: stripeInfo?.currentPeriodEnd,
      cancelAtPeriodEnd: stripeInfo?.cancelAtPeriodEnd ?? false,
    },
  })
})

// POST /api/subscription/cancel — Cancel at end of billing period
export const POST = withAuth(auth, async (req, session) => {
  const sub = await db.subscription.findFirst({
    where: { userId: session.userId, status: 'active' },
  })

  if (!sub) {
    return new Response(
      JSON.stringify({ error: 'No active subscription' }),
      { status: 404 }
    )
  }

  // Cancel at period end — user keeps access until the billing period expires
  await payments.cancelSubscription(sub.stripeSubscriptionId, {
    atPeriodEnd: true,
  })

  await db.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true },
  })

  return Response.json({ canceled: true, effectiveDate: sub.currentPeriodEnd })
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          5. BILLING PORTAL FOR SELF-SERVICE
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Instead of building your own invoice and payment method management UI, redirect
          users to the Stripe Billing Portal. It handles updating payment methods, downloading
          invoices, and changing plans.
        </p>
        <CodeBlock title="src/app/api/billing-portal/route.ts">{`import { payments } from '@/lib/payments'
import { withAuth } from '@fabrk/auth'

export const POST = withAuth(auth, async (req, session) => {
  if (!session.stripeCustomerId) {
    return new Response(
      JSON.stringify({ error: 'No billing account found' }),
      { status: 404 }
    )
  }

  // Creates a one-time-use URL to the Stripe billing portal
  const portalUrl = await payments.createPortalSession(
    session.stripeCustomerId,
    \`\${process.env.NEXTAUTH_URL}/dashboard/settings\`  // return URL
  )

  return Response.json({ url: portalUrl })
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          6. PRICING PAGE UI
        </h3>
        <CodeBlock title="src/app/pricing/page.tsx">{`'use client'

import { useState } from 'react'
import { PricingCard } from '@fabrk/components'

const plans = [
  {
    name: 'FREE',
    price: '$0',
    period: '/month',
    features: ['5 projects', '1GB storage', 'Community support'],
    priceId: null,
  },
  {
    name: 'PRO',
    price: '$29',
    period: '/month',
    features: ['Unlimited projects', '100GB storage', 'Priority support', 'API access'],
    highlighted: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
  {
    name: 'ENTERPRISE',
    price: 'Custom',
    features: ['Everything in Pro', 'SSO/SAML', 'Dedicated support', 'SLA', 'Custom integrations'],
    priceId: null,
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSelect(plan: typeof plans[0]) {
    if (!plan.priceId) {
      // Free plan needs no checkout; Enterprise goes to contact form
      if (plan.name === 'ENTERPRISE') {
        window.location.href = '/contact'
      }
      return
    }

    setLoading(plan.name)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          plan: plan.name.toLowerCase(),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message ?? 'Checkout failed')
      }

      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      console.error('Checkout error:', err)
      // Show error toast to user
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold uppercase text-center mb-2">PRICING</h1>
      <p className="text-sm text-muted-foreground text-center mb-8">
        Start free. Upgrade when you need more.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PricingCard
            key={plan.name}
            title={plan.name}
            price={plan.price}
            period={plan.period}
            features={plan.features}
            highlighted={plan.highlighted}
            onSelect={() => handleSelect(plan)}
          />
        ))}
      </div>
    </div>
  )
}`}</CodeBlock>

        <InfoCard title="PRODUCTION CHECKLIST: PAYMENTS">
          <ul className="space-y-1 mt-1">
            <li>Use <code>mode: &apos;test&apos;</code> during development, <code>&apos;live&apos;</code> in production</li>
            <li>Register your webhook URL in Stripe Dashboard (Settings &gt; Webhooks)</li>
            <li>Handle <code>invoice.payment_failed</code> to notify users of billing issues</li>
            <li>Store Stripe customer IDs on your user records for portal session creation</li>
            <li>Use <code>cancelSubscription(id, {`{ atPeriodEnd: true }`})</code> so users keep access until period ends</li>
            <li>Test webhook signatures locally with <code>stripe listen --forward-to localhost:3000/api/webhooks/stripe</code></li>
            <li>Webhook replay protection: the adapter rejects events older than 5 minutes and future-dated events</li>
          </ul>
        </InfoCard>
      </Section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* AI INTEGRATION GUIDE                                            */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <Section id="ai" title="AI INTEGRATION">
        <p className="text-sm text-muted-foreground mb-4">
          An agent is a loop. It reads your message, decides whether to call a tool,
          runs the tool, and repeats — up to 25 times — before sending a final reply.
          You define the agent in TypeScript, expose it over HTTP, and the browser
          receives tokens as they arrive, like a chat message coming in letter by letter.
        </p>

        <InfoCard title="ARCHITECTURE OVERVIEW">
          The agent system lives inside the <code>fabrk</code> package, in layers:
          <ul className="space-y-1 mt-2">
            <li><strong>defineAgent</strong> — sets the model, tools, system prompt, budget, guardrails, and memory</li>
            <li><strong>runAgentLoop</strong> — the observe → think → act loop, up to 25 iterations</li>
            <li><strong>SSE route handler</strong> — sends the loop output to the browser one event at a time, via <code>/api/agents/:name</code></li>
            <li><strong>useAgent hook</strong> — React hook that sends a message and reads the stream back</li>
            <li><strong>Memory stores</strong> — InMemoryMemoryStore for per-session history, SemanticMemoryStore for vector search</li>
            <li><strong>Guardrails</strong> — functions that inspect or block content before the LLM sees it, and after</li>
            <li><strong>Testing</strong> — MockLLM + createTestAgent let you test agents with no API keys</li>
          </ul>
        </InfoCard>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          1. DEFINE AN AGENT
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Start with <code>defineAgent</code>. Put this file anywhere in your project —
          the route handler imports it directly. List tool names in <code>tools</code>.
          Those tools must be registered in the tool registry before the first request arrives.
        </p>
        <CodeBlock title="src/agents/assistant.ts">{`import { defineAgent } from 'fabrk'
import { defineTool, textResult } from 'fabrk'

// 1. Define a tool
export const searchDocs = defineTool({
  name: 'search_docs',
  description: 'Search the documentation for a query',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
    },
    required: ['query'],
  },
  handler: async ({ query }) => {
    // Your implementation here
    const results = await doSearch(String(query))
    return textResult(results)
  },
})

// 2. Define the agent
export const assistantAgent = defineAgent({
  model: 'claude-sonnet-4-5-20250929',    // any provider model string
  fallback: ['gpt-4o'],                    // optional fallback chain
  systemPrompt: 'You are a helpful documentation assistant. Use search_docs to find accurate answers.',
  tools: ['search_docs'],                  // tool names registered at startup
  stream: true,                            // emit text-delta events
  auth: 'optional',                        // 'required' | 'optional' | 'none'
  budget: {
    daily: 10,          // $10/day for this agent
    perSession: 0.50,   // $0.50 per conversation
    alertThreshold: 0.8,
  },
  memory: true,         // enable InMemoryMemoryStore
  generationOptions: {
    maxTokens: 4096,
    temperature: 0.3,
  },
})`}</CodeBlock>

        <InfoCard title="ALL defineAgent FIELDS">
          <code className="text-xs">model</code> — required LLM model string.{' '}
          <code className="text-xs">fallback</code> — ordered list of backup models.{' '}
          <code className="text-xs">systemPrompt</code> — prepended to every request as a system message.{' '}
          <code className="text-xs">tools</code> — tool names from the registry.{' '}
          <code className="text-xs">stream</code> — default <code>true</code>, set <code>false</code> for batch response.{' '}
          <code className="text-xs">auth</code> — default <code>&apos;none&apos;</code>.{' '}
          <code className="text-xs">budget</code> — daily/perSession/perUser/perTenant caps in USD.{' '}
          <code className="text-xs">memory</code> — <code>true</code> or an <code>AgentMemoryConfig</code> object.{' '}
          <code className="text-xs">inputGuardrails</code> / <code className="text-xs">outputGuardrails</code> — validation pipelines.{' '}
          <code className="text-xs">handoffs</code> — agent names this agent can hand off to.{' '}
          <code className="text-xs">outputSchema</code> — JSON Schema for structured output.
        </InfoCard>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. WIRE THE SSE ROUTE
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Create a route file and pass your agent definition to <code>handleAgentRequest</code>.
          It validates the incoming messages, runs the agent loop, and sends each event back to
          the browser over a persistent HTTP connection. In a FABRK project, this file lives at{' '}
          <code>app/api/assistant/route.ts</code>.
        </p>
        <CodeBlock title="app/api/assistant/route.ts">{`import { handleAgentRequest } from 'fabrk'
import { assistantAgent, searchDocs } from '@/agents/assistant'

// Register tools once at module load
import { registerTool } from 'fabrk'
registerTool(searchDocs)

export async function POST(req: Request) {
  return handleAgentRequest(req, 'assistant', assistantAgent)
}

// handleAgentRequest does the following:
// 1. Parses { messages } from the request body
// 2. Validates message count (max 200) and content length (max 100K chars/message)
// 3. Resolves registered tools for this agent
// 4. Runs the agent loop as an async generator
// 5. Streams each AgentLoopEvent as SSE: data: {...}\\n\\n
// 6. Adds all required security headers to the response`}</CodeBlock>

        <InfoCard title="SSE EVENT TYPES">
          Your browser receives these events, in this order:{' '}
          <code className="text-xs">text-delta</code> — one chunk of text as the model writes it.{' '}
          <code className="text-xs">tool-call</code> — the tool name and input, before the tool runs.{' '}
          <code className="text-xs">tool-result</code> — the tool output and how long it took.{' '}
          <code className="text-xs">usage</code> — token counts and dollar cost for this turn.{' '}
          <code className="text-xs">done</code> — end of turn, with optional structured output.
          If something goes wrong: <code className="text-xs">error</code> with a message string.
        </InfoCard>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. CONNECT THE FRONTEND WITH useAgent
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          <code>useAgent</code> handles the connection for you. Call <code>send()</code> with a message.
          The hook opens a stream, appends tokens to <code>messages</code> as they arrive, and tracks
          tool calls in real time. Pass the agent name — it must match the route segment.
        </p>
        <CodeBlock title="app/chat/page.tsx">{`'use client'

import { useAgent } from 'fabrk/client'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export default function ChatPage() {
  const {
    send,          // (content: string | AgentContentPart[]) => Promise<void>
    stop,          // () => void — aborts in-progress stream
    messages,      // AgentMessage[] — grows with each user+assistant turn
    isStreaming,   // boolean
    cost,          // number — cumulative USD cost this session
    usage,         // { promptTokens: number, completionTokens: number }
    error,         // string | null
    toolCalls,     // AgentToolCall[] — calls with optional output+durationMs
  } = useAgent('assistant')  // matches the route at /api/agents/assistant

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      <div className="border-b border-border p-3 flex items-center justify-between">
        <span className={cn('text-xs font-bold', mode.font)}>[ASSISTANT]</span>
        <span className="text-xs text-muted-foreground">
          \${cost.toFixed(4)} · {usage.promptTokens + usage.completionTokens} tokens
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            'text-sm p-3 border',
            mode.radius,
            msg.role === 'user'
              ? 'border-primary text-foreground ml-8'
              : 'border-border bg-card text-foreground mr-8'
          )}>
            <div className="text-xs text-muted-foreground mb-1 uppercase">
              [{msg.role}]
            </div>
            {typeof msg.content === 'string'
              ? msg.content
              : msg.content.map((p, j) =>
                  p.type === 'text' ? <span key={j}>{p.text}</span> : null
                )}
          </div>
        ))}

        {isStreaming && (
          <div className="text-xs text-muted-foreground animate-pulse">[THINKING...]</div>
        )}

        {toolCalls.map((tc, i) => (
          <div key={i} className="text-xs border border-border p-2 font-mono">
            <span className="text-primary">[TOOL] {tc.name}</span>
            {tc.output && (
              <span className="text-muted-foreground"> → {tc.durationMs}ms</span>
            )}
          </div>
        ))}

        {error && (
          <div className="text-xs text-destructive border border-destructive p-2">
            [ERROR] {error}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <input
          className={cn('flex-1 bg-background border border-border text-sm px-3 py-2', mode.radius)}
          placeholder="Ask anything..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isStreaming) {
              send(e.currentTarget.value)
              e.currentTarget.value = ''
            }
          }}
          disabled={isStreaming}
        />
        {isStreaming
          ? <button onClick={stop} className={cn('text-xs border border-border px-3 py-2', mode.radius)}>{'> STOP'}</button>
          : null
        }
      </div>
    </div>
  )
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          4. ADDING MEMORY
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          By default your agent forgets everything between requests. Add memory so it
          can refer back to earlier messages. <code>InMemoryMemoryStore</code> keeps
          per-thread history — up to 1,000 threads, 500 messages each. When you need
          to search across past conversations, <code>SemanticMemoryStore</code> wraps
          any base store and adds vector similarity search.
        </p>
        <CodeBlock title="per-session memory">{`// memory: true on defineAgent enables InMemoryMemoryStore automatically.
// For explicit control, pass an AgentMemoryConfig:

import { defineAgent } from 'fabrk'

export const agent = defineAgent({
  model: 'claude-sonnet-4-5-20250929',
  tools: [],
  memory: {
    maxMessages: 50,           // keep last 50 messages per thread
    compression: {             // auto-compress when thread grows large
      enabled: true,
      triggerAt: 40,           // compress when thread hits 40 messages
      keepRecent: 10,          // always preserve the last 10 messages
      summarize: async (messages) => {
        // Your LLM call to summarize old messages into a single string
        return summarizeWithLLM(messages)
      },
    },
  },
})`}</CodeBlock>

        <CodeBlock title="semantic memory — cross-session search">{`import { SemanticMemoryStore, InMemoryMemoryStore } from 'fabrk'
import { OpenAIEmbeddingProvider } from '@fabrk/ai'

// Build a SemanticMemoryStore on top of any base store
const baseStore = new InMemoryMemoryStore()
const embeddingProvider = new OpenAIEmbeddingProvider({
  model: 'text-embedding-3-small',
})
const memoryStore = new SemanticMemoryStore(baseStore, {
  embeddingProvider,
  topK: 5,         // return up to 5 similar messages
  threshold: 0.7,  // cosine similarity threshold
})

// Search across all threads:
const results = await memoryStore.search('user preference for dark mode', {
  agentName: 'assistant',   // optional: scope to one agent
  limit: 5,
  // Expand each match with surrounding context:
  messageRange: { before: 2, after: 2 },
})

// Inject results into the system prompt:
const contextBlock = results
  .map((m) => \`[\${m.role}] \${m.content}\`)
  .join('\\n')

// Pass to agent via systemPrompt or as an extra user message`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          5. GUARDRAILS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          A guardrail is a function that inspects content and decides whether to let it through.
          Write one with the signature{' '}
          <code>(content: string, ctx) =&gt; GuardrailResult</code>. Your guardrails run on every
          input before the LLM sees it, and on every output before the client sees it.
          Use <code>AsyncGuardrail</code> when you need to call an external moderation API.
        </p>
        <CodeBlock title="production guardrail setup">{`import {
  defineAgent,
  maxLength,
  denyList,
  piiRedactor,
  requireJsonSchema,
} from 'fabrk'
import type { Guardrail, AsyncGuardrail } from 'fabrk'

// Custom guardrail — block requests asking for competitor info
const noCompetitorMentions: Guardrail = (content, ctx) => {
  const competitors = ['acme-corp', 'rival-saas']
  const lower = content.toLowerCase()
  for (const c of competitors) {
    if (lower.includes(c)) {
      return { pass: false, reason: \`Competitor mention blocked: \${c}\` }
    }
  }
  return { pass: true }
}

// Async guardrail — call an external moderation API
const moderationCheck: AsyncGuardrail = async (content, ctx) => {
  const result = await callModerationAPI(content)
  if (result.flagged) {
    return { pass: false, reason: \`Moderation: \${result.categories.join(', ')}\` }
  }
  return { pass: true }
}

export const agent = defineAgent({
  model: 'claude-sonnet-4-5-20250929',
  tools: [],
  inputGuardrails: [
    maxLength(10_000),          // block inputs over 10K chars
    denyList([/\\bpassword\\b/i, /\\bsecret\\b/i]), // block forbidden patterns
    piiRedactor(),              // redact emails, phone numbers, SSNs in place
    noCompetitorMentions,       // custom sync guardrail
  ],
  outputGuardrails: [
    maxLength(50_000),          // cap output size
    // async guardrails attach the same way — the loop awaits them
  ],
})`}</CodeBlock>

        <InfoCard title="GUARDRAIL BEHAVIOR">
          Guardrails run in array order. Return{' '}
          <code>{`{ pass: false }`}</code> with no <code>replacement</code> and the loop
          stops immediately with an <code>error</code> event. Return a{' '}
          <code>replacement</code> string and the next guardrail runs on that string instead.{' '}
          <code>piiRedactor()</code> works this way — it rewrites content in place and lets
          the request continue.
        </InfoCard>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          6. TESTING AN AGENT
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          You don&apos;t need an API key to test an agent. <code>MockLLM</code> intercepts LLM calls
          and returns whatever you configure, matched by message pattern.{' '}
          <code>createTestAgent</code> runs a real agent loop around the mock — your tool handlers,
          guardrails, and stop conditions all execute exactly as they would in production.
        </p>
        <CodeBlock title="agent.test.ts">{`import { describe, it, expect } from 'vitest'
import { mockLLM, createTestAgent, defineTool, textResult } from 'fabrk'

const weatherTool = defineTool({
  name: 'get_weather',
  description: 'Get current weather for a city',
  schema: {
    type: 'object',
    properties: { city: { type: 'string' } },
    required: ['city'],
  },
  handler: async ({ city }) => textResult(\`Weather in \${city}: 72°F, sunny\`),
})

describe('assistant agent', () => {
  it('calls get_weather when asked about weather', async () => {
    const mock = mockLLM()
      // When the user message contains "weather", call the tool
      .onMessage(/weather/)
      .callTool('get_weather', { city: 'San Francisco' })
      // After tool result, respond with a final text message
      .setDefault('The weather in San Francisco is 72°F and sunny.')

    const agent = createTestAgent({
      tools: [weatherTool],
      mock,
      stream: false,
    })

    const result = await agent.send('What is the weather in San Francisco?')

    // Assert the tool was called with the right input
    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0].name).toBe('get_weather')
    expect(result.toolCalls[0].input).toEqual({ city: 'San Francisco' })

    // Assert the final text response
    expect(result.content).toContain('72°F')

    // Assert total LLM call count (1 for tool decision + 1 for final answer)
    expect(mock.callCount).toBe(2)
  })

  it('returns error event when input guardrail blocks content', async () => {
    const mock = mockLLM().setDefault('ok')
    const agent = createTestAgent({ tools: [], mock })

    // The denyList guardrail blocks "password" — assert the error event is emitted
    const result = await agent.send('Tell me the password')
    const errorEvent = result.events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
  })
})`}</CodeBlock>

        <InfoCard title="PRODUCTION CHECKLIST: AGENTS">
          <ul className="space-y-1 mt-1">
            <li>Set <code>budget.daily</code> and <code>budget.perSession</code> — without these, a runaway agent has no spending limit</li>
            <li>Add a <code>maxLength()</code> input guardrail — oversized inputs are one of the most common prompt injection vectors</li>
            <li>Use <code>auth: &apos;required&apos;</code> on any agent that touches user data</li>
            <li>Validate tool <code>input</code> inside your handler — the JSON schema check covers required fields and types, not your business rules</li>
            <li>The loop hard-caps at 25 iterations; set <code>maxIterations</code> lower for simple agents that shouldn&apos;t need many steps</li>
            <li>Tool output truncates at 50,000 chars before going back to the LLM — keep responses concise</li>
          </ul>
        </InfoCard>
      </Section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* DEPLOYMENT GUIDE                                                */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <Section id="deployment" title="DEPLOYMENT">
        <p className="text-sm text-muted-foreground mb-4">
          Deploy your FABRK app to production with proper security, monitoring, and
          environment management. This guide covers Vercel deployment, staging vs production
          config, health check endpoints, CI/CD pipelines, and a comprehensive security
          checklist.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          1. ENVIRONMENT VARIABLE MANAGEMENT
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Keep three separate environment files. Never commit <code>.env.production</code>{' '}
          to git. Use your deployment platform's secret manager for production secrets.
        </p>
        <CodeBlock title=".env.local (development)">{`# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-do-not-use-in-production

# Payments (Stripe test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...

# AI
ANTHROPIC_API_KEY=sk-ant-...
AI_DAILY_BUDGET=10

# Email (console adapter in dev — prints to terminal)
RESEND_API_KEY=

# Database
DATABASE_URL=postgresql://localhost:5432/myapp_dev`}</CodeBlock>

        <CodeBlock title=".env.staging">{`# Auth
NEXTAUTH_URL=https://staging.myapp.com
NEXTAUTH_SECRET=  # Set via deployment platform secrets

# Payments (Stripe test mode — still test keys in staging)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI (lower budget for staging)
AI_DAILY_BUDGET=5

# Database (separate staging database)
DATABASE_URL=postgresql://...staging-db-url...`}</CodeBlock>

        <InfoCard title="SECRETS MANAGEMENT">
          Never store production secrets in files. Use your platform's secrets manager:
          <ul className="space-y-1 mt-2">
            <li>Vercel: <code>vercel env add VARIABLE_NAME</code> or Project Settings &gt; Environment Variables</li>
            <li>Railway: Variables tab in project dashboard</li>
            <li>AWS: Secrets Manager or Parameter Store</li>
          </ul>
          For <code>NEXTAUTH_SECRET</code>, generate a strong random value:{' '}
          <code>openssl rand -base64 32</code>
        </InfoCard>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. DEPLOY TO VERCEL
        </h3>
        <CodeBlock title="terminal">{`# Install Vercel CLI
npm i -g vercel

# Link project and deploy
vercel

# Set production environment variables
vercel env add NEXTAUTH_SECRET --environment production
vercel env add NEXTAUTH_URL --environment production
vercel env add DATABASE_URL --environment production
vercel env add STRIPE_SECRET_KEY --environment production
vercel env add STRIPE_WEBHOOK_SECRET --environment production
vercel env add ANTHROPIC_API_KEY --environment production
vercel env add AI_DAILY_BUDGET --environment production
vercel env add RESEND_API_KEY --environment production

# Deploy to production
vercel --prod`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. DATABASE SETUP
        </h3>
        <CodeBlock title="database deployment">{`# Run Prisma migrations on your production database
pnpm dlx prisma migrate deploy

# For serverless environments (Vercel, AWS Lambda), use connection pooling.
# Without pooling, each invocation opens a new connection and you'll hit
# the database connection limit quickly.
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1"

# If using Neon, Supabase, or PlanetScale, connection pooling is built-in.
# Just use the pooled connection string from their dashboard.

# Recommended providers:
#   Neon       — Serverless PostgreSQL, free tier, auto-scaling
#   Supabase   — PostgreSQL + realtime + auth + storage
#   PlanetScale — MySQL with branching (useful for staging)`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          4. HEALTH CHECK ENDPOINT
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Add a health check endpoint that your monitoring service can ping. Check database
          connectivity and any critical external services.
        </p>
        <CodeBlock title="src/app/api/health/route.ts">{`export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}
  let healthy = true

  // Check database connectivity
  try {
    await db.$queryRaw\`SELECT 1\`
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
    healthy = false
  }

  // Check Stripe configuration
  try {
    checks.payments = payments.isConfigured() ? 'ok' : 'error'
  } catch {
    checks.payments = 'error'
    healthy = false
  }

  return Response.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown',
    },
    { status: healthy ? 200 : 503 }
  )
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          5. PRODUCTION CONFIG
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          The key differences between development and production config. In development, FABRK
          uses in-memory stores, console email adapter, and test mode payments. In production,
          switch to persistent stores, real email delivery, and live payments.
        </p>
        <CodeBlock title="fabrk.config.ts — production overrides">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  // Switch payments to live mode
  payments: {
    adapter: 'stripe',
    mode: 'live',
    config: {
      secretKey: process.env.STRIPE_SECRET_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    },
  },

  // Use real email delivery (not console adapter)
  email: {
    adapter: 'resend',
    from: 'notifications@yourdomain.com',
  },

  // Enable all security features
  security: {
    csrf: true,
    csp: true,
    rateLimit: true,
    auditLog: true,
    headers: true,       // Adds HSTS, X-Content-Type-Options, etc.
    cors: {
      origins: ['https://yourdomain.com'],
    },
  },

  // Auth with real providers
  auth: {
    adapter: 'nextauth',
    apiKeys: true,
    mfa: true,
  },

  // AI with production budget
  ai: {
    costTracking: true,
    budget: {
      daily: Number(process.env.AI_DAILY_BUDGET ?? 50),
      monthly: 1000,
    },
  },
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          6. CI/CD PIPELINE
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          A GitHub Actions pipeline that runs type checking, tests, linting, and bundle size
          tracking on every pull request, then auto-deploys on merge to main.
        </p>
        <CodeBlock title=".github/workflows/ci.yml">{`name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build

  bundle-size:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm size  # Fails if any package exceeds its size limit

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm audit || true  # Surface vulnerabilities without blocking`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          7. SECURITY HEADERS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          <code>@fabrk/framework</code> automatically adds security headers via <code>buildSecurityHeaders()</code>
          on all SSR responses. You can also configure them in your <code>fabrk.config.ts</code>.
        </p>
        <CodeBlock title="fabrk.config.ts — security headers">{`// Enable security headers in your config
security: {
  headers: true,   // Adds all 6 security headers automatically
  csrf: true,
  csp: true,
}

// Headers applied to all responses:
//   X-Content-Type-Options: nosniff
//   X-Frame-Options: DENY
//   X-XSS-Protection: 1; mode=block
//   Referrer-Policy: strict-origin-when-cross-origin
//   Permissions-Policy: camera=(), microphone=(), geolocation=()
//   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          8. MONITORING AND OBSERVABILITY
        </h3>
        <CodeBlock title="monitoring setup">{`// Use your health check endpoint with an uptime monitor:
// - UptimeRobot (free tier): ping /api/health every 5 minutes
// - Better Uptime: monitors + incident pages
// - Checkly: synthetic monitoring with Playwright

// For error tracking, add Sentry or similar:
// npm install @sentry/node
// Follow Sentry docs for your runtime

// For AI cost monitoring, query the cost tracker:
const todaysCost = await costTracker.getTodaysCost()
const featureCosts = await costTracker.getFeatureCosts({
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
})
// Returns: [{ feature, totalCost, callCount, avgCostPerCall, successRate, lastUsed }]

// For database monitoring with Prisma:
// Add query logging in development
// prisma.$on('query', (e) => { console.log(\`[\${e.duration}ms] \${e.query}\`) })`}</CodeBlock>

        <InfoCard title="PRODUCTION CHECKLIST">
          <ul className="space-y-1 mt-1">
            <li><strong>Auth:</strong> Set <code>NEXTAUTH_URL</code> to production domain, generate strong <code>NEXTAUTH_SECRET</code></li>
            <li><strong>Payments:</strong> Switch to <code>mode: &apos;live&apos;</code>, register webhook URL in Stripe dashboard</li>
            <li><strong>Email:</strong> Switch from console adapter to <code>resend</code></li>
            <li><strong>Database:</strong> Enable connection pooling for serverless, run <code>prisma migrate deploy</code></li>
            <li><strong>Rate limiting:</strong> Use Upstash Redis (distributed) instead of memory rate limiter</li>
            <li><strong>Stores:</strong> Use <code>PrismaTeamStore</code>, <code>PrismaAuditStore</code>, <code>PrismaCostStore</code> instead of in-memory</li>
            <li><strong>Security headers:</strong> Enable HSTS, CSP, CORS with production origins</li>
            <li><strong>Audit logging:</strong> Enable for compliance (GDPR, SOC 2)</li>
            <li><strong>AI budget:</strong> Set <code>AI_DAILY_BUDGET</code> env var, monitor feature-level costs</li>
            <li><strong>Health checks:</strong> Add <code>/api/health</code> endpoint, configure uptime monitoring</li>
            <li><strong>Error tracking:</strong> Set up Sentry or equivalent for production error visibility</li>
            <li><strong>Bundle size:</strong> Run <code>pnpm size</code> in CI to catch size regressions</li>
            <li><strong>Secrets:</strong> All secrets in platform secret manager, never in code or env files committed to git</li>
          </ul>
        </InfoCard>

        <InfoCard title="STAGING VS PRODUCTION">
          Key differences to configure between environments:
          <ul className="space-y-1 mt-2">
            <li><strong>Stripe:</strong> Use <code>sk_test_</code> keys in staging, <code>sk_live_</code> in production. Register separate webhook endpoints for each.</li>
            <li><strong>Database:</strong> Separate databases with the same schema. Run migrations on staging first.</li>
            <li><strong>AI budget:</strong> Lower budget in staging to avoid accidental spend ($5-10/day vs $50/day in prod).</li>
            <li><strong>Email:</strong> Keep console adapter in staging to avoid sending real emails to test users.</li>
            <li><strong>Rate limits:</strong> More lenient in staging for testing, stricter in production.</li>
          </ul>
        </InfoCard>
      </Section>
    </DocLayout>
  )
}
