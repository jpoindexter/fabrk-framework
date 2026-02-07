import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function GettingStartedPage() {
  return (
    <DocLayout
      title="GETTING STARTED"
      description="Create your first FABRK app in under 5 minutes."
    >
      <Section title="PREREQUISITES">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Node.js 22 or later</li>
          <li>pnpm 9 or later</li>
        </ul>
      </Section>

      <Section title="CREATE A NEW APP">
        <p className="text-sm text-muted-foreground mb-4">
          The fastest way to start is with the CLI scaffolding tool:
        </p>
        <CodeBlock title="terminal">{`npx create-fabrk-app my-app

# Choose a template:
#   basic      — Clean starting point
#   ai-saas    — AI-powered SaaS with cost tracking
#   dashboard  — Admin dashboard with teams & feature flags`}</CodeBlock>

        <CodeBlock title="start development">{`cd my-app
pnpm install
pnpm dev`}</CodeBlock>

        <p className="text-sm text-muted-foreground">
          Open <code>http://localhost:3000</code> to see your app.
        </p>
      </Section>

      <Section title="PROJECT STRUCTURE">
        <CodeBlock>{`my-app/
  app/
    layout.tsx         # Root layout with FabrkProvider
    page.tsx           # Home page
    api/               # API routes
    globals.css        # Global styles + CSS variables
  fabrk.config.ts      # FABRK configuration (like next.config.js)
  prisma/
    schema.prisma      # Database schema (template-specific)
  .env.example         # Environment variables`}</CodeBlock>
      </Section>

      <Section title="CONFIGURATION">
        <p className="text-sm text-muted-foreground mb-4">
          Every FABRK app has a <code>fabrk.config.ts</code> at the project root.
          This is where you enable features, configure adapters, and set design tokens.
        </p>
        <CodeBlock title="fabrk.config.ts">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  design: { theme: 'terminal', radius: 'sharp' },
  notifications: { enabled: true },
  teams: { enabled: true, maxMembers: 50 },
  featureFlags: { enabled: true },
})`}</CodeBlock>

        <InfoCard title="TYPE SAFETY">
          <code>defineFabrkConfig()</code> provides full TypeScript autocomplete
          and Zod validation for all 12 config sections.
        </InfoCard>
      </Section>

      <Section title="USING COMPONENTS">
        <p className="text-sm text-muted-foreground mb-4">
          Import pre-built components instead of building from scratch:
        </p>
        <CodeBlock title="app/page.tsx">{`import { Button, Card, KPICard, Badge } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export default function Dashboard() {
  return (
    <div className="grid gap-4 p-6">
      <KPICard title="REVENUE" value="$12,340" trend={12.5} />
      <Card className={cn("p-4", mode.radius)}>
        <Badge variant="default">[ACTIVE]</Badge>
        <Button className="mt-4">> VIEW DETAILS</Button>
      </Card>
    </div>
  )
}`}</CodeBlock>
      </Section>

      <Section title="USING HOOKS">
        <p className="text-sm text-muted-foreground mb-4">
          FABRK provides hooks for common app features:
        </p>
        <CodeBlock title="feature hooks">{`import {
  useTeam,
  useNotifications,
  useFeatureFlag,
  useWebhooks,
  useJobs,
} from '@fabrk/core'

function MyComponent() {
  const { enabled: teamsEnabled, manager: teamManager } = useTeam()
  const { manager: notifyManager } = useNotifications()
  const { enabled: showBeta, isLoading } = useFeatureFlag('beta-dashboard')

  if (showBeta) return <BetaDashboard />
  return <Dashboard />
}`}</CodeBlock>
      </Section>

      <Section title="USING THE CLI">
        <p className="text-sm text-muted-foreground mb-4">
          The <code>fabrk</code> CLI helps with development workflows:
        </p>
        <CodeBlock title="cli commands">{`# Start dev server with FABRK tooling
fabrk dev

# Build for production
fabrk build

# Check design system compliance
fabrk lint

# Generate scaffolding
fabrk generate component MetricsCard
fabrk generate page settings
fabrk generate api webhooks

# Show project info
fabrk info`}</CodeBlock>
      </Section>

      <Section title="NEXT STEPS">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard title="CONFIGURATION">
            Learn about all 12 config sections — from AI budgets to security headers.
          </InfoCard>
          <InfoCard title="PACKAGES">
            Explore the 14 packages — payments, auth, email, storage, security, and more.
          </InfoCard>
          <InfoCard title="COMPONENTS">
            Browse 70+ components — charts, forms, admin panels, AI chat, and more.
          </InfoCard>
          <InfoCard title="GUIDES">
            Step-by-step guides for auth, payments, AI integration, and deployment.
          </InfoCard>
        </div>
      </Section>
    </DocLayout>
  )
}
