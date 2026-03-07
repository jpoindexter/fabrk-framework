import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'
import { STATS } from '@/data/stats'

export default function GettingStartedPage() {
  return (
    <DocLayout
      title="GETTING STARTED"
      description="Create your first FABRK app in under 5 minutes. Install, configure, build, deploy."
    >
      <Section title="PREREQUISITES">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Node.js 22+</strong> &mdash; Required runtime. Check with <code>node --version</code></li>
          <li><strong className="text-foreground">pnpm 9+</strong> &mdash; Package manager. Install with <code>npm install -g pnpm</code></li>
          <li><strong className="text-foreground">PostgreSQL</strong> &mdash; Optional. Required for Prisma templates (ai-saas, dashboard)</li>
        </ul>
      </Section>

      <Section title="STEP 1: SCAFFOLD YOUR APP">
        <p className="text-sm text-muted-foreground mb-4">
          The fastest way to start is with the CLI. It creates a project
          with FABRK packages pre-configured, a Prisma schema, and a <code>fabrk.config.ts</code>.
        </p>
        <CodeBlock title="terminal">{`npx create-fabrk-app my-app

# You'll be prompted to choose a template:
#
#   basic      — Clean starting point with core + themes
#   ai-saas    — AI SaaS with cost tracking, API keys, streaming
#   dashboard  — Admin dashboard with teams, flags, webhooks, audit`}</CodeBlock>

        <CodeBlock title="start development">{`cd my-app
pnpm install
pnpm dev`}</CodeBlock>

        <p className="text-sm text-muted-foreground">
          Open <code>http://localhost:3000</code> to see your app running.
        </p>

        <InfoCard title="MANUAL INSTALL">
          If you prefer to add FABRK to an existing project:
          <CodeBlock title="install packages">{`pnpm add @fabrk/core @fabrk/config @fabrk/components @fabrk/design-system

# Add feature packages as needed:
pnpm add @fabrk/auth @fabrk/payments @fabrk/ai @fabrk/email
pnpm add @fabrk/storage @fabrk/security @fabrk/store-prisma`}</CodeBlock>
        </InfoCard>
      </Section>

      <Section title="STEP 2: PROJECT STRUCTURE">
        <p className="text-sm text-muted-foreground mb-4">
          After scaffolding, your project looks like this:
        </p>
        <CodeBlock>{`my-app/
├── src/
│   └── app/
│       ├── layout.tsx           # Root layout with providers
│       ├── page.tsx             # Home page
│       ├── dashboard/
│       │   └── page.tsx         # Dashboard (template-specific)
│       ├── api/
│       │   ├── webhooks/        # Webhook endpoints
│       │   └── keys/            # API key endpoints
│       └── globals.css          # CSS variables + design tokens
├── prisma/
│   └── schema.prisma            # Database schema (template-specific)
├── fabrk.config.ts              # FABRK configuration
├── vite.config.ts               # Vite config with fabrk() plugin
├── package.json
├── .env.example                 # Environment variables
└── tsconfig.json`}</CodeBlock>
      </Section>

      <Section title="STEP 3: CONFIGURE FABRK">
        <p className="text-sm text-muted-foreground mb-4">
          Every FABRK app has a <code>fabrk.config.ts</code> at the project root.
          This is your single source of truth &mdash; like <code>vite.config.ts</code> but for your
          entire application stack.
        </p>
        <CodeBlock title="fabrk.config.ts">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  // Framework runtime
  framework: {
    runtime: 'vite',
    typescript: true,
    srcDir: 'src',
    database: 'prisma',
  },

  // Design system
  theme: {
    system: 'terminal',
    colorScheme: 'green',
    radius: 'sharp',
  },

  // Feature flags
  notifications: { enabled: true },
  teams: { enabled: true, maxMembers: 50 },
  featureFlags: { enabled: true },
})`}</CodeBlock>

        <InfoCard title="TYPE SAFETY">
          <code>defineFabrkConfig()</code> provides full TypeScript autocomplete
          and Zod validation for all 12 config sections. Defaults are applied
          automatically &mdash; you only configure what you need.
        </InfoCard>

        <InfoCard title="ZERO-CONFIG DEVELOPMENT">
          In dev mode, FABRK automatically provides: console email adapter,
          local filesystem storage, in-memory rate limiting, in-memory stores
          for teams/notifications/flags. No database or API keys needed to start.
        </InfoCard>
      </Section>

      <Section title="STEP 4: USE COMPONENTS">
        <p className="text-sm text-muted-foreground mb-4">
          Import pre-built components instead of writing them from scratch.
          All components use design tokens and the terminal aesthetic.
        </p>
        <CodeBlock title="src/app/dashboard/page.tsx">{`'use client'

import {
  KPICard, Card, Badge, Button, DataTable, BarChart
} from '@fabrk/components'
import { cn } from '@/lib/utils'
import { mode } from '@fabrk/design-system'

const stats = [
  { title: 'REVENUE', value: '$12,340', trend: 12.5 },
  { title: 'USERS', value: '1,572', trend: 8.3 },
  { title: 'DEPLOYS', value: '47', trend: -2.1 },
  { title: 'UPTIME', value: '99.9%', trend: 0.1 },
]

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <KPICard key={s.title} title={s.title} value={s.value} trend={s.trend} />
        ))}
      </div>

      {/* Chart */}
      <Card className={cn('p-6 border border-border', mode.radius)}>
        <h2 className={cn('text-sm font-bold uppercase mb-4', mode.font)}>
          [WEEKLY REVENUE]
        </h2>
        <BarChart
          data={[
            { label: 'Mon', value: 1200 },
            { label: 'Tue', value: 1800 },
            { label: 'Wed', value: 1400 },
            { label: 'Thu', value: 2200 },
            { label: 'Fri', value: 1900 },
          ]}
        />
      </Card>

      {/* Status badges */}
      <div className="flex gap-2">
        <Badge variant="default">[ACTIVE]</Badge>
        <Badge variant="secondary">[PENDING]</Badge>
        <Button className="ml-auto">{'>'}  VIEW ALL</Button>
      </div>
    </div>
  )
}`}</CodeBlock>
      </Section>

      <Section title="STEP 5: ADD FEATURES">
        <p className="text-sm text-muted-foreground mb-4">
          Add backend features by installing the relevant package and updating your config.
          FABRK auto-wires adapters from your configuration.
        </p>
        <CodeBlock title="add authentication">{`# Install auth package
pnpm add @fabrk/auth

# Update fabrk.config.ts
auth: {
  adapter: 'nextauth',
  apiKeys: true,
  mfa: true,
  config: {
    providers: ['google', 'credentials'],
  },
}`}</CodeBlock>

        <CodeBlock title="add payments">{`# Install payments package
pnpm add @fabrk/payments

# Update fabrk.config.ts
payments: {
  adapter: 'stripe',
  mode: 'test',
  config: {
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
}`}</CodeBlock>

        <CodeBlock title="add AI">{`# Install AI package
pnpm add @fabrk/ai

# Update fabrk.config.ts
ai: {
  costTracking: true,
  validation: 'strict',
  providers: ['claude', 'openai'],
  budget: { daily: 50, monthly: 1000 },
}`}</CodeBlock>
      </Section>

      <Section title="STEP 5B: ADD AN AI AGENT">
        <p className="text-sm text-muted-foreground mb-4">
          AI agents are a first-class primitive in FABRK. Drop an <code>agent.ts</code> file
          into <code>agents/&lt;name&gt;/</code> and the framework exposes it automatically
          as a streaming HTTP endpoint with budget enforcement.
        </p>
        <CodeBlock title="agents/assistant/agent.ts">{`# File-system convention: agents/<name>/agent.ts
# Create agents/assistant/agent.ts

import { defineAgent } from '@fabrk/framework'

export default defineAgent({
  model: 'claude-sonnet-4-6',
  systemPrompt: 'You are a helpful coding assistant. Be concise.',
  stream: true,
  memory: true,
  auth: 'none',
  budget: { daily: 5.0, perSession: 0.50 },
})

# The agent is automatically available at POST /api/agents/assistant`}</CodeBlock>

        <CodeBlock title="use in React">{`'use client'
import { useAgent } from '@fabrk/framework/client'

function ChatPage() {
  const { messages, send, isStreaming } = useAgent('assistant')

  return (
    <div>
      {messages.map((m, i) => (
        <div key={i}>{m.role}: {m.content}</div>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); send(new FormData(e.currentTarget).get('msg') as string) }}>
        <input name="msg" placeholder="Ask something..." />
        <button type="submit" disabled={isStreaming}>&gt; SEND</button>
      </form>
    </div>
  )
}`}</CodeBlock>

        <InfoCard title="BUDGET ENFORCEMENT">
          The <code>budget</code> field sets hard limits per agent — <code>daily</code> caps
          total spend across all sessions in a 24-hour window, <code>perSession</code> caps
          a single conversation. Requests that would exceed either limit are rejected before
          hitting the LLM provider.
        </InfoCard>
      </Section>

      <Section title="STEP 5C: ADD TOOLS">
        <p className="text-sm text-muted-foreground mb-4">
          Tools extend what agents can do. Drop a <code>tool.ts</code> file into{' '}
          <code>tools/&lt;name&gt;/</code>, then reference it by name in any agent definition.
        </p>
        <CodeBlock title="tools/search-docs/tool.ts">{`# File-system convention: tools/<name>/tool.ts
# Create tools/search-docs/tool.ts

import { defineTool } from '@fabrk/framework'

export default defineTool({
  name: 'search-docs',
  description: 'Search project documentation for answers.',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
    },
    required: ['query'],
  },
  handler: async ({ query }) => ({
    content: [{ type: 'text', text: \`Results for: \${query}\` }],
  }),
})`}</CodeBlock>

        <CodeBlock title="reference tool in agent">{`# Then reference it in your agent:
export default defineAgent({
  model: 'claude-sonnet-4-6',
  tools: ['search-docs'],
  // ...
})`}</CodeBlock>

        <InfoCard title="AUTO-DISCOVERY">
          FABRK scans the <code>tools/</code> directory at startup. Any file matching{' '}
          <code>tools/*/tool.ts</code> is registered automatically — no manual imports or
          plugin registration required.
        </InfoCard>
      </Section>

      <Section title="STEP 5D: AGENT MEMORY AND TESTING">
        <p className="text-sm text-muted-foreground mb-4">
          Agents with <code>memory: true</code> persist conversation history automatically.
          The built-in testing framework lets you mock LLM responses and assert on tool calls
          without making real API requests.
        </p>
        <CodeBlock title="agent test">{`import { createTestAgent, mockLLM, respondedWith } from '@fabrk/framework/testing'

const agent = createTestAgent('assistant', {
  mock: mockLLM().onMessage('hello').respondWith('Hi there!'),
})

const result = await agent.send('hello')
expect(respondedWith(result, /Hi there/)).toBe(true)`}</CodeBlock>

        <InfoCard title="MEMORY PERSISTENCE">
          In development, conversation history is stored in memory (per-process).
          In production, wire a store adapter — any key/value or relational store works —
          so history survives restarts and scales across instances.
        </InfoCard>
      </Section>

      <Section title="STEP 6: AUTO-WIRE AND RUN">
        <p className="text-sm text-muted-foreground mb-4">
          FABRK's <code>autoWire()</code> reads your config and creates all adapters
          automatically. In development, <code>applyDevDefaults()</code> fills in
          sensible defaults so you can run without any API keys.
        </p>
        <CodeBlock title="src/lib/fabrk.ts">{`import { autoWire, applyDevDefaults } from '@fabrk/core'
import config from '../../fabrk.config'

// In development: auto-fills console email, local storage, memory stores
const devConfig = process.env.NODE_ENV === 'development'
  ? applyDevDefaults(config)
  : config

// Creates all adapters from config
export const fabrk = autoWire(devConfig)

// Access adapters
export const { email, storage, payments, auth } = fabrk`}</CodeBlock>
      </Section>

      <Section title="STEP 7: DATABASE WITH PRISMA">
        <p className="text-sm text-muted-foreground mb-4">
          If your template includes Prisma, set up your database:
        </p>
        <CodeBlock title="terminal">{`# Set your database URL
echo 'DATABASE_URL="postgresql://user:pass@localhost:5432/myapp"' >> .env

# Push schema to database
pnpm dlx prisma db push

# Generate client
pnpm dlx prisma generate`}</CodeBlock>

        <p className="text-sm text-muted-foreground mb-4">
          Use <code>@fabrk/store-prisma</code> to connect FABRK's stores to your database:
        </p>
        <CodeBlock title="wire Prisma stores">{`import { autoWire } from '@fabrk/core'
import { PrismaTeamStore, PrismaAuditStore } from '@fabrk/store-prisma'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Inject Prisma stores via StoreOverrides
const fabrk = autoWire(config, undefined, {
  teamStore: new PrismaTeamStore(prisma),
  auditStore: new PrismaAuditStore(prisma),
})`}</CodeBlock>
      </Section>

      <Section title="STEP 8: DEPLOY">
        <p className="text-sm text-muted-foreground mb-4">
          Deploy to Vercel, Railway, or any Node.js host:
        </p>
        <CodeBlock title="vercel deployment">{`# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add STRIPE_SECRET_KEY`}</CodeBlock>

        <InfoCard title="PRODUCTION CHECKLIST">
          Before going live, update your <code>fabrk.config.ts</code>:
          <ul className="space-y-1 mt-2">
            <li>Set <code>payments.mode: &apos;live&apos;</code></li>
            <li>Set <code>email.adapter: &apos;resend&apos;</code> (not console)</li>
            <li>Enable <code>security.headers: true</code> for HSTS + CSP</li>
            <li>Configure rate limiting with Upstash Redis</li>
            <li>Enable audit logging for compliance</li>
          </ul>
        </InfoCard>
      </Section>

      <Section title="USING THE CLI">
        <p className="text-sm text-muted-foreground mb-4">
          The <code>fabrk</code> CLI helps with development workflows:
        </p>
        <CodeBlock title="cli commands">{`# Start Vite dev server with FABRK tooling
fabrk dev

# Build for production (client + SSR)
fabrk build

# Start production server
fabrk start

# Show project info (agents, tools, prompts)
fabrk info

# List all discovered agents
fabrk agents

# Run health check
fabrk check

# Run agent tests
fabrk test`}</CodeBlock>
      </Section>

      <Section title="NEXT STEPS">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard title="CONFIGURATION">
            Learn about all 12 config sections &mdash; from AI budgets to security headers.
          </InfoCard>
          <InfoCard title="PACKAGES">
            Explore the {STATS.packages} packages &mdash; payments, auth, email, storage, security, and more.
          </InfoCard>
          <InfoCard title="COMPONENTS">
            Browse 109+ components &mdash; charts, forms, admin panels, AI chat, and more.
          </InfoCard>
          <InfoCard title="GUIDES">
            Step-by-step guides: build a dashboard, add auth, integrate payments, deploy.
          </InfoCard>
          <InfoCard title="MIGRATION">
            Moving from an existing app? See the migration guide for import transformations.
          </InfoCard>
          <InfoCard title="CLI REFERENCE">
            Full reference for <code>create-fabrk-app</code> and the <code>fabrk</code> dev CLI.
          </InfoCard>
        </div>
      </Section>
    </DocLayout>
  )
}
