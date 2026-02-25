'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

const packages = [
  { name: '@fabrk/config', description: 'Zod schemas, type-safe config builder' },
  { name: '@fabrk/design-system', description: '18 themes, design tokens, mode object' },
  { name: '@fabrk/core', description: 'Plugins, middleware, hooks, teams, jobs, feature flags' },
  { name: '@fabrk/ai', description: 'LLM providers, cost tracking, embeddings, streaming' },
  { name: '@fabrk/auth', description: 'NextAuth, API keys, MFA (TOTP + backup codes)' },
  { name: '@fabrk/components', description: '105+ UI components, charts, AI chat, admin' },
  { name: '@fabrk/email', description: 'Resend adapter, console adapter, 4 templates' },
  { name: '@fabrk/payments', description: 'Stripe, Polar, Lemon Squeezy adapters' },
  { name: '@fabrk/security', description: 'CSRF, CSP, rate limiting, audit, GDPR, CORS' },
  { name: '@fabrk/storage', description: 'S3, Cloudflare R2, local filesystem' },
  { name: '@fabrk/store-prisma', description: 'Prisma store adapters for 7 entity types' },
]

const quickReference = [
  {
    name: '@fabrk/core',
    description: 'Framework runtime, plugins, middleware, teams, jobs, feature flags',
    exports: [
      { name: 'autoWire', kind: 'function', description: 'Auto-wire adapters + stores from config' },
      { name: 'applyDevDefaults', kind: 'function', description: 'Zero-config dev defaults' },
      { name: 'createFabrk / initFabrk', kind: 'function', description: 'Initialize the framework' },
      { name: 'FabrkProvider', kind: 'component', description: 'Root React context provider' },
      { name: 'cn', kind: 'function', description: 'Tailwind class merge utility' },
      { name: 'createMiddleware / compose', kind: 'function', description: 'Composable middleware chain' },
      { name: 'createNotificationManager', kind: 'function', description: 'Notification system manager' },
      { name: 'createTeamManager', kind: 'function', description: 'Team / org management' },
      { name: 'createFeatureFlagManager', kind: 'function', description: 'Feature flag evaluation' },
      { name: 'createWebhookManager', kind: 'function', description: 'Webhook dispatch manager' },
      { name: 'createJobQueue', kind: 'function', description: 'Background job queue' },
      { name: 'createComponentRegistry', kind: 'function', description: 'Component validation registry' },
    ],
  },
  {
    name: '@fabrk/auth',
    description: 'NextAuth adapter, API keys, MFA (TOTP + backup codes)',
    exports: [
      { name: 'createNextAuthAdapter', kind: 'function', description: 'NextAuth integration adapter' },
      { name: 'generateApiKey / hashApiKey', kind: 'function', description: 'API key generation (SHA-256)' },
      { name: 'createApiKeyValidator', kind: 'function', description: 'Validate API keys against store' },
      { name: 'generateTotpSecret', kind: 'function', description: 'Generate TOTP secret (RFC 6238)' },
      { name: 'generateTotpUri', kind: 'function', description: 'Generate otpauth:// URI for QR codes' },
      { name: 'verifyTotp', kind: 'function', description: 'Verify a TOTP code' },
      { name: 'generateBackupCodes / verifyBackupCode', kind: 'function', description: 'MFA backup code management' },
      { name: 'withAuth / withApiKey / withAuthOrApiKey', kind: 'middleware', description: 'Auth middleware guards' },
    ],
  },
  {
    name: '@fabrk/payments',
    description: 'Stripe, Polar, Lemon Squeezy payment adapters',
    exports: [
      { name: 'createStripeAdapter', kind: 'function', description: 'Stripe checkout, subscriptions, webhooks' },
      { name: 'createPolarAdapter', kind: 'function', description: 'Polar open-source monetization' },
      { name: 'createLemonSqueezyAdapter', kind: 'function', description: 'Lemon Squeezy payment integration' },
      { name: 'InMemoryPaymentStore', kind: 'class', description: 'In-memory store for dev/testing' },
    ],
  },
  {
    name: '@fabrk/ai',
    description: 'LLM providers, cost tracking, embeddings, streaming, prompts',
    exports: [
      { name: 'chatWithOpenAI / chatWithClaude / chat', kind: 'function', description: 'LLM chat completions (streaming supported)' },
      { name: 'getLLMClient', kind: 'function', description: 'Unified LLM client (OpenAI, Anthropic, Ollama)' },
      { name: 'AICostTracker / getCostTracker', kind: 'class', description: 'Track and budget AI spend per feature' },
      { name: 'PromptBuilder', kind: 'class', description: 'Fluent prompt construction' },
      { name: 'createPromptTemplate / composePrompts', kind: 'function', description: 'Reusable prompt templates' },
      { name: 'generateEmbeddings / cosineSimilarity', kind: 'function', description: 'Vector embeddings and similarity' },
      { name: 'createTextStream / mergeStreams', kind: 'function', description: 'Streaming response utilities' },
      { name: 'createAIMiddleware / budgetEnforcement', kind: 'function', description: 'AI request middleware and budget limits' },
    ],
  },
  {
    name: '@fabrk/security',
    description: 'CSRF, CSP, rate limiting, audit logging, GDPR, bot protection, CORS',
    exports: [
      { name: 'createCsrfProtection', kind: 'function', description: 'CSRF token generation and validation' },
      { name: 'generateCspHeader / generateNonce', kind: 'function', description: 'Content Security Policy headers' },
      { name: 'getSecurityHeaders / applySecurityHeaders', kind: 'function', description: 'Security header collection' },
      { name: 'createMemoryRateLimiter', kind: 'function', description: 'In-memory rate limiting' },
      { name: 'createUpstashRateLimiter', kind: 'function', description: 'Upstash Redis rate limiting' },
      { name: 'createAuditLogger', kind: 'function', description: 'Structured audit event logging' },
      { name: 'createConsentManager', kind: 'function', description: 'GDPR consent tracking' },
      { name: 'anonymizeEmail / anonymizeIp / redactFields', kind: 'function', description: 'GDPR data anonymization' },
      { name: 'detectBot / validateHoneypot', kind: 'function', description: 'Bot detection utilities' },
      { name: 'createCorsHandler', kind: 'function', description: 'CORS policy handler' },
      { name: 'escapeHtml / sanitizeUrl / sanitizeSqlInput', kind: 'function', description: 'Input validation and sanitization' },
    ],
  },
]

export default function ApiReferencePage() {
  return (
    <DocLayout
      title="API REFERENCE"
      description="Auto-generated TypeScript API documentation for all 12 packages. Generated with TypeDoc from JSDoc annotations and TypeScript types."
    >
      <Section title="QUICK REFERENCE">
        <p className="text-sm text-muted-foreground mb-6">
          Key exports from each major package. All functions and classes are fully typed with TypeScript and documented with JSDoc.
        </p>
        <div className="space-y-4">
          {quickReference.map((pkg) => (
            <InfoCard key={pkg.name} title={pkg.name}>
              <p className="mb-3 text-xs text-muted-foreground">{pkg.description}</p>
              <div className={cn('border border-border divide-y divide-border', mode.radius)}>
                {pkg.exports.map((exp) => (
                  <div key={exp.name} className="flex items-start gap-3 px-3 py-2">
                    <code className={cn('text-xs text-primary font-bold whitespace-nowrap shrink-0', mode.font)}>
                      {exp.name}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      {exp.description}
                    </span>
                  </div>
                ))}
              </div>
            </InfoCard>
          ))}
        </div>
      </Section>

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
