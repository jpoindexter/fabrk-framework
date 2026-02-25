import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function ConfigurationPage() {
  return (
    <DocLayout
      title="CONFIGURATION"
      description="All 12 configuration sections with type-safe validation via Zod. Convention-based: fabrk.config.ts at your project root."
    >
      <InfoCard title="HOW IT WORKS">
        Every FABRK app has a <code>fabrk.config.ts</code> at the project root, like{' '}
        <code>next.config.js</code>. The <code>defineFabrkConfig()</code> function provides
        full TypeScript autocomplete and Zod validation. Use <code>autoWire()</code> to create
        all adapters from your config automatically.
      </InfoCard>

      <InfoCard title="ZERO-CONFIG DEFAULTS">
        In development mode, <code>applyDevDefaults()</code> automatically applies sensible defaults:
        console email adapter, local storage, in-memory rate limiting,
        notifications enabled, and feature flags enabled. You only need to
        configure what you want to customize.
      </InfoCard>

      <Section title="AUTO-WIRING">
        <p className="text-sm text-muted-foreground mb-4">
          FABRK reads your config and creates all adapters automatically via <code>autoWire()</code>.
          You can also inject custom stores via <code>StoreOverrides</code>.
        </p>
        <CodeBlock title="src/lib/fabrk.ts">{`import { autoWire, applyDevDefaults } from '@fabrk/core'
import { PrismaTeamStore, PrismaAuditStore } from '@fabrk/store-prisma'
import { PrismaClient } from '@prisma/client'
import config from '../../fabrk.config'

const prisma = new PrismaClient()

// Apply dev defaults in development
const resolvedConfig = process.env.NODE_ENV === 'development'
  ? applyDevDefaults(config)
  : config

// autoWire(config, adapterOverrides?, storeOverrides?)
export const fabrk = autoWire(resolvedConfig, undefined, {
  teamStore: new PrismaTeamStore(prisma),
  auditStore: new PrismaAuditStore(prisma),
})

// Access all adapters
export const { email, storage, payments, auth, security } = fabrk`}</CodeBlock>
      </Section>

      <Section title="FRAMEWORK">
        <p className="text-sm text-muted-foreground mb-4">
          Core framework settings: runtime, TypeScript, source directory, and database ORM.
        </p>
        <CodeBlock title="fabrk.config.ts">{`framework: {
  runtime: 'nextjs',       // Runtime: 'nextjs' (more coming)
  typescript: true,        // TypeScript enabled (default: true)
  srcDir: 'src',           // Source directory (default: 'src')
  database: 'prisma',      // Database: 'prisma' | 'drizzle' | 'none'
}`}</CodeBlock>
      </Section>

      <Section title="THEME">
        <p className="text-sm text-muted-foreground mb-4">
          Design system configuration. Controls the visual theme, color scheme, and border radius
          applied to all components. 18 built-in themes available.
        </p>
        <CodeBlock title="fabrk.config.ts">{`theme: {
  system: 'terminal',     // Theme system: 'terminal' | 'swiss' | 'custom'
  colorScheme: 'green',   // Color scheme name (varies by system)
  radius: 'sharp',        // Border radius: 'sharp' | 'rounded' | 'pill'
}

// The 'mode' object from @fabrk/design-system or @fabrk/design-system
// provides runtime access to theme values:
//   mode.radius        → 'rounded-dynamic'
//   mode.font          → 'font-body'
//   mode.textTransform → 'uppercase' | 'normal'`}</CodeBlock>
      </Section>

      <Section title="AI">
        <p className="text-sm text-muted-foreground mb-4">
          AI provider configuration, cost tracking, and budget limits. Works with
          the <code>@fabrk/ai</code> package.
        </p>
        <CodeBlock title="fabrk.config.ts">{`ai: {
  costTracking: true,           // Enable cost tracking per API call
  validation: 'strict',         // 'strict' | 'warn' | 'off'
  providers: ['claude', 'openai'],  // AI providers to configure
  budget: {
    daily: 50,                  // Daily budget in USD
    monthly: 1000,              // Monthly budget in USD
  },
}`}</CodeBlock>
        <InfoCard title="COST TRACKING">
          When <code>costTracking</code> is enabled, the <code>AICostTracker</code> from{' '}
          <code>@fabrk/ai</code> records token usage and costs for every API call.
          Use <code>InMemoryCostStore</code> for development or{' '}
          <code>PrismaCostStore</code> (from <code>@fabrk/ai</code>) for production.
        </InfoCard>
      </Section>

      <Section title="PAYMENTS">
        <p className="text-sm text-muted-foreground mb-4">
          Payment adapter configuration. Supports Stripe, Polar, and Lemon Squeezy via
          the <code>@fabrk/payments</code> package.
        </p>
        <CodeBlock title="fabrk.config.ts">{`payments: {
  adapter: 'stripe',            // 'stripe' | 'polar' | 'lemonsqueezy'
  mode: 'test',                 // 'test' | 'live'
  config: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
}`}</CodeBlock>
        <InfoCard title="PRODUCTION">
          Set <code>mode: &apos;live&apos;</code> when deploying to production.
          Always configure <code>webhookSecret</code> for secure webhook verification.
        </InfoCard>
      </Section>

      <Section title="AUTH">
        <p className="text-sm text-muted-foreground mb-4">
          Authentication configuration. NextAuth adapter provides session management.
          API keys use SHA-256 hashing with <code>fabrk_</code> prefix format.
          MFA uses TOTP (RFC 6238) with backup codes.
        </p>
        <CodeBlock title="fabrk.config.ts">{`auth: {
  adapter: 'nextauth',          // 'nextauth' | 'custom'
  apiKeys: true,                // Enable API key authentication
  mfa: true,                    // Enable multi-factor authentication (TOTP)
  config: {
    providers: ['google', 'credentials'],
    // NextAuth adapter accepts your auth() function for real session retrieval
    auth: authInstance,         // Optional: pass your NextAuth auth() function
  },
}`}</CodeBlock>
      </Section>

      <Section title="EMAIL">
        <p className="text-sm text-muted-foreground mb-4">
          Email delivery adapter. Resend for production, console adapter for development
          (logs emails to terminal). 4 built-in templates: verification, reset, welcome, invite.
        </p>
        <CodeBlock title="fabrk.config.ts">{`email: {
  adapter: 'resend',            // 'resend' | 'console' | 'custom'
  from: 'noreply@yourdomain.com',
  config: {
    apiKey: process.env.RESEND_API_KEY,
  },
}`}</CodeBlock>
        <InfoCard title="DEV DEFAULT">
          In development, email defaults to the <code>console</code> adapter
          which logs emails to your terminal instead of sending them.
          No API key required for local development.
        </InfoCard>
      </Section>

      <Section title="STORAGE">
        <p className="text-sm text-muted-foreground mb-4">
          File storage adapter. S3 for production, R2 for Cloudflare, local filesystem for development.
        </p>
        <CodeBlock title="fabrk.config.ts">{`storage: {
  adapter: 's3',                // 's3' | 'r2' | 'local'
  config: {
    bucket: process.env.S3_BUCKET,
    region: process.env.AWS_REGION,
    // For R2:
    // accountId: process.env.CF_ACCOUNT_ID,
    // accessKeyId: process.env.R2_ACCESS_KEY_ID,
    // secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
}`}</CodeBlock>
      </Section>

      <Section title="SECURITY">
        <p className="text-sm text-muted-foreground mb-4">
          Comprehensive security configuration. CSRF, CSP, rate limiting, audit logging,
          security headers, CORS, and GDPR compliance.
        </p>
        <CodeBlock title="fabrk.config.ts">{`security: {
  csrf: true,                   // CSRF token protection
  csp: true,                    // Content Security Policy
  rateLimit: true,              // Rate limiting (in-memory or Upstash)
  auditLog: true,               // Tamper-proof audit logging
  headers: true,                // Security headers (HSTS, X-Frame-Options, etc.)
  cors: {
    origins: ['https://yourdomain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
}`}</CodeBlock>
        <InfoCard title="RATE LIMITING">
          In development, rate limiting uses <code>MemoryRateLimiter</code>.
          For production, configure <code>UpstashRateLimiter</code> with Redis
          for distributed rate limiting across serverless functions.
        </InfoCard>
      </Section>

      <Section title="NOTIFICATIONS">
        <p className="text-sm text-muted-foreground mb-4">
          In-app notification system. Works with <code>NotificationCenter</code> components
          from <code>@fabrk/components</code>.
        </p>
        <CodeBlock title="fabrk.config.ts">{`notifications: {
  enabled: true,                // Enable notification system
  persistToDb: true,            // Persist to database (requires store)
}

// Usage in components:
// const { manager } = useNotifications()
// await manager.send({ userId, title: 'Deployed', body: '...' })
// await manager.markRead(notificationId)`}</CodeBlock>
      </Section>

      <Section title="TEAMS">
        <p className="text-sm text-muted-foreground mb-4">
          Team and organization management. Create orgs, invite members,
          manage roles and permissions.
        </p>
        <CodeBlock title="fabrk.config.ts">{`teams: {
  enabled: true,                // Enable team/org management
  maxMembers: 50,               // Max members per organization
}

// Usage:
// const { enabled, manager } = useTeam()
// await manager.createTeam({ name: 'Engineering' })
// await manager.inviteMember(teamId, { email, role: 'member' })
// await manager.removeMember(teamId, userId)`}</CodeBlock>
      </Section>

      <Section title="FEATURE FLAGS">
        <p className="text-sm text-muted-foreground mb-4">
          Feature flag system for gradual rollouts and A/B testing.
          Uses <code>InMemoryFlagStore</code> in dev, <code>PrismaFeatureFlagStore</code> in production.
        </p>
        <CodeBlock title="fabrk.config.ts">{`featureFlags: {
  enabled: true,                // Enable feature flag system
}

// Usage in components:
// const { enabled, isLoading } = useFeatureFlag('beta-dashboard')
// if (enabled) return <BetaDashboard />
// return <StandardDashboard />`}</CodeBlock>
      </Section>

      <Section title="WEBHOOKS">
        <p className="text-sm text-muted-foreground mb-4">
          Outbound webhook system with HMAC-SHA256 signing and automatic retries.
        </p>
        <CodeBlock title="fabrk.config.ts">{`webhooks: {
  enabled: true,                // Enable webhook system
  signing: true,                // HMAC-SHA256 signature verification
  retries: 3,                   // Retry failed deliveries
}

// Usage:
// const { manager } = useWebhooks()
// await manager.register({ url: 'https://...', events: ['user.created'] })
// await manager.trigger('user.created', { userId, email })`}</CodeBlock>
      </Section>

      <Section title="JOBS">
        <p className="text-sm text-muted-foreground mb-4">
          Background job queue with concurrency control and automatic retries.
        </p>
        <CodeBlock title="fabrk.config.ts">{`jobs: {
  enabled: true,                // Enable job queue
  concurrency: 5,               // Max concurrent jobs
  retries: 3,                   // Retry failed jobs
}

// Usage:
// const { queue } = useJobs()
// await queue.add('send-email', { to: 'user@...', template: 'welcome' })
// await queue.add('sync-stripe', { customerId: '...' }, { priority: 'high' })`}</CodeBlock>
      </Section>

      <Section title="FULL EXAMPLE">
        <p className="text-sm text-muted-foreground mb-4">
          A complete <code>fabrk.config.ts</code> with all sections configured.
          Remember: you only need to include sections for features you use.
        </p>
        <CodeBlock title="fabrk.config.ts">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  // Core framework
  framework: {
    runtime: 'nextjs',
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

  // AI
  ai: {
    costTracking: true,
    validation: 'strict',
    providers: ['claude', 'openai'],
    budget: { daily: 50, monthly: 1000 },
  },

  // Payments
  payments: {
    adapter: 'stripe',
    mode: 'test',
    config: {
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  },

  // Auth
  auth: {
    adapter: 'nextauth',
    apiKeys: true,
    mfa: true,
    config: {
      providers: ['google', 'credentials'],
    },
  },

  // Email
  email: {
    adapter: 'resend',
    from: 'hi@yourdomain.com',
    config: {
      apiKey: process.env.RESEND_API_KEY,
    },
  },

  // Storage
  storage: {
    adapter: 's3',
    config: {
      bucket: process.env.S3_BUCKET,
      region: process.env.AWS_REGION,
    },
  },

  // Security
  security: {
    csrf: true,
    csp: true,
    rateLimit: true,
    auditLog: true,
    headers: true,
    cors: {
      origins: ['https://yourdomain.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  },

  // Features
  notifications: { enabled: true, persistToDb: true },
  teams: { enabled: true, maxMembers: 50 },
  featureFlags: { enabled: true },
  webhooks: { enabled: true, signing: true, retries: 3 },
  jobs: { enabled: true, concurrency: 5, retries: 3 },
})`}</CodeBlock>
      </Section>

      <Section title="TYPES">
        <p className="text-sm text-muted-foreground mb-4">
          All config types are exported from <code>@fabrk/config</code> for use in your application.
        </p>
        <CodeBlock title="type imports">{`import type {
  FabrkConfig,          // Full resolved config (after Zod defaults)
  FabrkConfigInput,     // Config input (before defaults — use for function params)
  FrameworkConfig,
  ThemeConfig,
  AIConfig,
  PaymentsConfig,
  AuthConfig,
  EmailConfig,
  StorageConfig,
  SecurityConfig,
  NotificationConfig,
  TeamConfig,
  FeatureFlagConfig,
  WebhookConfig,
  JobConfig,
} from '@fabrk/config'

// Tip: Use FabrkConfigInput for function parameters (keeps defaulted fields optional)
// Use FabrkConfig for internal logic (all fields guaranteed present)`}</CodeBlock>
      </Section>
    </DocLayout>
  )
}
