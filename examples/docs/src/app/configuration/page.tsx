import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function ConfigurationPage() {
  return (
    <DocLayout
      title="CONFIGURATION"
      description="All 14 configuration sections with type-safe validation via Zod."
    >
      <InfoCard title="ZERO-CONFIG DEFAULTS">
        In development mode, FABRK automatically applies sensible defaults:
        console email adapter, local storage, in-memory rate limiting,
        notifications enabled, and feature flags enabled. You only need to
        configure what you want to customize.
      </InfoCard>

      <Section title="FRAMEWORK">
        <CodeBlock title="fabrk.config.ts">{`framework: {
  runtime: 'nextjs',       // Runtime: 'nextjs' (more coming)
  typescript: true,        // TypeScript enabled (default: true)
  srcDir: 'src',           // Source directory (default: 'src')
  database: 'prisma',      // Database: 'prisma' | 'drizzle' | 'none'
}`}</CodeBlock>
      </Section>

      <Section title="THEME">
        <CodeBlock title="fabrk.config.ts">{`theme: {
  system: 'terminal',     // Theme system: 'terminal' | 'swiss' | 'custom'
  colorScheme: 'green',   // Color scheme name
  radius: 'sharp',        // Border radius: 'sharp' | 'rounded' | 'pill'
}`}</CodeBlock>
      </Section>

      <Section title="AI">
        <CodeBlock title="fabrk.config.ts">{`ai: {
  costTracking: true,           // Enable cost tracking per API call
  validation: 'strict',         // 'strict' | 'warn' | 'off'
  providers: ['claude', 'openai'],  // AI providers to configure
  budget: {
    daily: 50,                  // Daily budget in USD
    monthly: 1000,              // Monthly budget in USD
  },
}`}</CodeBlock>
      </Section>

      <Section title="PAYMENTS">
        <CodeBlock title="fabrk.config.ts">{`payments: {
  adapter: 'stripe',            // 'stripe' | 'polar' | 'lemonsqueezy'
  mode: 'test',                 // 'test' | 'live'
  config: {
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
}`}</CodeBlock>
      </Section>

      <Section title="AUTH">
        <CodeBlock title="fabrk.config.ts">{`auth: {
  adapter: 'nextauth',          // 'nextauth' | 'custom'
  apiKeys: true,                // Enable API key authentication
  mfa: true,                    // Enable multi-factor authentication (TOTP)
  config: {
    providers: ['google', 'credentials'],
  },
}`}</CodeBlock>
      </Section>

      <Section title="EMAIL">
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
        </InfoCard>
      </Section>

      <Section title="STORAGE">
        <CodeBlock title="fabrk.config.ts">{`storage: {
  adapter: 's3',                // 's3' | 'r2' | 'local'
  config: {
    bucket: process.env.S3_BUCKET,
    region: process.env.AWS_REGION,
  },
}`}</CodeBlock>
      </Section>

      <Section title="SECURITY">
        <CodeBlock title="fabrk.config.ts">{`security: {
  csrf: true,                   // CSRF token protection
  csp: true,                    // Content Security Policy
  rateLimit: true,              // Rate limiting (in-memory or Upstash)
  auditLog: true,               // Tamper-proof audit logging
  headers: true,                // Security headers (HSTS, X-Frame-Options)
  cors: {
    origins: ['https://yourdomain.com'],
    methods: ['GET', 'POST'],
  },
}`}</CodeBlock>
      </Section>

      <Section title="NOTIFICATIONS">
        <CodeBlock title="fabrk.config.ts">{`notifications: {
  enabled: true,                // Enable notification system
  persistToDb: true,            // Persist to database (requires store)
}`}</CodeBlock>
      </Section>

      <Section title="TEAMS">
        <CodeBlock title="fabrk.config.ts">{`teams: {
  enabled: true,                // Enable team/org management
  maxMembers: 50,               // Max members per organization
}`}</CodeBlock>
      </Section>

      <Section title="FEATURE FLAGS">
        <CodeBlock title="fabrk.config.ts">{`featureFlags: {
  enabled: true,                // Enable feature flag system
}`}</CodeBlock>
      </Section>

      <Section title="WEBHOOKS">
        <CodeBlock title="fabrk.config.ts">{`webhooks: {
  enabled: true,                // Enable webhook system
  signing: true,                // HMAC-SHA256 signature verification
  retries: 3,                   // Retry failed deliveries
}`}</CodeBlock>
      </Section>

      <Section title="JOBS">
        <CodeBlock title="fabrk.config.ts">{`jobs: {
  enabled: true,                // Enable job queue
  concurrency: 5,               // Max concurrent jobs
  retries: 3,                   // Retry failed jobs
}`}</CodeBlock>
      </Section>

      <Section title="FULL EXAMPLE">
        <CodeBlock title="fabrk.config.ts">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  framework: { runtime: 'nextjs', typescript: true, srcDir: 'src' },
  theme: { system: 'terminal', colorScheme: 'green', radius: 'sharp' },
  ai: {
    costTracking: true,
    validation: 'strict',
    providers: ['claude', 'openai'],
    budget: { daily: 50, monthly: 1000 },
  },
  payments: { adapter: 'stripe', mode: 'test' },
  auth: { adapter: 'nextauth', apiKeys: true, mfa: true },
  email: { adapter: 'resend', from: 'hi@yourdomain.com' },
  storage: { adapter: 's3' },
  security: { csrf: true, csp: true, rateLimit: true, auditLog: true, headers: true },
  notifications: { enabled: true, persistToDb: true },
  teams: { enabled: true, maxMembers: 50 },
  featureFlags: { enabled: true },
  webhooks: { enabled: true, signing: true, retries: 3 },
  jobs: { enabled: true, concurrency: 5, retries: 3 },
})`}</CodeBlock>
      </Section>
    </DocLayout>
  )
}
