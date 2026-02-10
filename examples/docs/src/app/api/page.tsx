'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

const packages = [
  { name: '@fabrk/config', description: 'Zod schemas, type-safe config builder' },
  { name: '@fabrk/design-system', description: '18 themes, design tokens, mode object' },
  { name: '@fabrk/core', description: 'Plugins, middleware, hooks, teams, jobs, feature flags' },
  { name: '@fabrk/ai', description: 'LLM providers, cost tracking, embeddings, streaming' },
  { name: '@fabrk/auth', description: 'NextAuth, API keys, MFA (TOTP + backup codes)' },
  { name: '@fabrk/components', description: '105+ UI components, charts, AI chat, admin' },
  { name: '@fabrk/email', description: 'Resend adapter, console adapter, 4 templates' },
  { name: '@fabrk/mcp', description: 'Model Context Protocol server toolkit' },
  { name: '@fabrk/payments', description: 'Stripe, Polar, Lemon Squeezy adapters' },
  { name: '@fabrk/referrals', description: 'Referral system' },
  { name: '@fabrk/security', description: 'CSRF, CSP, rate limiting, audit, GDPR, CORS' },
  { name: '@fabrk/storage', description: 'S3, Cloudflare R2, local filesystem' },
  { name: '@fabrk/store-prisma', description: 'Prisma store adapters for 7 entity types' },
  { name: '@fabrk/themes', description: 'Opt-in theming layer with runtime switching' },
]

export default function ApiReferencePage() {
  return (
    <DocLayout
      title="API REFERENCE"
      description="Auto-generated TypeScript API documentation for all 14 packages. Generated with TypeDoc from JSDoc annotations and TypeScript types."
    >
      <Section title="GENERATE LOCALLY">
        <p className="text-sm text-muted-foreground mb-4">
          The API reference is generated from source code using TypeDoc. Run it locally to browse the full documentation:
        </p>
        <CodeBlock title="generate api docs">{`# Generate markdown API docs
pnpm docs:api

# Output is written to docs/api/
# Browse docs/api/README.md for the index`}</CodeBlock>
        <InfoCard title="NOTE">
          Generated docs include all exported functions, interfaces, types, and classes with their JSDoc descriptions and @example blocks.
        </InfoCard>
      </Section>

      <Section title="PACKAGES">
        <div className={cn('border border-border divide-y divide-border', mode.radius)}>
          {packages.map((pkg) => (
            <div key={pkg.name} className="flex items-center justify-between px-4 py-3">
              <span className={cn('text-sm font-bold text-foreground', mode.font)}>
                {pkg.name}
              </span>
              <span className="text-xs text-muted-foreground text-right max-w-xs">
                {pkg.description}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="TYPEDOC CONFIG">
        <p className="text-sm text-muted-foreground mb-4">
          The TypeDoc configuration lives at <code className="text-primary">typedoc.json</code> in the repository root.
          It uses the <code className="text-primary">packages</code> entry point strategy to document all workspace packages.
        </p>
        <CodeBlock title="typedoc.json (key options)">{`{
  "entryPointStrategy": "packages",
  "entryPoints": ["packages/config", "packages/core", ...],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "skipErrorChecking": true,
  "excludePrivate": true
}`}</CodeBlock>
      </Section>
    </DocLayout>
  )
}
