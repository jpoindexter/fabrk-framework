'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function PaymentsTutorialPage() {
  return (
    <DocLayout
      title="STRIPE PAYMENTS"
      description="Add Stripe payments to your FABRK app in 6 steps. Checkout sessions, webhooks, subscriptions, and a pricing page — all copy-paste ready."
    >
      <InfoCard title="WHAT YOU WILL BUILD">
        A complete Stripe integration with a checkout API route, webhook handler for
        subscription events, and a terminal-style pricing page using the PricingCard
        component. Estimated time: 15 minutes.
      </InfoCard>

      {/* STEP 1 — INSTALL */}
      <Section title="STEP 1 — INSTALL">
        <p className="text-sm text-muted-foreground mb-4">
          Install <code className="text-primary">@fabrk/payments</code> and the Stripe SDK,
          then add your keys to <code className="text-primary">.env.local</code>.
        </p>
        <CodeBlock title="terminal">{`pnpm add @fabrk/payments @fabrk/components stripe`}</CodeBlock>
        <CodeBlock title=".env.local">{`STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
APP_URL="http://localhost:5173"`}</CodeBlock>
      </Section>

      {/* STEP 2 — STRIPE ADAPTER */}
      <Section title="STEP 2 — STRIPE ADAPTER">
        <p className="text-sm text-muted-foreground mb-4">
          Create a shared adapter instance using <code className="text-primary">createStripeAdapter</code>.
          This implements the <code className="text-primary">PaymentAdapter</code> interface from
          {' '}<code className="text-primary">@fabrk/core</code>.
        </p>
        <CodeBlock title="src/lib/payments.ts">{`import { createStripeAdapter } from '@fabrk/payments'

export const payments = createStripeAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
})

// Unified interface:
//   payments.createCheckout(options)   — Create a checkout session
//   payments.handleWebhook(body, sig)  — Verify and parse webhooks
//   payments.getCustomer(id)           — Fetch customer info
//   payments.getSubscription(id)       — Fetch subscription info
//   payments.cancelSubscription(id)    — Cancel a subscription
//   payments.createPortalSession(id)   — Open Stripe billing portal`}</CodeBlock>
        <InfoCard title="ADAPTER PATTERN">
          FABRK uses the adapter pattern for all external services. You can swap
          {' '}<code className="text-primary">createStripeAdapter</code> for
          {' '}<code className="text-primary">createPolarAdapter</code> or
          {' '}<code className="text-primary">createLemonSqueezyAdapter</code> without
          changing any application code.
        </InfoCard>
      </Section>

      {/* STEP 3 — CHECKOUT */}
      <Section title="STEP 3 — CHECKOUT">
        <p className="text-sm text-muted-foreground mb-4">
          Create an API route that generates a Stripe checkout session. The adapter
          handles mode detection (subscription vs one-time) and optional trial periods.
        </p>
        <CodeBlock title="app/api/checkout/route.ts">{`import { payments } from '../../../lib/payments'

export async function POST(req: Request) {
  try {
    const { priceId, customerEmail } = await req.json()

    const checkout = await payments.createCheckout({
      priceId,
      customerEmail,
      subscription: true,
      trialDays: 14,
      successUrl: \`\${process.env.APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}\`,
      cancelUrl: \`\${process.env.APP_URL}/pricing\`,
      metadata: { source: 'pricing-page' },
    })

    return new Response(JSON.stringify({ url: checkout.url }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[CHECKOUT] Error creating session:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}`}</CodeBlock>
        <InfoCard title="TIP">
          Set <code className="text-primary">subscription: true</code> for recurring payments
          or omit it for one-time charges. The <code className="text-primary">trialDays</code> option
          automatically adds a free trial period.
        </InfoCard>
      </Section>

      {/* STEP 4 — WEBHOOKS */}
      <Section title="STEP 4 — WEBHOOKS">
        <p className="text-sm text-muted-foreground mb-4">
          Handle Stripe events with a webhook endpoint. The adapter verifies the
          signature and parses the payload automatically.
        </p>
        <CodeBlock title="app/api/webhooks/stripe/route.ts">{`import { payments } from '../../../lib/payments'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing signature' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await payments.handleWebhook(body, signature)
  if (!result.verified) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const { type, data } = result.event!

  switch (type) {
    case 'checkout.session.completed':
      console.log('[WEBHOOK] Checkout completed:', (data as any).customer)
      break
    case 'customer.subscription.deleted':
      console.log('[WEBHOOK] Subscription canceled:', data.id)
      break
    case 'invoice.payment_failed':
      console.log('[WEBHOOK] Payment failed:', data.id)
      break
    default:
      console.log('[WEBHOOK] Unhandled event:', type)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}`}</CodeBlock>
        <p className="text-sm text-muted-foreground mt-3">
          Test locally with the Stripe CLI:
        </p>
        <CodeBlock title="terminal">{`stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed`}</CodeBlock>
      </Section>

      {/* STEP 5 — PRICING PAGE */}
      <Section title="STEP 5 — PRICING PAGE">
        <p className="text-sm text-muted-foreground mb-4">
          Build a pricing page using the <code className="text-primary">PricingCard</code> component.
          The card follows the terminal aesthetic with bracket notation headers and UPPERCASE labels.
        </p>
        <CodeBlock title="src/app/pricing/page.tsx">{`'use client'

import { PricingCard } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { useState } from 'react'

const plans = [
  {
    id: 'starter', title: 'STARTER PLAN', price: '$19',
    priceId: 'price_starter_monthly', headerCode: '0x01',
    highlights: ['5 PROJECTS', 'BASIC ANALYTICS', 'EMAIL SUPPORT'],
  },
  {
    id: 'pro', title: 'PRO PLAN', price: '$49',
    priceId: 'price_pro_monthly', headerCode: '0x02',
    urgencyMessage: 'MOST POPULAR',
    highlights: ['UNLIMITED PROJECTS', 'ADVANCED ANALYTICS', 'PRIORITY SUPPORT'],
  },
  {
    id: 'enterprise', title: 'ENTERPRISE PLAN', price: '$149',
    priceId: 'price_enterprise_monthly', headerCode: '0x03',
    highlights: ['EVERYTHING IN PRO', 'CUSTOM INTEGRATIONS', 'SLA GUARANTEE'],
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(priceId: string) {
    setLoading(priceId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const { url } = await res.json()
      window.location.href = url
    } catch (error) {
      console.error('[CHECKOUT] Error:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className={cn('text-2xl font-bold text-foreground uppercase', mode.font)}>
            CHOOSE YOUR PLAN
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Start with a 14-day free trial. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              title={plan.title}
              price={plan.price}
              priceSubtext="PER MONTH"
              headerCode={plan.headerCode}
              urgencyMessage={plan.urgencyMessage}
              highlights={plan.highlights}
              trustLine="14-DAY FREE TRIAL INCLUDED"
            >
              <button
                onClick={() => handleCheckout(plan.priceId)}
                disabled={loading === plan.priceId}
                className={cn(
                  'w-full border border-primary bg-primary text-primary-foreground',
                  'py-3 text-xs font-bold uppercase tracking-wider',
                  'hover:bg-primary/90 transition-colors disabled:opacity-50',
                  mode.radius, mode.font,
                )}
              >
                {loading === plan.priceId ? '> PROCESSING...' : '> GET STARTED'}
              </button>
            </PricingCard>
          ))}
        </div>
      </div>
    </div>
  )
}`}</CodeBlock>
        <InfoCard title="DESIGN RULE">
          PricingCard applies mode.radius and terminal styling internally. The CTA button
          is passed as children, giving you full control over the checkout action. Button
          text uses UPPERCASE with the &gt; prefix following the terminal aesthetic.
        </InfoCard>
      </Section>

      {/* STEP 6 — COMPLETE EXAMPLE */}
      <Section title="COMPLETE EXAMPLE">
        <p className="text-sm text-muted-foreground mb-4">
          Full file structure for a working Stripe integration. Each file is shown in steps 2-5 above.
        </p>
        <CodeBlock title="project layout">{`src/
├── lib/
│   └── payments.ts              # Shared Stripe adapter (step 2)
├── app/
│   ├── api/
│   │   ├── checkout/
│   │   │   └── route.ts         # POST — create checkout session (step 3)
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts     # POST — handle Stripe events (step 4)
│   └── pricing/
│       └── page.tsx             # Pricing page with PricingCard (step 5)`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-6 mb-3', mode.font)}>
          BILLING PORTAL (BONUS)
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Let existing customers manage their subscription via the Stripe billing portal.
        </p>
        <CodeBlock title="app/api/portal/route.ts">{`import { payments } from '../../lib/payments'

export async function POST(req: Request) {
  const { customerId } = await req.json()

  const portalUrl = await payments.createPortalSession(
    customerId,
    \`\${process.env.APP_URL}/dashboard\`
  )

  return new Response(JSON.stringify({ url: portalUrl }), {
    headers: { 'Content-Type': 'application/json' },
  })
}`}</CodeBlock>

        <InfoCard title="NEXT STEPS">
          <ul className="space-y-1 mt-1">
            <li>Store customer data with <code className="text-primary">InMemoryPaymentStore</code> (dev) or a Prisma store (production)</li>
            <li>Swap to <code className="text-primary">createPolarAdapter</code> or <code className="text-primary">createLemonSqueezyAdapter</code> for alternative providers</li>
            <li>Add authentication with the <a href="/tutorials/auth" className="text-primary underline">Authentication Tutorial</a></li>
            <li>Build a dashboard with the <a href="/tutorials/dashboard" className="text-primary underline">Dashboard Tutorial</a></li>
          </ul>
        </InfoCard>
      </Section>
    </DocLayout>
  )
}
