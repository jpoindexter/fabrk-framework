import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function GuidesPage() {
  return (
    <DocLayout
      title="GUIDES"
      description="Step-by-step guides for common integration patterns."
    >
      <Section id="auth" title="AUTHENTICATION SETUP">
        <p className="text-sm text-muted-foreground mb-4">
          Set up authentication with NextAuth, API keys, and MFA.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          1. CONFIGURE AUTH
        </h3>
        <CodeBlock title="fabrk.config.ts">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  auth: {
    adapter: 'nextauth',
    apiKeys: true,              // Enable API key auth
    mfa: true,                  // Enable TOTP MFA
    config: {
      providers: ['google', 'credentials'],
    },
  },
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. SET UP API KEYS
        </h3>
        <CodeBlock title="api/keys/route.ts">{`import { generateApiKey, hashApiKey } from '@fabrk/auth'

export async function POST(req: Request) {
  const { key, hash } = await generateApiKey('live')

  // Store hash in database, return key to user
  await db.apiKey.create({
    data: { hash, userId: session.user.id, name: 'Production' }
  })

  return Response.json({ key }) // fabrk_live_xxx
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. ENABLE MFA
        </h3>
        <CodeBlock title="settings/mfa.tsx">{`import { MfaSetupDialog, BackupCodesModal } from '@fabrk/components'

function MFASettings() {
  return (
    <>
      <MfaSetupDialog
        onSetup={async (secret) => {
          await api.post('/api/mfa/enable', { secret })
        }}
        renderQrCode={(uri) => <QRCode value={uri} />}
      />
      <BackupCodesModal
        codes={backupCodes}
        onRegenerate={() => api.post('/api/mfa/regenerate')}
      />
    </>
  )
}`}</CodeBlock>
      </Section>

      <Section id="payments" title="PAYMENTS INTEGRATION">
        <p className="text-sm text-muted-foreground mb-4">
          Integrate payments with Stripe, Polar, or Lemon Squeezy.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          1. CONFIGURE PAYMENTS
        </h3>
        <CodeBlock title="fabrk.config.ts">{`export default defineFabrkConfig({
  payments: {
    adapter: 'stripe',
    mode: 'test',
    config: {
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  },
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. CREATE CHECKOUT
        </h3>
        <CodeBlock title="api/checkout/route.ts">{`import { StripePaymentAdapter } from '@fabrk/payments'

const stripe = new StripePaymentAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
})

export async function POST(req: Request) {
  const { priceId } = await req.json()

  const checkout = await stripe.createCheckout({
    priceId,
    customerId: session.user.stripeCustomerId,
    successUrl: \`\${process.env.NEXTAUTH_URL}/success\`,
    cancelUrl: \`\${process.env.NEXTAUTH_URL}/pricing\`,
  })

  return Response.json({ url: checkout.url })
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. HANDLE WEBHOOKS
        </h3>
        <CodeBlock title="api/webhooks/stripe/route.ts">{`import { StripePaymentAdapter } from '@fabrk/payments'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  const event = await stripe.handleWebhook(body, signature)

  switch (event.type) {
    case 'checkout.session.completed':
      await db.subscription.create({ /* ... */ })
      break
    case 'customer.subscription.deleted':
      await db.subscription.update({ /* ... */ })
      break
  }

  return Response.json({ received: true })
}`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          4. PRICING UI
        </h3>
        <CodeBlock title="pricing/page.tsx">{`import { PricingCard } from '@fabrk/components'

const plans = [
  { name: 'Free', price: '$0', features: ['5 projects', '1GB storage'] },
  { name: 'Pro', price: '$29', features: ['Unlimited projects', '100GB storage'] },
]

function PricingPage() {
  return (
    <div className="grid grid-cols-2 gap-6">
      {plans.map(plan => (
        <PricingCard
          key={plan.name}
          title={plan.name}
          price={plan.price}
          features={plan.features}
          onSelect={() => checkout(plan)}
        />
      ))}
    </div>
  )
}`}</CodeBlock>
      </Section>

      <Section id="ai" title="AI INTEGRATION">
        <p className="text-sm text-muted-foreground mb-4">
          Add AI capabilities with cost tracking, streaming, and prompt management.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          1. CONFIGURE AI
        </h3>
        <CodeBlock title="fabrk.config.ts">{`export default defineFabrkConfig({
  ai: {
    costTracking: true,
    validation: 'strict',
    providers: ['claude', 'openai'],
    budget: { daily: 50, monthly: 1000 },
  },
})`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          2. LLM PROVIDER
        </h3>
        <CodeBlock title="use the unified LLM client">{`import { getLLMClient } from '@fabrk/ai'

const client = getLLMClient({
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250514',
})

const response = await client.chat([
  { role: 'user', content: 'Explain quantum computing in 3 sentences.' },
])`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          3. COST TRACKING
        </h3>
        <CodeBlock title="track AI costs per user">{`import { AICostTracker, InMemoryCostStore } from '@fabrk/ai'

const tracker = new AICostTracker(new InMemoryCostStore())

// Track usage after each API call
await tracker.track({
  userId: user.id,
  model: 'claude-sonnet-4-5-20250514',
  provider: 'anthropic',
  inputTokens: 150,
  outputTokens: 300,
  feature: 'chat',
})

// Check budget
const budget = await tracker.getBudgetStatus(user.id)
// { withinBudget: true, todaysCost: 0.23, percentUsed: 46 }`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          4. CHAT UI
        </h3>
        <CodeBlock title="build a chat interface">{`import { ChatInput, ChatMessageList, TokenCounter } from '@fabrk/components'
import { useCostTracking } from '@fabrk/core'

function AIChat({ messages, onSend }) {
  const { todaysCost, budget } = useCostTracking()

  return (
    <div className="flex flex-col h-full">
      <ChatMessageList messages={messages} />
      <TokenCounter used={todaysCost} limit={budget} />
      <ChatInput
        onSend={onSend}
        placeholder="Ask anything..."
      />
    </div>
  )
}`}</CodeBlock>
      </Section>

      <Section id="deployment" title="DEPLOYMENT">
        <p className="text-sm text-muted-foreground mb-4">
          Deploy your FABRK app to Vercel, Railway, or any Node.js host.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          VERCEL
        </h3>
        <CodeBlock>{`# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add STRIPE_SECRET_KEY`}</CodeBlock>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          DATABASE
        </h3>
        <CodeBlock>{`# Push Prisma schema to production database
pnpm dlx prisma migrate deploy

# For serverless, enable connection pooling:
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"`}</CodeBlock>

        <InfoCard title="PRODUCTION CHECKLIST">
          <ul className="space-y-1 mt-1">
            <li>Set <code>payments.mode: &apos;live&apos;</code> in config</li>
            <li>Set <code>security.headers: true</code> for HSTS + CSP</li>
            <li>Set <code>email.adapter: &apos;resend&apos;</code> (not console)</li>
            <li>Configure rate limiting with Upstash Redis</li>
            <li>Enable audit logging for compliance</li>
            <li>Set up Stripe webhook endpoint</li>
          </ul>
        </InfoCard>
      </Section>
    </DocLayout>
  )
}
