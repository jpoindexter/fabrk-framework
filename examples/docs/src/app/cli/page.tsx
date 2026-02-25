import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'
import { STATS } from '@/data/stats'

export default function CLIPage() {
  return (
    <DocLayout
      title="CLI REFERENCE"
      description="Two command-line tools: create-fabrk-app for scaffolding and fabrk for development workflows."
    >
      <Section title="CREATE-FABRK-APP">
        <p className="text-sm text-muted-foreground mb-4">
          Scaffold a new FABRK project with templates, Prisma schemas, configuration,
          and all FABRK packages pre-configured. Ships as an npm package.
        </p>
        <CodeBlock title="usage">{`npx create-fabrk-app <project-name> [options]

Options:
  --template <name>    Template to use (basic, ai-saas, dashboard)
  --help               Show help

Examples:
  npx create-fabrk-app my-app
  npx create-fabrk-app my-saas --template ai-saas
  npx create-fabrk-app admin --template dashboard`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-8 mb-3">
          TEMPLATES
        </h3>

        <InfoCard title="BASIC">
          Clean starting point with <code>@fabrk/core</code> and optional <code>@fabrk/design-system</code>.
          <ul className="space-y-1 mt-2">
            <li>Prisma schema: User, Account, Session models</li>
            <li>Minimal <code>fabrk.config.ts</code> with framework and theme sections</li>
            <li>Home page with FABRK component imports</li>
            <li>Good for: personal projects, learning FABRK</li>
          </ul>
        </InfoCard>

        <InfoCard title="AI-SAAS">
          AI-powered SaaS with cost tracking, API keys, and streaming.
          <ul className="space-y-1 mt-2">
            <li>Adds <code>@fabrk/ai</code>, <code>@fabrk/auth</code>, <code>@fabrk/config</code></li>
            <li>Prisma schema: User, Account, Session, ApiKey, AICostLog, Subscription, CheckoutSession</li>
            <li>Full config with AI budget, auth, and payments sections</li>
            <li>Chat interface page with <code>ChatInput</code>, <code>ChatMessageList</code></li>
            <li>API key management with <code>generateApiKey()</code></li>
            <li>Good for: AI SaaS products, chatbots, API platforms</li>
          </ul>
        </InfoCard>

        <InfoCard title="DASHBOARD">
          Admin dashboard with teams, feature flags, webhooks, and audit logging.
          <ul className="space-y-1 mt-2">
            <li>Full FABRK stack (all packages installed)</li>
            <li>Prisma schema: User, Account, Session, Organization, OrgMember, FeatureFlag, AuditLog, Webhook, Job, Notification</li>
            <li>Dashboard page with <code>KPICard</code>, <code>BarChart</code>, <code>DataTable</code></li>
            <li>Settings page with MFA, team management, notifications</li>
            <li>Auto-wiring with <code>StoreOverrides</code> for Prisma stores</li>
            <li>Good for: admin tools, internal dashboards, multi-tenant apps</li>
          </ul>
        </InfoCard>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-8 mb-3">
          WHAT GETS GENERATED
        </h3>
        <CodeBlock title="project structure (dashboard template)">{`my-app/
├── src/
│   └── app/
│       ├── layout.tsx           # Root layout with FabrkProvider
│       ├── page.tsx             # Landing page
│       ├── dashboard/
│       │   └── page.tsx         # Dashboard with KPIs, charts, tables
│       ├── settings/
│       │   └── page.tsx         # Settings: MFA, team, notifications
│       ├── api/
│       │   ├── webhooks/
│       │   │   └── stripe/
│       │   │       └── route.ts # Stripe webhook handler
│       │   └── keys/
│       │       └── route.ts     # API key CRUD
│       └── globals.css          # CSS variables + design tokens
├── src/lib/
│   └── fabrk.ts                 # autoWire() setup with stores
├── prisma/
│   └── schema.prisma            # Full schema with all models
├── fabrk.config.ts              # Complete FABRK config
├── package.json                 # All @fabrk/* packages
├── .env.example                 # Environment variable template
├── tsconfig.json
└── next.config.js`}</CodeBlock>
      </Section>

      <Section title="FABRK DEV CLI">
        <p className="text-sm text-muted-foreground mb-4">
          Development CLI for FABRK projects. Provides dev server, build, lint,
          code generation, and project info commands. Run from your project root.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-8 mb-3">
          FABRK DEV
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Start the Next.js development server with FABRK tooling.
          Validates your <code>fabrk.config.ts</code> on startup and reports any issues.
        </p>
        <CodeBlock>{`fabrk dev [options]

Options:
  --port <number>    Port to use (default: 3000)
  --turbo            Enable Turbopack for faster HMR

Examples:
  fabrk dev
  fabrk dev --port 4000
  fabrk dev --turbo`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-8 mb-3">
          FABRK BUILD
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Build the project for production. Runs <code>next build</code> with FABRK optimizations.
        </p>
        <CodeBlock>{`fabrk build

# Equivalent to: next build
# Also validates fabrk.config.ts at build time`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-8 mb-3">
          FABRK LINT
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Check for FABRK design system compliance. Scans your source files
          for violations and reports them with suggestions.
        </p>
        <CodeBlock>{`fabrk lint [path]

Checks:
  - Hardcoded colors (bg-blue-500, text-red-600, etc.)
  - Hardcoded border-radius (rounded-lg, rounded-xl, etc.)
  - Missing mode.radius on full borders
  - Inline styles on components
  - dangerouslySetInnerHTML usage

Fix suggestions:
  bg-blue-500     → bg-primary
  text-white      → text-primary-foreground
  rounded-lg      → mode.radius
  text-gray-500   → text-muted-foreground

Examples:
  fabrk lint                     # Lint entire project
  fabrk lint src/app/dashboard   # Lint specific directory
  fabrk lint src/components      # Lint components folder`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-8 mb-3">
          FABRK GENERATE
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Scaffold FABRK-compliant code with proper imports, design tokens,
          and terminal aesthetic already applied.
        </p>
        <CodeBlock>{`fabrk generate <type> <name>

Types:
  component <Name>    Generate a React component with design tokens
  page <name>         Generate a Next.js App Router page
  api <name>          Generate a Next.js API route handler

Examples:
  fabrk generate component MetricsCard
  fabrk generate component UserProfile
  fabrk generate page settings
  fabrk generate page dashboard/analytics
  fabrk generate api webhooks
  fabrk generate api users`}</CodeBlock>

        <CodeBlock title="generated component example">{`// fabrk generate component MetricsCard
// Creates: src/components/metrics-card.tsx

'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { Card } from '@fabrk/components'

interface MetricsCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function MetricsCard({ title, children, className }: MetricsCardProps) {
  return (
    <Card className={cn('border border-border p-4', mode.radius, className)}>
      <h3 className={cn('text-xs font-bold text-muted-foreground uppercase mb-3', mode.font)}>
        [{title}]
      </h3>
      {children}
    </Card>
  )
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-8 mb-3">
          FABRK INFO
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Display project information including installed FABRK packages,
          config status, and active features.
        </p>
        <CodeBlock>{`fabrk info

Output:
  Project: my-app v${STATS.version}
  Runtime: nextjs
  Config:  fabrk.config.ts (valid)

  Packages:
    @fabrk/core         ${STATS.version}
    @fabrk/components   ${STATS.version}
    @fabrk/design-system       ${STATS.version}
    @fabrk/auth         ${STATS.version}
    @fabrk/payments     ${STATS.version}
    @fabrk/ai           ${STATS.version}

  Features:
    teams:          enabled
    notifications:  enabled
    featureFlags:   enabled
    webhooks:       enabled
    jobs:           enabled`}</CodeBlock>
      </Section>

      <Section title="E2E TESTING">
        <p className="text-sm text-muted-foreground mb-4">
          The CLI package includes 53 end-to-end tests covering scaffolding, templates,
          file generation, and configuration validation. Tests verify that all templates
          produce valid, buildable projects.
        </p>
        <CodeBlock title="run CLI tests">{`cd packages/cli
pnpm test

# 53 tests across scaffolding, generation, and validation
# Tests verify:
#   - All 3 templates scaffold correctly
#   - Generated files have correct imports
#   - fabrk.config.ts validates successfully
#   - Prisma schemas are valid
#   - package.json has correct dependencies`}</CodeBlock>
      </Section>
    </DocLayout>
  )
}
