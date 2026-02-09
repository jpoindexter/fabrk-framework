import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function GuidesPage() {
  return (
    <DocLayout
      title="GUIDES"
      description="Step-by-step guides for common integration patterns. Build a dashboard, add auth, integrate payments, set up AI, and deploy."
    >
      {/* Guide index */}
      <Section title="GUIDE INDEX">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a href="#dashboard" className="block border border-border bg-card p-4 transition-colors hover:border-primary">
            <div className="text-xs font-bold text-primary uppercase">BUILD A DASHBOARD</div>
            <div className="text-xs text-muted-foreground mt-1">KPIs, charts, data tables, sidebar navigation</div>
          </a>
          <a href="#auth" className="block border border-border bg-card p-4 transition-colors hover:border-primary">
            <div className="text-xs font-bold text-primary uppercase">AUTHENTICATION</div>
            <div className="text-xs text-muted-foreground mt-1">NextAuth, API keys, MFA setup</div>
          </a>
          <a href="#payments" className="block border border-border bg-card p-4 transition-colors hover:border-primary">
            <div className="text-xs font-bold text-primary uppercase">PAYMENTS</div>
            <div className="text-xs text-muted-foreground mt-1">Stripe checkout, webhooks, pricing page</div>
          </a>
          <a href="#ai" className="block border border-border bg-card p-4 transition-colors hover:border-primary">
            <div className="text-xs font-bold text-primary uppercase">AI INTEGRATION</div>
            <div className="text-xs text-muted-foreground mt-1">LLM providers, cost tracking, chat UI</div>
          </a>
          <a href="#deployment" className="block border border-border bg-card p-4 transition-colors hover:border-primary">
            <div className="text-xs font-bold text-primary uppercase">DEPLOYMENT</div>
            <div className="text-xs text-muted-foreground mt-1">Vercel, database, production checklist</div>
          </a>
        </div>
      </Section>

      <Section id="dashboard" title="BUILD A DASHBOARD">
        <p className="text-sm text-muted-foreground mb-4">
          Build a complete admin dashboard with KPIs, charts, data tables, and sidebar
          navigation in under 10 minutes using FABRK components.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          1. SCAFFOLD THE PROJECT
        </h3>
        <CodeBlock title="terminal">{`npx create-fabrk-app my-dashboard --template dashboard
cd my-dashboard
pnpm install`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. CREATE THE DASHBOARD LAYOUT
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Use a sidebar layout with navigation items. The sidebar uses partial borders
          (border-r) so it does NOT get mode.radius.
        </p>
        <CodeBlock title="src/app/dashboard/layout.tsx">{`'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { id: 'overview', label: 'OVERVIEW', href: '/dashboard' },
  { id: 'analytics', label: 'ANALYTICS', href: '/dashboard/analytics' },
  { id: 'users', label: 'USERS', href: '/dashboard/users' },
  { id: 'settings', label: 'SETTINGS', href: '/dashboard/settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — partial border (border-r), NO mode.radius */}
      <aside className="w-64 border-r border-border bg-card p-4 shrink-0">
        <div className={cn('text-primary font-bold text-lg mb-8', mode.font)}>
          {'>'} MY APP
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
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
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. ADD KPI CARDS
        </h3>
        <CodeBlock title="src/app/dashboard/page.tsx">{`'use client'

import { KPICard, Card, Badge, BarChart, LineChart, DataTable } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'

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

const users = [
  { name: 'Jason', email: 'jason@example.com', role: 'Admin', status: 'Active' },
  { name: 'Sarah', email: 'sarah@example.com', role: 'Editor', status: 'Active' },
  { name: 'Mike', email: 'mike@example.com', role: 'Viewer', status: 'Invited' },
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
      {/* Header */}
      <div>
        <h1 className={cn('text-xl font-bold uppercase', mode.font)}>OVERVIEW</h1>
        <p className="text-sm text-muted-foreground">Your dashboard at a glance.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <KPICard key={s.title} title={s.title} value={s.value} trend={s.trend} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={cn('p-6 border border-border', mode.radius)}>
          <h3 className={cn('text-xs uppercase text-muted-foreground mb-4', mode.font)}>
            [WEEKLY REVENUE]
          </h3>
          <BarChart data={revenueData} />
        </Card>
        <Card className={cn('p-6 border border-border', mode.radius)}>
          <h3 className={cn('text-xs uppercase text-muted-foreground mb-4', mode.font)}>
            [TREND]
          </h3>
          <LineChart data={revenueData} />
        </Card>
      </div>

      {/* Data table */}
      <Card className={cn('border border-border', mode.radius)}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className={cn('text-xs uppercase text-muted-foreground', mode.font)}>
            [RECENT USERS]
          </h3>
          <Badge variant="secondary">[{users.length} TOTAL]</Badge>
        </div>
        <DataTable columns={columns} data={users} />
      </Card>
    </div>
  )
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          4. ADD FEATURE FLAGS
        </h3>
        <CodeBlock title="conditional features">{`import { useFeatureFlag } from '@fabrk/core'

function DashboardPage() {
  const { enabled: showAnalytics } = useFeatureFlag('advanced-analytics')

  return (
    <div className="p-6 space-y-6">
      <KPICards />
      <Charts />
      {showAnalytics && <AdvancedAnalytics />}
      <RecentUsers />
    </div>
  )
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          5. ADD NOTIFICATIONS
        </h3>
        <CodeBlock title="notification center in header">{`import { NotificationCenter } from '@fabrk/components'
import { useNotifications } from '@fabrk/core'

function DashboardHeader() {
  const { manager } = useNotifications()

  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <h1 className="text-lg font-bold uppercase">DASHBOARD</h1>
      <NotificationCenter
        notifications={notifications}
        onMarkRead={(id) => manager.markRead(id)}
        onMarkAllRead={() => manager.markAllRead()}
      />
    </div>
  )
}`}</CodeBlock>

        <InfoCard title="RESULT">
          You now have a full dashboard with sidebar navigation, KPI cards,
          bar + line charts, a sortable data table, feature flags for gradual rollout,
          and a notification center. Total time: under 10 minutes.
        </InfoCard>
      </Section>

      <Section id="auth" title="AUTHENTICATION SETUP">
        <p className="text-sm text-muted-foreground mb-4">
          Set up authentication with NextAuth, API keys, and MFA.
        </p>

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
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. SET UP API KEYS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          API keys use SHA-256 hashing with a <code>fabrk_</code> prefix. The raw key
          is shown to the user once; only the hash is stored.
        </p>
        <CodeBlock title="src/app/api/keys/route.ts">{`import { generateApiKey, hashApiKey, validateApiKey } from '@fabrk/auth'

// POST /api/keys — Create a new API key
export async function POST(req: Request) {
  const { name } = await req.json()
  const { key, hash } = await generateApiKey('live')

  // Store hash in database, return raw key to user (shown once)
  await db.apiKey.create({
    data: { hash, userId: session.user.id, name }
  })

  return Response.json({ key }) // fabrk_live_xxx
}

// Middleware: validate API key from Authorization header
export async function validateRequest(req: Request) {
  const authHeader = req.headers.get('Authorization')
  const key = authHeader?.replace('Bearer ', '')
  if (!key) return null

  const apiKeys = await db.apiKey.findMany({ where: { userId: req.userId } })
  for (const stored of apiKeys) {
    if (await validateApiKey(key, stored.hash)) return stored
  }
  return null
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. ENABLE MFA
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          MFA uses TOTP (RFC 6238) with QR code setup and backup codes.
          Components accept callbacks (no API calls baked in) and render props for
          optional dependencies like QR code libraries.
        </p>
        <CodeBlock title="src/app/settings/mfa.tsx">{`'use client'

import { MfaSetupDialog, BackupCodesModal, MfaCard } from '@fabrk/components'
import { generateTOTP, verifyTOTP, generateBackupCodes } from '@fabrk/auth'

function MFASettings() {
  const [mfaEnabled, setMfaEnabled] = useState(user.mfaEnabled)
  const [showSetup, setShowSetup] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  return (
    <div className="space-y-4">
      <MfaCard
        enabled={mfaEnabled}
        onEnable={() => setShowSetup(true)}
        onDisable={async () => {
          await api.post('/api/mfa/disable')
          setMfaEnabled(false)
        }}
      />

      <MfaSetupDialog
        open={showSetup}
        onOpenChange={setShowSetup}
        onSetup={async (secret) => {
          const codes = await api.post('/api/mfa/enable', { secret })
          setBackupCodes(codes)
          setMfaEnabled(true)
        }}
        renderQrCode={(uri) => <QRCode value={uri} />}
      />

      {backupCodes.length > 0 && (
        <BackupCodesModal
          codes={backupCodes}
          onRegenerate={async () => {
            const codes = await api.post('/api/mfa/regenerate')
            setBackupCodes(codes)
          }}
        />
      )}
    </div>
  )
}`}</CodeBlock>
      </Section>

      <Section id="payments" title="PAYMENTS INTEGRATION">
        <p className="text-sm text-muted-foreground mb-4">
          Integrate payments with Stripe, Polar, or Lemon Squeezy. The adapter pattern
          means you can switch providers by changing one line in your config.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          1. CONFIGURE PAYMENTS
        </h3>
        <CodeBlock title="fabrk.config.ts">{`export default defineFabrkConfig({
  payments: {
    adapter: 'stripe',          // or 'polar' or 'lemonsqueezy'
    mode: 'test',               // 'test' | 'live'
    config: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  },
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. CREATE CHECKOUT
        </h3>
        <CodeBlock title="src/app/api/checkout/route.ts">{`import { StripePaymentAdapter } from '@fabrk/payments'

const stripe = new StripePaymentAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
})

export async function POST(req: Request) {
  const { priceId } = await req.json()

  const checkout = await stripe.createCheckout({
    priceId,
    customerId: session.user.stripeCustomerId,
    successUrl: \`\${process.env.NEXTAUTH_URL}/success\`,
    cancelUrl: \`\${process.env.NEXTAUTH_URL}/pricing\`,
  })

  return Response.json({ url: checkout.url })
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. HANDLE WEBHOOKS
        </h3>
        <CodeBlock title="src/app/api/webhooks/stripe/route.ts">{`import { StripePaymentAdapter } from '@fabrk/payments'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  const event = await stripe.handleWebhook(body, signature)

  switch (event.type) {
    case 'checkout.session.completed':
      await db.subscription.create({
        data: {
          userId: event.data.metadata.userId,
          stripeSubscriptionId: event.data.subscriptionId,
          plan: event.data.metadata.plan,
          status: 'active',
        },
      })
      break
    case 'customer.subscription.deleted':
      await db.subscription.update({
        where: { stripeSubscriptionId: event.data.subscriptionId },
        data: { status: 'canceled' },
      })
      break
  }

  return Response.json({ received: true })
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          4. PRICING UI
        </h3>
        <CodeBlock title="src/app/pricing/page.tsx">{`'use client'

import { PricingCard, UpgradeCTA } from '@fabrk/components'

const plans = [
  {
    name: 'FREE', price: '$0', period: '/month',
    features: ['5 projects', '1GB storage', 'Community support'],
  },
  {
    name: 'PRO', price: '$29', period: '/month',
    features: ['Unlimited projects', '100GB storage', 'Priority support', 'API access'],
    highlighted: true,
  },
  {
    name: 'ENTERPRISE', price: 'Custom',
    features: ['Everything in Pro', 'SSO/SAML', 'Dedicated support', 'SLA'],
  },
]

export default function PricingPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold uppercase text-center mb-8">PRICING</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PricingCard
            key={plan.name}
            title={plan.name}
            price={plan.price}
            period={plan.period}
            features={plan.features}
            highlighted={plan.highlighted}
            onSelect={() => checkout(plan.name.toLowerCase())}
          />
        ))}
      </div>
    </div>
  )
}`}</CodeBlock>
      </Section>

      <Section id="ai" title="AI INTEGRATION">
        <p className="text-sm text-muted-foreground mb-4">
          Add AI capabilities with cost tracking, streaming, and prompt management.
          Works with Claude, OpenAI, and Ollama (local).
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          1. CONFIGURE AI
        </h3>
        <CodeBlock title="fabrk.config.ts">{`export default defineFabrkConfig({
  ai: {
    costTracking: true,
    validation: 'strict',
    providers: ['claude', 'openai'],
    budget: { daily: 50, monthly: 1000 },
  },
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. SET UP THE LLM CLIENT
        </h3>
        <CodeBlock title="src/lib/ai.ts">{`import { getLLMClient, AICostTracker, InMemoryCostStore } from '@fabrk/ai'

// Initialize provider
export const llm = getLLMClient({
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250514',
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Initialize cost tracker
export const costTracker = new AICostTracker(new InMemoryCostStore())

// Helper: chat with cost tracking
export async function chat(userId: string, messages: Array<{ role: string; content: string }>) {
  const response = await llm.chat(messages)

  // Track cost automatically
  await costTracker.track({
    userId,
    model: 'claude-sonnet-4-5-20250514',
    provider: 'anthropic',
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    feature: 'chat',
  })

  return response
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. COST TRACKING AND BUDGETS
        </h3>
        <CodeBlock title="budget enforcement">{`import { costTracker } from '@/lib/ai'

// Check budget before making API call
const budget = await costTracker.getBudgetStatus(userId)
// { withinBudget: true, todaysCost: 12.50, percentUsed: 25 }

if (!budget.withinBudget) {
  return Response.json(
    { error: 'Daily budget exceeded. Resets at midnight UTC.' },
    { status: 429 }
  )
}

// Get cost breakdown
const summary = await costTracker.getSummary(userId, { period: 'week' })
// { total: 87.30, byModel: { 'claude-sonnet-4-5-20250514': 62.10, 'gpt-4': 25.20 } }`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          4. PROMPT TEMPLATES
        </h3>
        <CodeBlock title="reusable prompts">{`import { createPromptTemplate, composePrompts } from '@fabrk/ai'

const summarize = createPromptTemplate({
  name: 'summarize',
  template: 'Summarize the following text in {{style}} style:\\n\\n{{content}}',
  variables: { style: 'concise', content: '' },
})

const codeReview = createPromptTemplate({
  name: 'code-review',
  template: 'Review this {{language}} code for {{focus}}:\\n\\n\`\`\`{{language}}\\n{{code}}\\n\`\`\`',
  variables: { language: 'typescript', focus: 'bugs and performance', code: '' },
})

// Use templates
const prompt = summarize({ content: articleText, style: 'bullet points' })
const review = codeReview({ code: myCode, focus: 'security vulnerabilities' })`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          5. CHAT UI
        </h3>
        <CodeBlock title="src/app/chat/page.tsx">{`'use client'

import { ChatInput, ChatMessageList, TokenCounter, UsageBar } from '@fabrk/components'
import { useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  async function handleSend(content: string) {
    const userMsg: Message = { role: 'user', content }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [...messages, userMsg] }),
    })
    const data = await res.json()

    setMessages((prev) => [...prev, { role: 'assistant', content: data.content }])
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-sm font-bold uppercase">[AI CHAT]</h1>
        <TokenCounter used={messages.length * 150} limit={4096} />
      </div>

      <ChatMessageList messages={messages} loading={loading} className="flex-1" />

      <div className="p-4 border-t border-border space-y-2">
        <UsageBar used={12.50} limit={50} label="DAILY BUDGET" />
        <ChatInput onSend={handleSend} placeholder="Ask anything..." disabled={loading} />
      </div>
    </div>
  )
}`}</CodeBlock>
      </Section>

      <Section id="deployment" title="DEPLOYMENT">
        <p className="text-sm text-muted-foreground mb-4">
          Deploy your FABRK app to Vercel, Railway, or any Node.js host.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          VERCEL
        </h3>
        <CodeBlock>{`# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add RESEND_API_KEY
vercel env add ANTHROPIC_API_KEY`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          DATABASE
        </h3>
        <CodeBlock>{`# Push Prisma schema to production database
pnpm dlx prisma migrate deploy

# For serverless, enable connection pooling:
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"

# Recommended providers:
#   Neon    — serverless PostgreSQL, free tier
#   Supabase — PostgreSQL + realtime
#   PlanetScale — MySQL, branching`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          UPDATE CONFIG FOR PRODUCTION
        </h3>
        <CodeBlock title="fabrk.config.ts changes for production">{`export default defineFabrkConfig({
  // Switch payments to live mode
  payments: { adapter: 'stripe', mode: 'live' },

  // Use real email delivery
  email: { adapter: 'resend', from: 'hi@yourdomain.com' },

  // Enable all security features
  security: {
    csrf: true,
    csp: true,
    rateLimit: true,     // Use UpstashRateLimiter in production
    auditLog: true,
    headers: true,
    cors: {
      origins: ['https://yourdomain.com'],
    },
  },
})`}</CodeBlock>

        <InfoCard title="PRODUCTION CHECKLIST">
          <ul className="space-y-1 mt-1">
            <li>Set <code>payments.mode: &apos;live&apos;</code> in config</li>
            <li>Set <code>email.adapter: &apos;resend&apos;</code> (not console)</li>
            <li>Set <code>security.headers: true</code> for HSTS + CSP</li>
            <li>Configure rate limiting with Upstash Redis for distributed limiting</li>
            <li>Enable audit logging for compliance</li>
            <li>Set up Stripe webhook endpoint in Stripe dashboard</li>
            <li>Use <code>PrismaTeamStore</code>, <code>PrismaAuditStore</code> instead of in-memory stores</li>
            <li>Set <code>NEXTAUTH_URL</code> to your production domain</li>
            <li>Generate a strong <code>NEXTAUTH_SECRET</code> with <code>openssl rand -base64 32</code></li>
          </ul>
        </InfoCard>
      </Section>
    </DocLayout>
  )
}
