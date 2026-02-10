'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
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

      {/* STEP 1 — INSTALL AND CONFIGURE */}
      <Section title="STEP 1 — INSTALL AND CONFIGURE">
        <p className="text-sm text-muted-foreground mb-4">
          Install <code className="text-primary">@fabrk/payments</code> and the Stripe SDK,
          then add the payments section to your FABRK config.
        </p>
        <CodeBlock title="terminal">{`pnpm add @fabrk/payments stripe`}</CodeBlock>
        <p className="text-sm text-muted-foreground mt-3 mb-4">
          Add your Stripe keys to <code className="text-primary">.env.local</code> and
          configure the payments section in your config file.
        </p>
        <CodeBlock title=".env.local">{`STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"`}</CodeBlock>
        <CodeBlock title="fabrk.config.ts">{`import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  app: {
    name: 'My SaaS',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  },
  payments: {
    adapter: 'stripe',
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        priceId: 'price_starter_monthly',
        amount: 19,
        interval: 'month',
      },
      {
        id: 'pro',
        name: 'Pro',
        priceId: 'price_pro_monthly',
        amount: 49,
        interval: 'month',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        priceId: 'price_enterprise_monthly',
        amount: 149,
        interval: 'month',
      },
    ],
  },
})`}</CodeBlock>
        <InfoCard title="TIP">
          The <code className="text-primary">payments.plans</code> array is optional but recommended.
          It gives you a single source of truth for pricing data that you can reference
          in both your API routes and pricing UI.
        </InfoCard>
      </Section>

      {/* STEP 2 — CREATE STRIPE ADAPTER */}
      <Section title="STEP 2 — CREATE STRIPE ADAPTER">
        <p className="text-sm text-muted-foreground mb-4">
          Create a shared Stripe adapter instance using <code className="text-primary">createStripeAdapter</code>.
          This implements the <code className="text-primary">PaymentAdapter</code> interface from
          {' '}<code className="text-primary">@fabrk/core</code> with methods for checkout, webhooks,
          customers, and subscriptions.
        </p>
        <CodeBlock title="src/lib/payments.ts">{`import { createStripeAdapter } from '@fabrk/payments'

export const payments = createStripeAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
})

// The adapter exposes a unified interface:
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
          changing any of your application code. All three implement the same
          {' '}<code className="text-primary">PaymentAdapter</code> interface.
        </InfoCard>
      </Section>

      {/* STEP 3 — CHECKOUT SESSION */}
      <Section title="STEP 3 — CHECKOUT SESSION">
        <p className="text-sm text-muted-foreground mb-4">
          Create an API route that generates a Stripe checkout session. The adapter
          handles mode detection (subscription vs one-time) and optional trial periods.
        </p>
        <CodeBlock title="src/app/api/checkout/route.ts">{`import { NextRequest, NextResponse } from 'next/server'
import { payments } from '@/lib/payments'

export async function POST(req: NextRequest) {
  try {
    const { priceId, customerEmail } = await req.json()

    const checkout = await payments.createCheckout({
      priceId,
      customerEmail,
      subscription: true,
      trialDays: 14,
      successUrl: \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}\`,
      cancelUrl: \`\${process.env.NEXT_PUBLIC_APP_URL}/pricing\`,
      metadata: {
        source: 'pricing-page',
      },
    })

    return NextResponse.json({ url: checkout.url })
  } catch (error) {
    console.error('[CHECKOUT] Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}`}</CodeBlock>
        <InfoCard title="TIP">
          Set <code className="text-primary">subscription: true</code> for recurring payments
          or omit it for one-time charges. The <code className="text-primary">trialDays</code> option
          automatically adds a free trial period to the subscription.
        </InfoCard>
      </Section>

      {/* STEP 4 — WEBHOOK HANDLER */}
      <Section title="STEP 4 — WEBHOOK HANDLER">
        <p className="text-sm text-muted-foreground mb-4">
          Create a webhook endpoint to handle Stripe events. The adapter verifies the
          signature and parses the event payload automatically.
        </p>
        <CodeBlock title="src/app/api/webhooks/stripe/route.ts">{`import { NextRequest, NextResponse } from 'next/server'
import { payments } from '@/lib/payments'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const result = await payments.handleWebhook(body, signature)

  if (!result.verified) {
    console.error('[WEBHOOK] Verification failed:', result.error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = result.event!

  switch (type) {
    case 'checkout.session.completed': {
      const session = data as Record<string, unknown>
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      console.log('[WEBHOOK] Checkout completed:', { customerId, subscriptionId })
      // TODO: Provision access — save customer and subscription to your database
      break
    }

    case 'customer.subscription.updated': {
      const subscription = data as Record<string, unknown>
      console.log('[WEBHOOK] Subscription updated:', subscription.id)
      // TODO: Update subscription status in your database
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = data as Record<string, unknown>
      console.log('[WEBHOOK] Subscription canceled:', subscription.id)
      // TODO: Revoke access — update user tier in your database
      break
    }

    case 'invoice.payment_failed': {
      const invoice = data as Record<string, unknown>
      console.log('[WEBHOOK] Payment failed:', invoice.id)
      // TODO: Notify user of failed payment
      break
    }

    default:
      console.log('[WEBHOOK] Unhandled event:', type)
  }

  return NextResponse.json({ received: true })
}`}</CodeBlock>
        <p className="text-sm text-muted-foreground mt-3 mb-4">
          To test webhooks locally, use the Stripe CLI to forward events to your dev server.
        </p>
        <CodeBlock title="terminal">{`# Install Stripe CLI, then:
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger a test event:
stripe trigger checkout.session.completed`}</CodeBlock>
        <InfoCard title="PRODUCTION">
          In production, configure the webhook endpoint URL in your Stripe Dashboard under
          Developers &gt; Webhooks. Select the events you handle:
          {' '}<code className="text-primary">checkout.session.completed</code>,
          {' '}<code className="text-primary">customer.subscription.updated</code>,
          {' '}<code className="text-primary">customer.subscription.deleted</code>, and
          {' '}<code className="text-primary">invoice.payment_failed</code>.
        </InfoCard>
      </Section>

      {/* STEP 5 — PRICING PAGE */}
      <Section title="STEP 5 — PRICING PAGE">
        <p className="text-sm text-muted-foreground mb-4">
          Build a pricing page using the <code className="text-primary">PricingCard</code> component
          from <code className="text-primary">@fabrk/components</code>. The card follows the
          terminal aesthetic with bracket notation headers and UPPERCASE labels.
        </p>
        <CodeBlock title="src/app/pricing/page.tsx">{`'use client'

import { PricingCard } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { useState } from 'react'

const plans = [
  {
    id: 'starter',
    title: 'STARTER PLAN',
    price: '$19',
    priceSubtext: 'PER MONTH',
    priceId: 'price_starter_monthly',
    headerCode: '0x01',
    highlights: ['5 PROJECTS', 'BASIC ANALYTICS', 'EMAIL SUPPORT'],
  },
  {
    id: 'pro',
    title: 'PRO PLAN',
    price: '$49',
    priceSubtext: 'PER MONTH',
    priceId: 'price_pro_monthly',
    headerCode: '0x02',
    urgencyMessage: 'MOST POPULAR',
    highlights: ['UNLIMITED PROJECTS', 'ADVANCED ANALYTICS', 'PRIORITY SUPPORT', 'API ACCESS'],
  },
  {
    id: 'enterprise',
    title: 'ENTERPRISE PLAN',
    price: '$149',
    priceSubtext: 'PER MONTH',
    priceId: 'price_enterprise_monthly',
    headerCode: '0x03',
    highlights: ['EVERYTHING IN PRO', 'CUSTOM INTEGRATIONS', 'DEDICATED SUPPORT', 'SLA GUARANTEE'],
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
              priceSubtext={plan.priceSubtext}
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
                  mode.radius,
                  mode.font,
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
          The PricingCard component applies mode.radius and terminal styling internally.
          The CTA button is passed as children, giving you full control over the checkout
          action. Button text uses UPPERCASE with the &gt; prefix following the terminal aesthetic.
        </InfoCard>
      </Section>

      {/* COMPLETE EXAMPLE */}
      <Section title="COMPLETE EXAMPLE">
        <p className="text-sm text-muted-foreground mb-4">
          Here is the full file structure for a working Stripe integration. All files below
          are copy-paste ready.
        </p>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-6 mb-3', mode.font)}>
          FILE STRUCTURE
        </h3>
        <CodeBlock title="project layout">{`src/
├── lib/
│   └── payments.ts              # Shared Stripe adapter instance
├── app/
│   ├── api/
│   │   ├── checkout/
│   │   │   └── route.ts         # POST — create checkout session
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts     # POST — handle Stripe events
│   └── pricing/
│       └── page.tsx             # Pricing page with PricingCard`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-6 mb-3', mode.font)}>
          FULL PRICING PAGE
        </h3>
        <CodeBlock title="src/app/pricing/page.tsx">{`'use client'

import { PricingCard } from '@fabrk/components'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'
import { useState } from 'react'

const plans = [
  {
    id: 'starter',
    title: 'STARTER PLAN',
    price: '$19',
    priceSubtext: 'PER MONTH',
    priceId: 'price_starter_monthly',
    headerCode: '0x01',
    highlights: ['5 PROJECTS', 'BASIC ANALYTICS', 'EMAIL SUPPORT'],
  },
  {
    id: 'pro',
    title: 'PRO PLAN',
    price: '$49',
    priceSubtext: 'PER MONTH',
    priceId: 'price_pro_monthly',
    headerCode: '0x02',
    urgencyMessage: 'MOST POPULAR',
    highlights: ['UNLIMITED PROJECTS', 'ADVANCED ANALYTICS', 'PRIORITY SUPPORT', 'API ACCESS'],
  },
  {
    id: 'enterprise',
    title: 'ENTERPRISE PLAN',
    price: '$149',
    priceSubtext: 'PER MONTH',
    priceId: 'price_enterprise_monthly',
    headerCode: '0x03',
    highlights: ['EVERYTHING IN PRO', 'CUSTOM INTEGRATIONS', 'DEDICATED SUPPORT', 'SLA GUARANTEE'],
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
              priceSubtext={plan.priceSubtext}
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
                  mode.radius,
                  mode.font,
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

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-6 mb-3', mode.font)}>
          FULL ADAPTER + API ROUTES
        </h3>
        <CodeBlock title="src/lib/payments.ts">{`import { createStripeAdapter } from '@fabrk/payments'

export const payments = createStripeAdapter({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
})`}</CodeBlock>

        <CodeBlock title="src/app/api/checkout/route.ts">{`import { NextRequest, NextResponse } from 'next/server'
import { payments } from '@/lib/payments'

export async function POST(req: NextRequest) {
  try {
    const { priceId, customerEmail } = await req.json()

    const checkout = await payments.createCheckout({
      priceId,
      customerEmail,
      subscription: true,
      trialDays: 14,
      successUrl: \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}\`,
      cancelUrl: \`\${process.env.NEXT_PUBLIC_APP_URL}/pricing\`,
      metadata: { source: 'pricing-page' },
    })

    return NextResponse.json({ url: checkout.url })
  } catch (error) {
    console.error('[CHECKOUT] Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}`}</CodeBlock>

        <CodeBlock title="src/app/api/webhooks/stripe/route.ts">{`import { NextRequest, NextResponse } from 'next/server'
import { payments } from '@/lib/payments'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const result = await payments.handleWebhook(body, signature)

  if (!result.verified) {
    console.error('[WEBHOOK] Verification failed:', result.error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = result.event!

  switch (type) {
    case 'checkout.session.completed': {
      const session = data as Record<string, unknown>
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      console.log('[WEBHOOK] Checkout completed:', { customerId, subscriptionId })
      // Provision access — save customer and subscription to your database
      break
    }

    case 'customer.subscription.updated': {
      const subscription = data as Record<string, unknown>
      console.log('[WEBHOOK] Subscription updated:', subscription.id)
      // Update subscription status in your database
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = data as Record<string, unknown>
      console.log('[WEBHOOK] Subscription canceled:', subscription.id)
      // Revoke access — update user tier in your database
      break
    }

    case 'invoice.payment_failed': {
      const invoice = data as Record<string, unknown>
      console.log('[WEBHOOK] Payment failed:', invoice.id)
      // Notify user of failed payment
      break
    }

    default:
      console.log('[WEBHOOK] Unhandled event:', type)
  }

  return NextResponse.json({ received: true })
}`}</CodeBlock>

        <InfoCard title="NEXT STEPS">
          <ul className="space-y-1 mt-1">
            <li>Add a billing portal route using <code className="text-primary">payments.createPortalSession(customerId, returnUrl)</code></li>
            <li>Store customer and subscription data with <code className="text-primary">InMemoryPaymentStore</code> (dev) or a Prisma store (production)</li>
            <li>Swap to <code className="text-primary">createPolarAdapter</code> or <code className="text-primary">createLemonSqueezyAdapter</code> for alternative providers</li>
            <li>Add authentication with the <a href="/tutorials/auth" className="text-primary underline">Authentication Tutorial</a></li>
            <li>Build a dashboard with the <a href="/tutorials/dashboard" className="text-primary underline">Dashboard Tutorial</a></li>
          </ul>
        </InfoCard>
      </Section>
    </DocLayout>
  )
}
