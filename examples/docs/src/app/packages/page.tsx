'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { DocLayout, Section, CodeBlock } from '@/components/doc-layout'

interface PackageInfo {
  id: string
  name: string
  description: string
  exports: string[]
  install: string
  example: string
}

const packages: PackageInfo[] = [
  {
    id: 'core',
    name: '@fabrk/core',
    description: 'Framework runtime — plugin system, hooks, providers, middleware, feature managers, and validation.',
    exports: [
      'createFabrk() / initFabrk()',
      'FabrkProvider',
      'useTeam(), useNotifications(), useFeatureFlag()',
      'useWebhooks(), useJobs()',
      'autoWire(), applyDevDefaults()',
      'createNotificationManager()',
      'createTeamManager(), InMemoryTeamStore',
      'createFeatureFlagManager()',
      'createWebhookManager()',
      'createJobQueue()',
      'Middleware presets (auth, rateLimit, cors, csrf)',
      'Validation (checkHardcodedColors, validateFile, generateReport)',
      'cn() utility',
    ],
    install: 'pnpm add @fabrk/core',
    example: `import { createFabrk, useTeam, useFeatureFlag } from '@fabrk/core'

// Initialize framework
const fabrk = createFabrk(config)

// Use in components
function Dashboard() {
  const { enabled, manager } = useTeam()
  const { enabled: showBeta } = useFeatureFlag('beta-ui')
  // ...
}`,
  },
  {
    id: 'components',
    name: '@fabrk/components',
    description: '70+ pre-built UI components with terminal aesthetic — forms, charts, admin, AI chat, and more.',
    exports: [
      'UI: Button, Card, Input, Badge, Dialog, Sheet, Tabs, etc.',
      'Charts: BarChart, LineChart, AreaChart, PieChart, DonutChart, Gauge, Sparkline, FunnelChart',
      'Data: DataTable, Heatmap, KPICard, StatCard, JSONViewer',
      'AI: ChatInput, ChatMessageList, ChatSidebar, TokenCounter, UsageBar',
      'Admin: AuditLog, AdminMetricsCard, SystemHealthWidget',
      'Security: MfaCard, MfaSetupDialog, BackupCodesModal',
      'Org: OrgSwitcher, MemberCard, TeamActivityFeed',
      'SEO: SchemaScript, Breadcrumbs',
      'Feedback: StarRating, NPSSurvey, FeedbackWidget',
      'ErrorBoundary, NotificationCenter, CookieConsent, OnboardingChecklist',
    ],
    install: 'pnpm add @fabrk/components',
    example: `import { Button, Card, BarChart, KPICard, Badge } from '@fabrk/components'

function MetricsPage() {
  return (
    <div className="grid gap-4">
      <KPICard title="REVENUE" value="$12,340" trend={12.5} />
      <Card className={cn("p-4", mode.radius)}>
        <BarChart data={chartData} />
      </Card>
      <Badge variant="default">[ACTIVE]</Badge>
      <Button>> VIEW DETAILS</Button>
    </div>
  )
}`,
  },
  {
    id: 'ai',
    name: '@fabrk/ai',
    description: 'AI toolkit — LLM providers, cost tracking, embeddings, streaming, prompt management, and testing.',
    exports: [
      'LLM: getLLMClient(), OpenAIClient, AnthropicClient, OllamaClient',
      'Chat: chatWithOpenAI(), chatWithClaude(), chat()',
      'Cost: AICostTracker, InMemoryCostStore, MODEL_PRICING',
      'Embeddings: getEmbeddingProvider(), cosineSimilarity(), findNearest()',
      'Streaming: parseStreamChunks(), createTextStream(), mergeStreams()',
      'Prompts: PromptBuilder, createPromptTemplate(), composePrompts()',
      'Validation: CodeValidator, validateCode(), isCodeSafe()',
      'Testing: AITest, testDoesNotThrow(), testReturnsType()',
      'Content: moderateContent(), generateImage(), textToSpeech(), speechToText()',
    ],
    install: 'pnpm add @fabrk/ai',
    example: `import { getLLMClient, AICostTracker, createPromptTemplate } from '@fabrk/ai'

const client = getLLMClient({ provider: 'anthropic', model: 'claude-sonnet-4-5-20250514' })
const tracker = new AICostTracker()

const summarize = createPromptTemplate({
  name: 'summarize',
  template: 'Summarize: {{content}}',
  variables: { content: '' },
})`,
  },
  {
    id: 'config',
    name: '@fabrk/config',
    description: 'Type-safe configuration builder with Zod validation. 12 config sections covering every feature.',
    exports: [
      'defineFabrkConfig() — Main config builder',
      'fabrkConfigSchema — Complete Zod schema',
      'Individual schemas: aiConfigSchema, designConfigSchema, etc.',
      'Types: FabrkConfig, AIConfig, DesignConfig, PaymentsConfig, etc.',
    ],
    install: 'pnpm add @fabrk/config',
    example: `import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  design: { theme: 'terminal', radius: 'sharp' },
  ai: { costTracking: true, budget: { daily: 50 } },
  notifications: { enabled: true },
})`,
  },
  {
    id: 'design-system',
    name: '@fabrk/design-system',
    description: 'Design tokens, themes, and the mode system. Runtime-dynamic via CSS variables.',
    exports: [
      'mode — Design mode object (radius, font, shadow, color, spacing, typography)',
      'ThemeProvider, useThemeContext(), ThemeScript',
      'primitives — Raw token values (colors, space, fonts)',
      'Chart colors: getChartColors(), getChartColor()',
      'Formatters: formatButtonText(), formatLabelText(), formatCardHeader()',
      'Theme utils: getActiveTheme(), getActiveThemeClasses()',
    ],
    install: 'pnpm add @fabrk/design-system',
    example: `import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'

// Use design tokens everywhere
<Card className={cn("border border-border", mode.radius)}>
  <h2 className={cn("uppercase", mode.font)}>
    {mode.cardHeader('TITLE')}
  </h2>
</Card>`,
  },
  {
    id: 'payments',
    name: '@fabrk/payments',
    description: 'Payment adapters for Stripe, Polar, and Lemon Squeezy. Provider-agnostic interface.',
    exports: [
      'StripePaymentAdapter — Checkout, webhooks, customer management',
      'PolarPaymentAdapter — Polar.sh integration',
      'LemonSqueezyPaymentAdapter — Lemon Squeezy integration',
      'InMemoryPaymentStore — Dev/testing store',
      'Types: PaymentStore, CheckoutOptions, CheckoutResult',
    ],
    install: 'pnpm add @fabrk/payments',
    example: `import { StripePaymentAdapter } from '@fabrk/payments'

const payments = new StripePaymentAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
})

const checkout = await payments.createCheckout({
  priceId: 'price_xxx',
  successUrl: '/success',
  cancelUrl: '/cancel',
})`,
  },
  {
    id: 'auth',
    name: '@fabrk/auth',
    description: 'Authentication — NextAuth adapter, API keys (SHA-256), MFA (TOTP RFC 6238 + backup codes).',
    exports: [
      'NextAuthAdapter — Session management',
      'API Keys: generateApiKey(), hashApiKey(), validateApiKey()',
      'MFA: generateTOTP(), verifyTOTP(), generateBackupCodes()',
      'Middleware: authMiddleware()',
      'InMemoryAuthStore — Dev/testing store',
    ],
    install: 'pnpm add @fabrk/auth',
    example: `import { generateApiKey, hashApiKey, verifyTOTP } from '@fabrk/auth'

// Generate API key (fabrk_live_xxx format)
const { key, hash } = await generateApiKey('live')

// Verify MFA token
const valid = verifyTOTP(token, secret)`,
  },
  {
    id: 'email',
    name: '@fabrk/email',
    description: 'Email delivery with Resend adapter. 4 built-in templates. Console adapter for development.',
    exports: [
      'ResendEmailAdapter — Production email delivery',
      'ConsoleEmailAdapter — Dev mode (logs to terminal)',
      'Templates: verification, reset, welcome, invite',
    ],
    install: 'pnpm add @fabrk/email',
    example: `import { ResendEmailAdapter } from '@fabrk/email'

const email = new ResendEmailAdapter({ apiKey: process.env.RESEND_API_KEY! })

await email.sendTemplate('welcome', {
  to: 'user@example.com',
  data: { name: 'Jason' },
})`,
  },
  {
    id: 'storage',
    name: '@fabrk/storage',
    description: 'File storage — S3, Cloudflare R2, and local filesystem adapters.',
    exports: [
      'S3StorageAdapter — AWS S3 uploads',
      'R2StorageAdapter — Cloudflare R2 (S3-compatible)',
      'LocalStorageAdapter — Filesystem storage for dev',
      'File validation and signed URL generation',
    ],
    install: 'pnpm add @fabrk/storage',
    example: `import { S3StorageAdapter } from '@fabrk/storage'

const storage = new S3StorageAdapter({
  bucket: process.env.S3_BUCKET!,
  region: 'us-east-1',
})

const url = await storage.upload(file, { path: 'uploads/' })`,
  },
  {
    id: 'security',
    name: '@fabrk/security',
    description: 'Security — CSRF, CSP, rate limiting, audit logging, GDPR, bot protection, CORS.',
    exports: [
      'CSRF: generateCsrfToken(), verifyCsrfToken()',
      'CSP: generateNonce(), buildCSP()',
      'Rate limiting: MemoryRateLimiter, UpstashRateLimiter',
      'Audit: AuditLogger with tamper-proof hashing',
      'GDPR: compliance helpers',
      'Bot protection, CORS configuration, security headers',
    ],
    install: 'pnpm add @fabrk/security',
    example: `import { generateCsrfToken, AuditLogger, MemoryRateLimiter } from '@fabrk/security'

const csrf = generateCsrfToken()
const limiter = new MemoryRateLimiter({ max: 100, window: '1m' })
const audit = new AuditLogger()

await audit.log({ action: 'user.login', userId, ip })`,
  },
  {
    id: 'mcp',
    name: '@fabrk/mcp',
    description: 'Model Context Protocol utilities — tool helpers, schema builders, and server patterns.',
    exports: [
      'MCP tool definition helpers',
      'Schema builders for tool parameters',
      'Server implementation patterns',
    ],
    install: 'pnpm add @fabrk/mcp',
    example: `import { defineTool, createSchema } from '@fabrk/mcp'

const searchTool = defineTool({
  name: 'search',
  description: 'Search the knowledge base',
  schema: createSchema({ query: 'string', limit: 'number?' }),
  handler: async ({ query, limit }) => { /* ... */ },
})`,
  },
]

export default function PackagesPage() {
  return (
    <DocLayout
      title="PACKAGES"
      description="14 modular packages covering every aspect of full-stack development."
    >
      {/* Package index */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12">
        {packages.map((pkg) => (
          <a
            key={pkg.id}
            href={`#${pkg.id}`}
            className={cn(
              'block border border-border bg-card p-3 transition-colors hover:border-primary hover:bg-primary/5',
              mode.radius
            )}
          >
            <div className={cn('text-xs font-bold text-primary', mode.font)}>
              {pkg.name}
            </div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {pkg.description.split(' — ')[0]}
            </div>
          </a>
        ))}
      </div>

      {/* Package details */}
      {packages.map((pkg) => (
        <Section key={pkg.id} id={pkg.id} title={pkg.name}>
          <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>

          <CodeBlock title="install">{pkg.install}</CodeBlock>

          <div className="mb-4">
            <div className={cn('text-xs font-bold text-foreground uppercase mb-2', mode.font)}>
              EXPORTS
            </div>
            <ul className="space-y-1">
              {pkg.exports.map((exp, i) => (
                <li key={i} className="text-xs text-muted-foreground">
                  <span className="text-primary mr-2">{'>'}</span>
                  {exp}
                </li>
              ))}
            </ul>
          </div>

          <CodeBlock title="example">{pkg.example}</CodeBlock>
        </Section>
      ))}
    </DocLayout>
  )
}
