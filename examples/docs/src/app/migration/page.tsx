import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function MigrationPage() {
  return (
    <DocLayout
      title="MIGRATION GUIDE"
      description="Migrate an existing application to the FABRK framework. Transform imports, extract components, set up config, and wire store adapters."
    >
      <InfoCard title="WHO IS THIS FOR">
        This guide is for developers who have an existing application and want to
        adopt FABRK&apos;s component library, design system, and adapter pattern. It covers
        the import transformations, component extraction process, and configuration setup.
      </InfoCard>

      <Section title="OVERVIEW">
        <p className="text-sm text-muted-foreground mb-4">
          Migrating to FABRK involves four main steps:
        </p>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li><strong className="text-foreground">Install packages</strong> &mdash; Add @fabrk/* packages to your project</li>
          <li><strong className="text-foreground">Create fabrk.config.ts</strong> &mdash; Define your configuration</li>
          <li><strong className="text-foreground">Transform imports</strong> &mdash; Replace @/ aliases with @fabrk/* imports</li>
          <li><strong className="text-foreground">Wire adapters</strong> &mdash; Replace custom implementations with FABRK adapters</li>
        </ol>
      </Section>

      <Section title="STEP 1: INSTALL PACKAGES">
        <p className="text-sm text-muted-foreground mb-4">
          Start by installing the core packages. Add feature packages as you migrate each area.
        </p>
        <CodeBlock title="install core packages">{`# Core (required)
pnpm add @fabrk/core @fabrk/config @fabrk/design-system

# Components (UI library)
pnpm add @fabrk/components

# Theming (optional — adds ThemeProvider, chart colors, formatters)
pnpm add @fabrk/design-system

# Feature packages (install as needed)
pnpm add @fabrk/auth          # NextAuth, API keys, MFA
pnpm add @fabrk/payments      # Stripe, Polar, Lemon Squeezy
pnpm add @fabrk/ai            # LLM providers, cost tracking
pnpm add @fabrk/email         # Resend, console adapter
pnpm add @fabrk/storage       # S3, R2, local filesystem
pnpm add @fabrk/security      # CSRF, CSP, rate limiting, audit
pnpm add @fabrk/store-prisma  # Prisma store adapters`}</CodeBlock>
      </Section>

      <Section title="STEP 2: CREATE CONFIGURATION">
        <p className="text-sm text-muted-foreground mb-4">
          Create a <code>fabrk.config.ts</code> at your project root. Start with just the sections
          you need and add more as you migrate.
        </p>
        <CodeBlock title="fabrk.config.ts">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  framework: {
    runtime: 'vite',
    typescript: true,
    srcDir: 'src',         // or 'app' if no src directory
    database: 'prisma',    // or 'drizzle' or 'none'
  },

  theme: {
    system: 'terminal',    // or 'swiss' or 'custom'
    colorScheme: 'green',
    radius: 'sharp',       // 'sharp' | 'rounded' | 'pill'
  },

  // Add sections as you migrate:
  // auth: { ... },
  // payments: { ... },
  // ai: { ... },
})`}</CodeBlock>
      </Section>

      <Section title="STEP 3: IMPORT TRANSFORMATIONS">
        <p className="text-sm text-muted-foreground mb-4">
          The most common migration task is transforming imports from path aliases to
          FABRK package imports. Here is a comprehensive mapping.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          UTILITY IMPORTS
        </h3>
        <CodeBlock title="before and after">{`// BEFORE: path alias imports
import { cn } from '@/lib/utils'
import { cn } from '@/utils'

// AFTER: FABRK package imports
import { cn } from '@fabrk/core'`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          DESIGN SYSTEM IMPORTS
        </h3>
        <CodeBlock title="before and after">{`// BEFORE: local design system
import { mode } from '@/design-system'
import { mode } from '@/lib/design-system'
import { themes } from '@/config/themes'

// AFTER: FABRK design system
import { mode } from '@fabrk/design-system'
// OR (if using the themes package with ThemeProvider):
import { mode } from '@fabrk/design-system'`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          COMPONENT IMPORTS
        </h3>
        <CodeBlock title="before and after">{`// BEFORE: local component imports
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/data-table'
import { BarChart } from '@/components/charts/bar-chart'
import { KPICard } from '@/components/dashboard/kpi-card'

// AFTER: single FABRK import
import {
  Button, Card, Input, Badge,
  DataTable, BarChart, KPICard
} from '@fabrk/components'`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          AUTH IMPORTS
        </h3>
        <CodeBlock title="before and after">{`// BEFORE: custom auth utilities
import { generateApiKey } from '@/lib/api-keys'
import { verifyTOTP } from '@/lib/mfa'
import { hashPassword } from '@/lib/auth'

// AFTER: FABRK auth package
import { generateApiKey, hashApiKey, validateApiKey } from '@fabrk/auth'
import { generateTOTP, verifyTOTP, generateBackupCodes } from '@fabrk/auth'`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          PAYMENT IMPORTS
        </h3>
        <CodeBlock title="before and after">{`// BEFORE: direct Stripe SDK usage
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// AFTER: FABRK payment adapter
import { StripePaymentAdapter } from '@fabrk/payments'
const payments = new StripePaymentAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          EMAIL IMPORTS
        </h3>
        <CodeBlock title="before and after">{`// BEFORE: direct Resend SDK
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

// AFTER: FABRK email adapter
import { ResendEmailAdapter } from '@fabrk/email'
const email = new ResendEmailAdapter({
  apiKey: process.env.RESEND_API_KEY!,
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          AI IMPORTS
        </h3>
        <CodeBlock title="before and after">{`// BEFORE: direct OpenAI/Anthropic SDK
import OpenAI from 'openai'
const openai = new OpenAI()

// AFTER: FABRK unified client
import { getLLMClient } from '@fabrk/ai'
const client = getLLMClient({
  provider: 'openai',
  model: 'gpt-4',
})`}</CodeBlock>

        <InfoCard title="FIND AND REPLACE">
          Use your editor&apos;s find-and-replace to batch transform imports:
          <CodeBlock title="regex patterns">{`# Find all @/ imports
@/components/ui/    → @fabrk/components (consolidate into barrel import)
@/lib/utils         → @fabrk/core
@/design-system     → @fabrk/design-system
@/lib/auth          → @fabrk/auth
@/lib/api-keys      → @fabrk/auth`}</CodeBlock>
        </InfoCard>
      </Section>

      <Section title="STEP 4: COMPONENT EXTRACTION PATTERN">
        <p className="text-sm text-muted-foreground mb-4">
          When migrating custom components to use FABRK, follow these patterns:
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          REPLACE API-FETCHING WITH CALLBACKS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          FABRK components accept callback props instead of making API calls directly.
          This keeps them portable and testable.
        </p>
        <CodeBlock title="before: component fetches data">{`// BEFORE: Component makes its own API calls
function MemberList() {
  const [members, setMembers] = useState([])

  useEffect(() => {
    fetch('/api/team/members').then(r => r.json()).then(setMembers)
  }, [])

  const handleRemove = async (id: string) => {
    await fetch(\`/api/team/members/\${id}\`, { method: 'DELETE' })
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div>
      {members.map(m => (
        <div key={m.id}>
          {m.name}
          <button onClick={() => handleRemove(m.id)}>Remove</button>
        </div>
      ))}
    </div>
  )
}`}</CodeBlock>

        <CodeBlock title="after: component accepts callbacks">{`// AFTER: Component accepts data and callbacks as props
import { MemberCard } from '@fabrk/components'

interface MemberListProps {
  members: Array<{ id: string; name: string; email: string; role: string }>
  onRemove: (id: string) => void
}

function MemberList({ members, onRemove }: MemberListProps) {
  return (
    <div className="space-y-3">
      {members.map(m => (
        <MemberCard
          key={m.id}
          name={m.name}
          email={m.email}
          role={m.role}
          onRemove={() => onRemove(m.id)}
        />
      ))}
    </div>
  )
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          REMOVE NEXT.JS DEPENDENCIES
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Components should not import from <code>next/link</code> or <code>next/navigation</code> directly.
          Use the <code>linkComponent</code> prop pattern or callbacks instead.
        </p>
        <CodeBlock title="before and after">{`// BEFORE: next/link dependency baked in
import Link from 'next/link'

function NavItem({ href, label }) {
  return <Link href={href}>{label}</Link>
}

// AFTER: linkComponent prop pattern
interface NavItemProps {
  href: string
  label: string
  linkComponent?: React.ComponentType<{ href: string; children: React.ReactNode }>
}

function NavItem({ href, label, linkComponent: LinkComp = 'a' as any }: NavItemProps) {
  return <LinkComp href={href}>{label}</LinkComp>
}

// Usage with Next.js:
import Link from 'next/link'
<NavItem href="/dashboard" label="DASHBOARD" linkComponent={Link} />`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          USE RENDER PROPS FOR OPTIONAL DEPS
        </h3>
        <CodeBlock title="render props pattern">{`// BEFORE: hard dependency on qrcode library
import QRCode from 'qrcode.react'

function MfaSetup({ uri }) {
  return <QRCode value={uri} />
}

// AFTER: render prop for optional dependency
interface MfaSetupProps {
  uri: string
  renderQrCode?: (uri: string) => React.ReactNode
}

function MfaSetup({ uri, renderQrCode }: MfaSetupProps) {
  if (renderQrCode) return <>{renderQrCode(uri)}</>
  return <code className="text-xs break-all">{uri}</code>
}

// Usage:
import QRCode from 'qrcode.react'
<MfaSetup uri={totpUri} renderQrCode={(uri) => <QRCode value={uri} />} />`}</CodeBlock>
      </Section>

      <Section title="STEP 5: APPLY DESIGN SYSTEM">
        <p className="text-sm text-muted-foreground mb-4">
          Replace hardcoded colors and styles with FABRK design tokens.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          COLOR TOKENS
        </h3>
        <CodeBlock title="replace hardcoded colors">{`// BEFORE: hardcoded Tailwind colors
<div className="bg-gray-100 text-gray-900 border-gray-200">
<button className="bg-blue-500 text-white hover:bg-blue-600">
<span className="text-red-500">Error</span>
<div className="bg-green-100 text-green-800">Success</div>

// AFTER: semantic design tokens
<div className="bg-muted text-foreground border-border">
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
<span className="text-destructive">Error</span>
<div className="bg-success/10 text-success">Success</div>`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          BORDER RADIUS
        </h3>
        <CodeBlock title="replace hardcoded radius">{`// BEFORE: hardcoded border radius
<Card className="rounded-lg border border-gray-200 p-4">
<Button className="rounded-md px-4 py-2">Click</Button>

// AFTER: mode.radius from design system
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'

<Card className={cn("border border-border p-4", mode.radius)}>
<Button className={cn("px-4 py-2", mode.radius)}>{'>'} CLICK</Button>`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          TYPOGRAPHY
        </h3>
        <CodeBlock title="apply terminal aesthetic">{`// BEFORE: generic text styles
<h1 className="text-2xl font-bold">Dashboard</h1>
<span className="text-sm text-gray-500">Active</span>
<button>Submit</button>

// AFTER: terminal aesthetic with mode.font
<h1 className={cn("text-2xl font-bold uppercase", mode.font)}>DASHBOARD</h1>
<Badge>[ACTIVE]</Badge>
<Button>{'>'} SUBMIT</Button>`}</CodeBlock>
      </Section>

      <Section title="STEP 6: WIRE STORE ADAPTERS">
        <p className="text-sm text-muted-foreground mb-4">
          Replace custom database queries with FABRK store adapters. This gives you
          a consistent interface and the ability to swap stores (in-memory for testing,
          Prisma for production).
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          BEFORE: DIRECT DATABASE CALLS
        </h3>
        <CodeBlock>{`// BEFORE: scattered Prisma calls
import { prisma } from '@/lib/prisma'

// Team management — custom queries everywhere
async function getTeam(id: string) {
  return prisma.organization.findUnique({ where: { id }, include: { members: true } })
}

async function addMember(teamId: string, userId: string, role: string) {
  return prisma.orgMember.create({ data: { organizationId: teamId, userId, role } })
}

// Audit logging — custom implementation
async function logAction(action: string, userId: string) {
  return prisma.auditLog.create({ data: { action, userId, timestamp: new Date() } })
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          AFTER: FABRK STORE ADAPTERS
        </h3>
        <CodeBlock>{`// AFTER: FABRK store pattern
import { autoWire } from '@fabrk/core'
import { PrismaTeamStore, PrismaAuditStore } from '@fabrk/store-prisma'
import { PrismaClient } from '@prisma/client'
import config from '../fabrk.config'

const prisma = new PrismaClient()

const fabrk = autoWire(config, undefined, {
  teamStore: new PrismaTeamStore(prisma),
  auditStore: new PrismaAuditStore(prisma),
})

// Now use FABRK managers — consistent API, swappable stores
const { manager: teamManager } = useTeam()
await teamManager.createTeam({ name: 'Engineering' })
await teamManager.addMember(teamId, { userId, role: 'member' })

// Audit logging via FABRK
const audit = new AuditLogger(new PrismaAuditStore(prisma))
await audit.log({ action: 'user.login', userId })`}</CodeBlock>

        <InfoCard title="TESTING BENEFIT">
          With store adapters, switch to in-memory stores for unit tests:
          <CodeBlock>{`// test setup
import { InMemoryTeamStore, InMemoryAuditStore } from '@fabrk/core'

const fabrk = autoWire(config, undefined, {
  teamStore: new InMemoryTeamStore(),
  auditStore: new InMemoryAuditStore(),
})
// Tests run instantly — no database required`}</CodeBlock>
        </InfoCard>
      </Section>

      <Section title="STEP 7: ADD USE CLIENT DIRECTIVES">
        <p className="text-sm text-muted-foreground mb-4">
          Components that use <code>cn()</code> from <code>@fabrk/core</code>
          or any interactive features need the <code>&apos;use client&apos;</code> directive.
          Server components (static pages, layouts without interactivity) do not need it.
        </p>
        <CodeBlock title="when to add use client">{`// NEEDS 'use client' — uses cn(), useState, onClick, etc.
'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { Button, Card } from '@fabrk/components'

function InteractiveComponent() {
  const [open, setOpen] = useState(false)
  return (
    <Card className={cn("p-4", mode.radius)}>
      <Button onClick={() => setOpen(true)}>{'>'} OPEN</Button>
    </Card>
  )
}

// DOES NOT NEED 'use client' — static content, no cn() or interactivity
import { DocLayout, Section } from '@/components/doc-layout'

export default function StaticPage() {
  return (
    <DocLayout title="ABOUT">
      <Section title="INFO">
        <p className="text-sm text-muted-foreground">
          Static content here.
        </p>
      </Section>
    </DocLayout>
  )
}`}</CodeBlock>
      </Section>

      <Section title="MIGRATE FROM VERCEL AI SDK">
        <p className="text-sm text-muted-foreground mb-4">
          If you are using the Vercel AI SDK (<code>ai</code> package), fabrk replaces the
          ad-hoc <code>generateText</code> / <code>streamText</code> call sites with file-system
          agent definitions. Each agent lives in <code>agents/&lt;name&gt;/agent.ts</code> and is
          discovered automatically at startup — no registration boilerplate required.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          BASIC GENERATION
        </h3>
        <CodeBlock title="before and after">{`// BEFORE: Vercel AI SDK
import { generateText, streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

const result = await generateText({
  model: openai('gpt-4'),
  prompt: 'Hello',
})

// Streaming with tools
const stream = await streamText({
  model: openai('gpt-4'),
  messages: [...],
  tools: { ... },
})

// AFTER: fabrk agent definition
// agents/assistant/agent.ts
import { defineAgent } from '@fabrk/framework'

export default defineAgent({
  model: 'gpt-4',
  tools: ['my-tool'],
  systemPrompt: 'You are a helpful assistant.',
  stream: true,
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          CALLING AGENTS FROM THE CLIENT
        </h3>
        <CodeBlock title="client hook">{`// BEFORE: call generateText / streamText in your own API route,
// then wire up a custom fetch loop on the client.

// AFTER: use the built-in useAgent hook
import { useAgent } from '@fabrk/framework/client'

function Chat() {
  const { messages, send, isStreaming } = useAgent('assistant')

  return (
    <div>
      {messages.map((m, i) => (
        <p key={i}>{m.content}</p>
      ))}
      <button onClick={() => send('Hello')}>{'>'} SEND</button>
    </div>
  )
}`}</CodeBlock>

        <InfoCard title="AGENT FILE-SYSTEM ROUTING">
          Place agent files anywhere under <code>agents/</code>. The route is derived from the
          directory name: <code>agents/assistant/agent.ts</code> is served at
          <code>/__ai/agents/assistant</code>. No manual registration needed.
        </InfoCard>
      </Section>

      <Section title="MIGRATE AI TOOLS">
        <p className="text-sm text-muted-foreground mb-4">
          Vercel AI SDK tool definitions map directly to fabrk&apos;s <code>defineTool</code>.
          The key difference is the schema format (JSON Schema object instead of a Zod schema)
          and the return shape (MCP-compatible content array).
        </p>

        <CodeBlock title="before and after">{`// BEFORE: Vercel AI SDK tool
import { tool } from 'ai'
import { z } from 'zod'

const weatherTool = tool({
  description: 'Get weather',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ temp: 72 }),
})

// AFTER: fabrk defineTool
// tools/weather/tool.ts
import { defineTool } from '@fabrk/framework'

export default defineTool({
  name: 'weather',
  description: 'Get weather',
  schema: {
    type: 'object',
    properties: { city: { type: 'string' } },
    required: ['city'],
  },
  handler: async ({ city }) => ({
    content: [{ type: 'text', text: JSON.stringify({ temp: 72 }) }],
  }),
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          REFERENCING TOOLS IN AGENTS
        </h3>
        <CodeBlock title="tool reference">{`// tools/weather/tool.ts — defines the tool (above)

// agents/assistant/agent.ts — references the tool by name
import { defineAgent } from '@fabrk/framework'

export default defineAgent({
  model: 'gpt-4',
  tools: ['weather'],   // matched by tool name, auto-discovered from tools/
  systemPrompt: 'You can look up weather.',
  stream: true,
})`}</CodeBlock>

        <InfoCard title="MCP COMPATIBILITY">
          fabrk tools use the MCP content array format natively. Tools defined with
          <code>defineTool</code> are automatically exposed via the built-in MCP server
          at <code>/__ai/mcp</code> — no additional adapter code required.
        </InfoCard>
      </Section>

      <Section title="MIGRATE COST TRACKING">
        <p className="text-sm text-muted-foreground mb-4">
          The Vercel AI SDK has no built-in cost tracking. You either omit it entirely or wire
          up a custom solution. fabrk tracks every LLM call automatically and enforces daily
          budgets and per-agent spending limits.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          BEFORE: NO BUILT-IN TRACKING
        </h3>
        <CodeBlock>{`// BEFORE: nothing — or a hand-rolled counter
import { generateText } from 'ai'

const result = await generateText({ model: openai('gpt-4'), prompt })

// Token usage is buried in result.usage — you must manually record,
// store, and alert on cost. No enforcement, no per-agent isolation.
console.log(result.usage.totalTokens)`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          AFTER: AUTOMATIC COST TRACKING
        </h3>
        <CodeBlock>{`// AFTER: configure budgets in fabrk.config.ts
import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  ai: {
    defaultModel: 'gpt-4',
    costTracking: {
      enabled: true,
      dailyBudget: 10.00,       // hard cap across all agents ($)
      alertThreshold: 0.8,      // warn at 80% of budget
      perAgentLimit: 2.00,      // per-agent daily cap ($)
    },
  },
})`}</CodeBlock>

        <CodeBlock title="runtime cost API">{`// Query live cost data at runtime
import { getCostTracker } from '@fabrk/ai'

const tracker = getCostTracker()

// Total spend today across all agents
const daily = await tracker.getDailyTotal()

// Spend broken down by agent name
const byAgent = await tracker.getDailyByAgent()

// Check remaining budget before running an expensive prompt
const remaining = await tracker.getRemainingBudget()
if (remaining < 0.10) {
  throw new Error('Daily budget nearly exhausted')
}`}</CodeBlock>

        <InfoCard title="BUDGET ENFORCEMENT">
          When a call would exceed the configured <code>dailyBudget</code>, fabrk rejects it
          before the LLM request is made and returns a 402 response to the client. The
          per-agent cap is enforced independently so one runaway agent cannot consume the
          entire shared budget.
        </InfoCard>
      </Section>

      <Section title="MIGRATE FROM NEXT.JS ROUTING">
        <p className="text-sm text-muted-foreground mb-4">
          fabrk uses the same file-system routing conventions as the Next.js App Router.
          In most cases, your existing <code>app/</code> directory moves over unchanged.
          The primary differences are the build toolchain (Vite instead of webpack) and a
          small set of Next.js-specific imports that need replacing.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          ROUTING CONVENTIONS (IDENTICAL)
        </h3>
        <CodeBlock title="file-system routing">{`// Next.js App Router          →    fabrk (identical)
app/page.tsx                  →    app/page.tsx
app/layout.tsx                →    app/layout.tsx
app/loading.tsx               →    app/loading.tsx
app/error.tsx                 →    app/error.tsx
app/not-found.tsx             →    app/not-found.tsx
app/[id]/page.tsx             →    app/[id]/page.tsx
app/api/route.ts              →    app/api/route.ts
app/(group)/page.tsx          →    app/(group)/page.tsx

// No changes needed for any of these files.`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          IMPORTS THAT NEED REPLACING
        </h3>
        <CodeBlock title="next.js-specific imports">{`// BEFORE: Next.js imports
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import Image from 'next/image'

// AFTER: fabrk equivalents
import { Link } from '@fabrk/framework/client'          // or standard <a>
import { useRouter, usePathname } from '@fabrk/framework/client'
import { headers, cookies } from '@fabrk/framework/server'
import { Image } from '@fabrk/framework/client'         // or standard <img>`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          SERVER ACTIONS
        </h3>
        <CodeBlock title="server actions — same syntax">{`// Server actions work the same way — same directive, same signature
'use server'

export async function createItem(formData: FormData) {
  const name = formData.get('name') as string
  // ... database call
  return { success: true }
}

// Client usage is identical too
'use client'
import { createItem } from './actions'

<form action={createItem}>
  <input name="name" />
  <button type="submit">{'>'} CREATE</button>
</form>`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          METADATA API
        </h3>
        <CodeBlock title="metadata — same export name">{`// Metadata export works identically
import type { Metadata } from '@fabrk/framework'

export const metadata: Metadata = {
  title: 'My App',
  description: 'Built with fabrk',
}

export default function Page() {
  return <main>...</main>
}`}</CodeBlock>

        <InfoCard title="KEY DIFFERENCES FROM NEXT.JS">
          <ul className="space-y-1 mt-1 list-disc list-inside">
            <li>Build toolchain: Vite 7 instead of webpack/Turbopack — faster cold starts and HMR</li>
            <li>No <code>next.config.ts</code> — use <code>fabrk.config.ts</code> instead</li>
            <li>No <code>next/font</code> — import fonts directly in CSS or via Vite plugins</li>
            <li>No Vercel-specific deployment primitives — fabrk targets any Node.js or edge host</li>
          </ul>
        </InfoCard>
      </Section>

      <Section title="MIGRATION CHECKLIST">
        <InfoCard title="STEP BY STEP">
          <ol className="space-y-2 mt-1 list-decimal list-inside">
            <li>Install core packages: @fabrk/core, @fabrk/config, @fabrk/components, @fabrk/design-system</li>
            <li>Create fabrk.config.ts at project root</li>
            <li>Replace <code>cn()</code> imports: <code>@/lib/utils</code> to <code>@fabrk/core</code></li>
            <li>Replace design system imports: <code>@/design-system</code> to <code>@fabrk/design-system</code></li>
            <li>Replace UI component imports: <code>@/components/ui/*</code> to <code>@fabrk/components</code></li>
            <li>Replace hardcoded colors with design tokens (bg-primary, text-foreground, etc.)</li>
            <li>Replace hardcoded border-radius with <code>mode.radius</code></li>
            <li>Add <code>&apos;use client&apos;</code> to components using <code>cn()</code> or interactivity</li>
            <li>Convert API-fetching components to callback props</li>
            <li>Replace direct SDK usage with FABRK adapters (payments, email, storage)</li>
            <li>Wire store adapters via <code>autoWire()</code> with <code>StoreOverrides</code></li>
            <li>Run the design system validation to catch remaining violations</li>
            <li>Run <code>pnpm build</code> to verify everything compiles</li>
          </ol>
        </InfoCard>
      </Section>

      <Section title="COMMON ISSUES">
        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          SERVER COMPONENT ERRORS
        </h3>
        <CodeBlock title="fix">{`// Error: cn() called in server component
// Solution: Add 'use client' directive at the top of the file

'use client'  // ← Add this

import { cn } from '@fabrk/core'
// ... component code`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          TYPE NAMING CONFLICTS
        </h3>
        <CodeBlock title="fix">{`// Error: Duplicate identifier 'Notification'
// When barrel-exporting, avoid conflicts with DOM types

// BEFORE:
export type { Notification } from './notification'

// AFTER: Use a specific name
export type { NotificationCenterItem } from './notification'`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          ZOD DEFAULT VALUES
        </h3>
        <CodeBlock title="fix">{`// When using fabrk.config.ts types in function parameters:

// Use FabrkConfigInput (keeps defaulted fields optional)
function setup(config: FabrkConfigInput) { ... }

// NOT FabrkConfig (all fields required — breaks callers)
function setup(config: FabrkConfig) { ... }  // ← Don't use for params`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          MISSING CSS VARIABLES
        </h3>
        <CodeBlock title="fix">{`/* If design tokens don't resolve, add CSS variables to globals.css */
/* The FABRK templates include these automatically */

@layer base {
  :root {
    --background: 0 0% 7%;
    --foreground: 0 0% 93%;
    --card: 0 0% 10%;
    --primary: 142 76% 45%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 15%;
    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 60%;
    --border: 0 0% 20%;
    --destructive: 0 84% 60%;
    --success: 142 76% 45%;
    --radius: 0rem;
    /* ... more tokens */
  }
}`}</CodeBlock>
      </Section>
    </DocLayout>
  )
}
