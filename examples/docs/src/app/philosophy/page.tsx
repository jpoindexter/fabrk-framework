import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function PhilosophyPage() {
  return (
    <DocLayout
      title="DESIGN PHILOSOPHY"
      description="The principles behind FABRK's architecture. Understand why things work the way they do."
    >
      <Section id="i18n" title="INTERNATIONALIZATION (I18N)">
        <p className="text-sm text-muted-foreground mb-4">
          FABRK components accept all user-facing text as props. There are no hardcoded
          English strings inside components. You bring your own i18n library and pass
          translated strings through props.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          WHY PROPS-BASED TEXT
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Baking a specific i18n library (next-intl, react-i18next, lingui) into a
          component library couples consumers to that solution. Instead, FABRK stays
          agnostic: every label, placeholder, and message is a prop.
        </p>
        <CodeBlock title="any i18n library works">{`import { KPICard, Button, DataTable } from '@fabrk/components'
import { useTranslation } from 'your-i18n-library'

function Dashboard() {
  const { t } = useTranslation()

  return (
    <div>
      <KPICard title={t('dashboard.revenue')} value="$48,290" />
      <KPICard title={t('dashboard.users')} value="3,847" />
      <Button>{t('actions.submit')}</Button>
      <DataTable
        columns={[
          { key: 'name', label: t('table.name') },
          { key: 'status', label: t('table.status') },
        ]}
        data={rows}
      />
    </div>
  )
}`}</CodeBlock>

        <InfoCard title="BENEFIT">
          No coupling to any i18n solution. Smaller bundles since no translation runtime
          is shipped with the framework. Works with next-intl, react-i18next, lingui,
          FormatJS, or plain objects.
        </InfoCard>
      </Section>

      <Section id="data-fetching" title="DATA FETCHING">
        <p className="text-sm text-muted-foreground mb-4">
          FABRK components use a callback/props pattern. They never fetch data internally.
          This decouples the view layer from the data layer and works with any fetching
          strategy: Server Components, SWR, React Query, tRPC, or plain fetch.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          CALLBACK PROPS VS HARDCODED FETCHING
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Components accept callbacks for actions and receive data through props. The
          component never knows where the data comes from or how mutations happen.
        </p>
        <CodeBlock title="callback props (FABRK approach)">{`// The component has zero knowledge of your data layer
<DataTable
  data={users}                          // You fetch however you want
  columns={columns}
  onSort={(key, dir) => refetch({ sort: key, order: dir })}
  onRowClick={(row) => router.push(\`/users/\${row.id}\`)}
/>

<NotificationCenter
  notifications={notifications}         // From SWR, React Query, RSC, etc.
  onMarkRead={(id) => markRead(id)}     // Your mutation function
  onMarkAllRead={() => markAllRead()}
/>`}</CodeBlock>

        <CodeBlock title="hardcoded fetching (what FABRK avoids)">{`// This couples the component to a specific API and fetching strategy
function DataTable() {
  const { data } = useSWR('/api/users')  // Locked to SWR + this endpoint
  // ...
}`}</CodeBlock>

        <InfoCard title="BENEFIT">
          Works with Server Components (data as props from async server functions),
          client-side fetching (SWR, React Query, tRPC), or static data. You choose
          the strategy; FABRK renders the result.
        </InfoCard>
      </Section>

      <Section id="no-css-in-js" title="NO CSS-IN-JS RUNTIME">
        <p className="text-sm text-muted-foreground mb-4">
          FABRK uses Tailwind CSS with CSS custom properties for theming. There is zero
          runtime CSS overhead. Theme switching happens via CSS variable reassignment,
          not JavaScript re-renders.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          HOW THEMING WORKS
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Design tokens like <code>bg-primary</code> and <code>text-foreground</code> map
          to CSS custom properties. Switching themes reassigns those variables on the root
          element. No component re-renders, no style recalculation in JavaScript.
        </p>
        <CodeBlock title="CSS variable-based theming">{`/* Theme variables are set on :root */
:root {
  --primary: 142 71% 45%;
  --background: 0 0% 3%;
  --foreground: 0 0% 98%;
  --border: 0 0% 15%;
  --radius: 0px;
}

/* Switching themes just swaps these values */
:root[data-theme="ocean"] {
  --primary: 199 89% 48%;
  --background: 222 47% 6%;
  --radius: 8px;
}`}</CodeBlock>

        <CodeBlock title="components use tokens, not colors">{`import { cn } from '@fabrk/core'
import { mode } from '@fabrk/themes'

// Design tokens resolve to CSS variables at zero runtime cost
<Card className={cn("bg-card border border-border", mode.radius)}>
  <h2 className="text-foreground">Title</h2>
  <p className="text-muted-foreground">Description</p>
</Card>`}</CodeBlock>

        <InfoCard title="BENEFIT">
          Zero runtime CSS overhead. No styled-components, no emotion, no CSS-in-JS
          bundle. Theme switches are instant (CSS only, no React re-render tree).
          Works with SSR and streaming without hydration mismatches.
        </InfoCard>
      </Section>

      <Section id="adapter-pattern" title="ADAPTER PATTERN">
        <p className="text-sm text-muted-foreground mb-4">
          All external services (payments, email, storage, auth) sit behind
          provider-agnostic interfaces. You switch providers by changing your config,
          not your application code.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          ONE INTERFACE, MANY PROVIDERS
        </h3>
        <CodeBlock title="payment adapter interface">{`// @fabrk/core defines the interface
interface PaymentAdapter {
  createCheckout(options: CheckoutOptions): Promise<CheckoutSession>
  handleWebhook(body: string, signature: string): Promise<WebhookEvent>
  getSubscription(id: string): Promise<Subscription>
}

// @fabrk/payments provides implementations
import { StripePaymentAdapter } from '@fabrk/payments'   // Stripe
import { PolarPaymentAdapter } from '@fabrk/payments'    // Polar
import { LemonSqueezyAdapter } from '@fabrk/payments'    // Lemon Squeezy`}</CodeBlock>

        <CodeBlock title="switch providers in config">{`// fabrk.config.ts — change one line
export default defineFabrkConfig({
  payments: {
    adapter: 'stripe',      // Switch to 'polar' or 'lemonsqueezy'
    config: {
      secretKey: process.env.STRIPE_SECRET_KEY,
    },
  },
  email: {
    adapter: 'resend',      // Switch to 'console' for dev
  },
  storage: {
    adapter: 's3',          // Switch to 'r2' or 'local'
  },
})`}</CodeBlock>

        <InfoCard title="BENEFIT">
          Your application code never imports provider-specific SDKs directly. Switching
          from Stripe to Polar or from S3 to R2 requires changing the config, not
          rewriting API routes. In-memory adapters are available for every service,
          making local development and testing require zero external accounts.
        </InfoCard>
      </Section>

      <Section id="store-pattern" title="STORE PATTERN">
        <p className="text-sm text-muted-foreground mb-4">
          Stores are injectable data access layers with in-memory defaults. Every
          store interface has a zero-config in-memory implementation for development
          and testing. In production, swap in Prisma-backed stores.
        </p>

        <h3 className="text-sm font-semibold text-foreground uppercase mt-6 mb-3">
          IN-MEMORY BY DEFAULT, PRISMA FOR PRODUCTION
        </h3>
        <CodeBlock title="store pattern">{`// Development: zero setup, in-memory stores
import { InMemoryCostStore, AICostTracker } from '@fabrk/ai'

const tracker = new AICostTracker(new InMemoryCostStore())

// Production: swap in Prisma stores
import { PrismaCostStore } from '@fabrk/ai'
import { prisma } from '@/lib/prisma'

const tracker = new AICostTracker(new PrismaCostStore(prisma))`}</CodeBlock>

        <CodeBlock title="auto-wiring with store overrides">{`import { autoWire } from '@fabrk/core'
import { PrismaTeamStore, PrismaAuditStore } from '@fabrk/store-prisma'
import { prisma } from '@/lib/prisma'

// autoWire reads fabrk.config.ts and creates everything
// Pass store overrides for production persistence
const app = await autoWire(config, undefined, {
  teamStore: new PrismaTeamStore(prisma),
  auditStore: new PrismaAuditStore(prisma),
})`}</CodeBlock>

        <InfoCard title="BENEFIT">
          New developers run the app with zero database setup. Tests run in milliseconds
          against in-memory stores. Production uses real persistence. The application
          code stays identical across all environments.
        </InfoCard>
      </Section>

      <Section id="summary" title="SUMMARY">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-border bg-card p-4">
            <div className="text-xs font-bold text-primary uppercase">I18N</div>
            <div className="text-xs text-muted-foreground mt-1">
              All text as props. Bring your own i18n library.
            </div>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="text-xs font-bold text-primary uppercase">DATA FETCHING</div>
            <div className="text-xs text-muted-foreground mt-1">
              Callback props. No built-in fetching. Any strategy works.
            </div>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="text-xs font-bold text-primary uppercase">NO CSS-IN-JS</div>
            <div className="text-xs text-muted-foreground mt-1">
              Tailwind + CSS variables. Zero runtime CSS overhead.
            </div>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="text-xs font-bold text-primary uppercase">ADAPTERS</div>
            <div className="text-xs text-muted-foreground mt-1">
              Provider-agnostic interfaces. Switch via config.
            </div>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="text-xs font-bold text-primary uppercase">STORES</div>
            <div className="text-xs text-muted-foreground mt-1">
              In-memory defaults. Prisma for production. Same code everywhere.
            </div>
          </div>
          <div className="border border-border bg-card p-4">
            <div className="text-xs font-bold text-primary uppercase">AI-FIRST</div>
            <div className="text-xs text-muted-foreground mt-1">
              Every decision optimizes for AI agent productivity.
            </div>
          </div>
        </div>
      </Section>
    </DocLayout>
  )
}
