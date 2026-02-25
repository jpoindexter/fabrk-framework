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
    id: 'config',
    name: '@fabrk/config',
    description: 'Type-safe configuration builder with Zod validation. 12 config sections covering every feature. Foundational package with zero dependencies.',
    exports: [
      'defineFabrkConfig() — Main config builder with autocomplete',
      'fabrkConfigSchema — Complete Zod schema for validation',
      'Individual schemas: frameworkConfigSchema, themeConfigSchema, aiConfigSchema, etc.',
      'Types: FabrkConfig, FabrkConfigInput, FrameworkConfig, ThemeConfig, AIConfig',
      'PaymentsConfig, AuthConfig, EmailConfig, StorageConfig, SecurityConfig',
    ],
    install: 'pnpm add @fabrk/config',
    example: `import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  framework: { runtime: 'nextjs', typescript: true, srcDir: 'src' },
  theme: { system: 'terminal', colorScheme: 'green', radius: 'sharp' },
  ai: { costTracking: true, budget: { daily: 50 } },
  notifications: { enabled: true },
  teams: { enabled: true, maxMembers: 50 },
})`,
  },
  {
    id: 'design-system',
    name: '@fabrk/design-system',
    description: 'Foundational design system with 18 themes. Design tokens, CSS variables, and the mode system. Runtime-dynamic theme switching. Zero dependencies.',
    exports: [
      'mode — Design mode object (radius, font, shadow, color, spacing, typography)',
      'themes — All 18 built-in themes',
      'designTokens — Semantic color tokens (bg-primary, text-foreground, etc.)',
      'primitives — Raw token values (colors, space, fonts)',
      'applyTheme() — Runtime theme switching via CSS variables',
      'getThemeNames() — List all available themes',
      'ThemeProvider, useThemeContext(), ThemeScript — Theme context & SSR',
      'Chart colors: getChartColors(), getChartColor()',
      'Formatters: formatButtonText(), formatLabelText(), formatCardHeader()',
    ],
    install: 'pnpm add @fabrk/design-system',
    example: `import { mode } from '@fabrk/design-system'

// mode.radius        — border radius class (e.g., 'rounded-dynamic')
// mode.font          — font family class (e.g., 'font-body')
// mode.textTransform — text casing ('uppercase' | 'normal')

// Full borders ALWAYS get mode.radius
<Card className={cn("border border-border", mode.radius)}>

// Partial borders NEVER get mode.radius
<div className="border-t border-border">`,
  },
  {
    id: 'core',
    name: '@fabrk/core',
    description: 'Framework runtime — plugin system, hooks, providers, middleware, feature managers, auto-wiring, and validation. Depends on config and design-system.',
    exports: [
      'createFabrk() / initFabrk() — Initialize framework runtime',
      'autoWire(config, adapters?, stores?) — Create adapters from config',
      'applyDevDefaults(config) — Apply zero-config dev defaults',
      'FabrkProvider — React context provider',
      'useTeam(), useNotifications(), useFeatureFlag() — Feature hooks',
      'useWebhooks(), useJobs() — System hooks',
      'createNotificationManager(), createTeamManager() — Feature managers',
      'createFeatureFlagManager(), createWebhookManager(), createJobQueue()',
      'InMemoryTeamStore, InMemoryNotificationStore, InMemoryFlagStore',
      'Middleware presets: auth, rateLimit, cors, csrf',
      'Validation: checkHardcodedColors(), validateFile(), generateReport()',
      'cn() — Tailwind class merge utility',
      'StoreOverrides type — Inject Prisma stores into autoWire()',
    ],
    install: 'pnpm add @fabrk/core',
    example: `import { autoWire, applyDevDefaults, cn } from '@fabrk/core'
import config from '../fabrk.config'

// Auto-wire all adapters from config
const fabrk = autoWire(applyDevDefaults(config))

// Use hooks in components
function Dashboard() {
  const { enabled, manager } = useTeam()
  const { enabled: showBeta } = useFeatureFlag('beta-ui')
  if (showBeta) return <BetaDashboard />
  return <StandardDashboard />
}`,
  },
  {
    id: 'components',
    name: '@fabrk/components',
    description: '105+ pre-built UI components with terminal aesthetic. Forms, charts, data display, AI chat, admin, security, organization, feedback, SEO, and more.',
    exports: [
      'Forms: Button, Input, InputGroup, InputNumber, InputOTP, InputPassword, InputSearch, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, DatePicker, Calendar, Form, Label',
      'Layout: Card, Container, Separator, ScrollArea, Sidebar, Tabs, StyledTabs, Accordion',
      'Charts: BarChart, LineChart, AreaChart, PieChart, DonutChart, FunnelChart, Gauge, Sparkline',
      'Data: DataTable, Table, KPICard, StatCard, Badge, Tag, Avatar, Heatmap, JSONViewer, Pagination, EmptyState, Breadcrumb',
      'Feedback: Alert, AlertDialog, Dialog, Sheet, Toaster, Loading, TerminalSpinner, Progress, AsciiProgressBar, StatusPulse, Typewriter, StarRating, NPSSurvey, FeedbackWidget, ErrorBoundary',
      'Navigation: Command, DropdownMenu, Popover, Tooltip, SegmentedControl',
      'AI: ChatInput, ChatMessageList, ChatSidebar, TokenCounter, UsageBar, LogStream',
      'Admin: AuditLog, AdminMetricsCard, SystemHealthWidget, NotificationCenter, NotificationBadge, NotificationList',
      'Security: MfaCard, MfaSetupDialog, BackupCodesModal, CookieConsent',
      'Org: OrgSwitcher, MemberCard, TeamActivityFeed',
      'Marketing: PricingCard, UpgradeCTA, OnboardingChecklist, SchemaScript, SimpleIcon',
    ],
    install: 'pnpm add @fabrk/components',
    example: `import {
  Button, Card, Badge, KPICard, BarChart,
  DataTable, ChatInput, MfaCard, PricingCard
} from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

function MetricsPage() {
  return (
    <div className="grid gap-4">
      <KPICard title="REVENUE" value="$12,340" trend={12.5} />
      <Card className={cn("p-4 border border-border", mode.radius)}>
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
    description: 'AI toolkit — LLM providers, cost tracking with stores, embeddings, streaming, prompt management, content moderation, and testing utilities.',
    exports: [
      'LLM: getLLMClient(), OpenAIClient, AnthropicClient, OllamaClient',
      'Chat: chatWithOpenAI(), chatWithClaude(), chat()',
      'Cost: AICostTracker, InMemoryCostStore, MODEL_PRICING, CostStore interface',
      'Embeddings: getEmbeddingProvider(), cosineSimilarity(), findNearest()',
      'Streaming: parseStreamChunks(), createTextStream(), mergeStreams()',
      'Prompts: PromptBuilder, createPromptTemplate(), composePrompts()',
      'Content: moderateContent(), generateImage(), textToSpeech(), speechToText()',
    ],
    install: 'pnpm add @fabrk/ai',
    example: `import { getLLMClient, AICostTracker, InMemoryCostStore } from '@fabrk/ai'

const client = getLLMClient({ provider: 'anthropic', model: 'claude-sonnet-4-5-20250514' })
const tracker = new AICostTracker(new InMemoryCostStore())

const response = await client.chat([
  { role: 'user', content: 'Explain quantum computing in 3 sentences.' },
])

// Track cost automatically
await tracker.track({
  userId: 'user_123', model: 'claude-sonnet-4-5-20250514',
  provider: 'anthropic', inputTokens: 12, outputTokens: 85, feature: 'chat',
})`,
  },
  {
    id: 'payments',
    name: '@fabrk/payments',
    description: 'Payment adapters for Stripe, Polar, and Lemon Squeezy. Provider-agnostic interface for checkout, webhooks, customer management, and subscriptions.',
    exports: [
      'StripePaymentAdapter — Checkout, webhooks, customer management',
      'PolarPaymentAdapter — Polar.sh integration',
      'LemonSqueezyPaymentAdapter — Lemon Squeezy integration',
      'InMemoryPaymentStore — Dev/testing store',
      'Types: PaymentStore, CheckoutOptions, CheckoutResult, SubscriptionStatus',
    ],
    install: 'pnpm add @fabrk/payments',
    example: `import { StripePaymentAdapter } from '@fabrk/payments'

const payments = new StripePaymentAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
})

// Create a checkout session
const checkout = await payments.createCheckout({
  priceId: 'price_xxx',
  customerId: user.stripeCustomerId,
  successUrl: '/success',
  cancelUrl: '/cancel',
})

// Handle webhooks
const event = await payments.handleWebhook(body, signature)`,
  },
  {
    id: 'auth',
    name: '@fabrk/auth',
    description: 'Authentication — NextAuth adapter with real session retrieval, API keys (SHA-256 hashed, fabrk_ prefix), MFA (TOTP RFC 6238 + backup codes).',
    exports: [
      'NextAuthAdapter — Session management with authInstance config',
      'API Keys: generateApiKey(), hashApiKey(), validateApiKey()',
      'MFA: generateTOTP(), verifyTOTP(), generateBackupCodes(), verifyBackupCode()',
      'Middleware: authMiddleware()',
      'InMemoryAuthStore — Dev/testing store',
      'Types: AuthStore, ApiKeyRecord, TOTPSecret',
    ],
    install: 'pnpm add @fabrk/auth',
    example: `import { generateApiKey, hashApiKey, verifyTOTP } from '@fabrk/auth'

// Generate API key (fabrk_live_xxx format)
const { key, hash } = await generateApiKey('live')
// key = "fabrk_live_a1b2c3..." (show to user once)
// hash = "sha256:..." (store in database)

// Validate API key from request
const isValid = await validateApiKey(requestKey, storedHash)

// Verify MFA TOTP token
const valid = verifyTOTP(token, secret)  // RFC 6238 compliant`,
  },
  {
    id: 'email',
    name: '@fabrk/email',
    description: 'Email delivery with Resend adapter and console adapter for development. 4 built-in templates: verification, reset, welcome, invite.',
    exports: [
      'ResendEmailAdapter — Production email delivery via Resend API',
      'ConsoleEmailAdapter — Dev mode (logs to terminal instead of sending)',
      'Templates: verification, reset, welcome, invite',
      'Types: EmailAdapter, EmailOptions, EmailTemplate',
    ],
    install: 'pnpm add @fabrk/email',
    example: `import { ResendEmailAdapter, ConsoleEmailAdapter } from '@fabrk/email'

// Production
const email = new ResendEmailAdapter({
  apiKey: process.env.RESEND_API_KEY!,
  from: 'noreply@yourdomain.com',
})

// Development (logs to terminal)
const devEmail = new ConsoleEmailAdapter()

// Send a template
await email.sendTemplate('welcome', {
  to: 'user@example.com',
  data: { name: 'Jason', loginUrl: 'https://app.example.com' },
})`,
  },
  {
    id: 'storage',
    name: '@fabrk/storage',
    description: 'File storage — S3, Cloudflare R2 (S3-compatible), and local filesystem adapters. File validation and signed URL generation.',
    exports: [
      'S3StorageAdapter — AWS S3 uploads and signed URLs',
      'R2StorageAdapter — Cloudflare R2 (S3-compatible API)',
      'LocalStorageAdapter — Filesystem storage for development',
      'File validation: validateFileSize(), validateFileType()',
      'Signed URL generation for secure downloads',
      'Types: StorageAdapter, UploadOptions, StorageResult',
    ],
    install: 'pnpm add @fabrk/storage',
    example: `import { S3StorageAdapter, LocalStorageAdapter } from '@fabrk/storage'

// Production: S3
const storage = new S3StorageAdapter({
  bucket: process.env.S3_BUCKET!,
  region: 'us-east-1',
})

// Development: local filesystem
const devStorage = new LocalStorageAdapter({ basePath: './uploads' })

// Upload a file
const url = await storage.upload(file, {
  path: 'uploads/',
  maxSize: 10 * 1024 * 1024, // 10MB
})

// Generate signed download URL
const signedUrl = await storage.getSignedUrl(key, { expiresIn: 3600 })`,
  },
  {
    id: 'security',
    name: '@fabrk/security',
    description: 'Security — CSRF tokens, CSP headers, rate limiting (in-memory + Upstash), audit logging with tamper-proof hashing, GDPR helpers, bot protection, CORS.',
    exports: [
      'CSRF: generateCsrfToken(), verifyCsrfToken()',
      'CSP: generateNonce(), buildCSP()',
      'Rate limiting: MemoryRateLimiter, UpstashRateLimiter',
      'Audit: AuditLogger with tamper-proof chain hashing',
      'GDPR: compliance helpers, data export, data deletion',
      'Bot protection: detectBot(), challengeBot()',
      'CORS: configureCors(), CorsOptions',
      'Security headers: applySecurityHeaders()',
    ],
    install: 'pnpm add @fabrk/security',
    example: `import {
  generateCsrfToken, AuditLogger, MemoryRateLimiter
} from '@fabrk/security'

// CSRF protection
const csrf = generateCsrfToken()

// Rate limiting (100 requests per minute)
const limiter = new MemoryRateLimiter({ max: 100, window: '1m' })
const allowed = await limiter.check(ip)

// Tamper-proof audit logging
const audit = new AuditLogger()
await audit.log({
  action: 'user.login',
  userId: 'user_123',
  ip: '192.168.1.1',
  metadata: { method: 'oauth', provider: 'google' },
})`,
  },
  {
    id: 'store-prisma',
    name: '@fabrk/store-prisma',
    description: '7 Prisma store adapters that implement core store interfaces. Connects FABRK features to a real PostgreSQL database via Prisma ORM.',
    exports: [
      'PrismaTeamStore — Team/org CRUD with member management',
      'PrismaApiKeyStore — API key storage and validation',
      'PrismaAuditStore — Tamper-proof audit log persistence',
      'PrismaNotificationStore — Notification CRUD and read status',
      'PrismaJobStore — Job queue persistence and status tracking',
      'PrismaWebhookStore — Webhook endpoint management',
      'PrismaFeatureFlagStore — Feature flag CRUD and evaluation',
      'Example Prisma schema included in package',
    ],
    install: 'pnpm add @fabrk/store-prisma',
    example: `import {
  PrismaTeamStore, PrismaAuditStore,
  PrismaApiKeyStore, PrismaFeatureFlagStore
} from '@fabrk/store-prisma'
import { autoWire } from '@fabrk/core'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Inject Prisma stores via StoreOverrides
const fabrk = autoWire(config, undefined, {
  teamStore: new PrismaTeamStore(prisma),
  auditStore: new PrismaAuditStore(prisma),
  apiKeyStore: new PrismaApiKeyStore(prisma),
  featureFlagStore: new PrismaFeatureFlagStore(prisma),
})`,
  },
]

export default function PackagesPage() {
  return (
    <DocLayout
      title="PACKAGES"
      description="12 modular packages covering every aspect of full-stack development. Install only what you need."
    >
      {/* Dependency diagram */}
      <Section title="DEPENDENCY ARCHITECTURE">
        <p className="text-sm text-muted-foreground mb-4">
          Dependencies flow from foundational packages outward. Install only the packages you need &mdash;
          each is independently versioned and published to npm.
        </p>
        <CodeBlock title="dependency flow">{`@fabrk/config (foundational — Zod schemas, no deps)
@fabrk/design-system (foundational — themes, no deps)
    |
    v
@fabrk/core (depends on config, design-system)
    |
    v
@fabrk/payments, @fabrk/auth, @fabrk/email,
@fabrk/storage, @fabrk/security (depend on core)
    |
    v
@fabrk/ai (depends on core)
@fabrk/components (depends on core, design-system)
@fabrk/store-prisma (depends on core)
    |
    v
Templates & Examples (depend on all packages)`}</CodeBlock>
      </Section>

      {/* Package index */}
      <Section title="ALL PACKAGES">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
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
      </Section>

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
