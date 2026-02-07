import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function CLIPage() {
  return (
    <DocLayout
      title="CLI REFERENCE"
      description="Command-line tools for scaffolding and development."
    >
      <Section title="CREATE-FABRK-APP">
        <p className="text-sm text-muted-foreground mb-4">
          Scaffold a new FABRK project with templates, Prisma schemas, and configuration.
        </p>
        <CodeBlock title="usage">{`npx create-fabrk-app <project-name> [options]

Options:
  --template <name>    Template to use (basic, ai-saas, dashboard)
  --help               Show help`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          TEMPLATES
        </h3>
        <div className="space-y-3">
          <InfoCard title="BASIC">
            Clean starting point with @fabrk/components, @fabrk/core, and @fabrk/design-system.
            Prisma schema with User, Account, Session models.
          </InfoCard>
          <InfoCard title="AI-SAAS">
            AI-powered SaaS with cost tracking, API keys, and streaming.
            Adds @fabrk/ai and @fabrk/config. Prisma schema includes ApiKey,
            AICostLog, Subscription, and CheckoutSession models.
          </InfoCard>
          <InfoCard title="DASHBOARD">
            Admin dashboard with teams, feature flags, webhooks, and audit logging.
            Full FABRK stack. Prisma schema includes Organization, OrgMember,
            FeatureFlag, AuditLog, Webhook, and Job models.
          </InfoCard>
        </div>
      </Section>

      <Section title="FABRK CLI">
        <p className="text-sm text-muted-foreground mb-4">
          Development CLI for FABRK projects. Run from your project root.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          FABRK DEV
        </h3>
        <CodeBlock>{`fabrk dev [options]

Start the Next.js development server with FABRK tooling.

Options:
  --port <number>    Port to use (default: 3000)
  --turbo            Enable Turbopack`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          FABRK BUILD
        </h3>
        <CodeBlock>{`fabrk build

Build the project for production. Runs next build.`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          FABRK LINT
        </h3>
        <CodeBlock>{`fabrk lint [path]

Check for FABRK design system compliance.

Checks:
  - Hardcoded colors (bg-blue-500, text-red-600, etc.)
  - Hardcoded border-radius (rounded-lg, rounded-xl, etc.)
  - Inline styles on components
  - dangerouslySetInnerHTML usage

Use design tokens instead:
  bg-primary, text-foreground, border-border, mode.radius`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          FABRK GENERATE
        </h3>
        <CodeBlock>{`fabrk generate <type> <name>

Scaffold FABRK-compliant code.

Types:
  component <Name>    Generate a React component with design tokens
  page <name>         Generate a Next.js page
  api <name>          Generate a Next.js API route

Examples:
  fabrk generate component MetricsCard
  fabrk generate page settings
  fabrk generate api webhooks`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          FABRK INFO
        </h3>
        <CodeBlock>{`fabrk info

Display project information:
  - Project name and version
  - Installed FABRK packages
  - fabrk.config.ts status`}</CodeBlock>
      </Section>
    </DocLayout>
  )
}
