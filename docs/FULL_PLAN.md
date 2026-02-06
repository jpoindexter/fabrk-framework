# Making FABRK Into a Framework (Like Next.js for AI)

## Context

FABRK is currently a **boilerplate** - a starting point that humans fork and customize. The user wants to transform it into a **framework** that AI coding agents use to build apps.

**Key Insight**: The target users aren't humans - they're AI coding assistants (Claude Code, Cursor, GitHub Copilot, v0.dev)

**Problem**:
- Humans say "build me a dashboard"
- AI writes 500 lines of custom components from scratch
- Takes 30 minutes, inconsistent design, no cost tracking

**Solution**:
- Transform FABRK into framework AI imports from
- AI uses `import { Dashboard } from '@fabrk/components'`
- Takes 2 minutes, consistent design, built-in features

**Goal**: Make FABRK the standard framework for "vibe coding" - where humans give prompts and AI builds production apps in minutes using FABRK.

---

## How Next.js Became a Framework

### 1. Published as npm Package

**What Next.js Did:**
- Published `next` as installable dependency
- Users run `npx create-next-app` to scaffold
- Framework code lives in `node_modules/next`
- User code lives in their project

**Key Difference from Boilerplate:**
- **Boilerplate**: Users modify the source code directly
- **Framework**: Users import from framework and extend it

**Example:**
```bash
# Boilerplate approach (FABRK today)
git clone fabrk
cd fabrk
# Modify files directly

# Framework approach (Next.js)
npx create-next-app my-app
cd my-app
# Import from 'next', customize via config
```

### 2. Conventions Over Configuration

**What Next.js Did:**
- `/app` directory = pages
- `/api` directory = API routes
- `layout.tsx` = shared layouts
- File-based routing

**Users don't configure routing - they follow conventions.**

**FABRK Equivalent:**
- `/ai` directory = AI features
- Design system enforcement by convention
- Cost tracking auto-wired
- Validation hooks pre-configured

### 3. Extensibility Points

**What Next.js Did:**
```javascript
// next.config.js - official extension point
module.exports = {
  webpack: (config) => {
    // Custom webpack config
    return config;
  },
  redirects: async () => [...],
}
```

**FABRK Equivalent:**
```typescript
// fabrk.config.ts
export default {
  ai: {
    costTracking: true,
    validation: 'strict',
    providers: ['claude', 'openai'],
  },
  design: {
    theme: 'terminal',
    radius: 'sharp',
  },
  payments: {
    provider: 'stripe',
  },
}
```

### 4. Plugin/Middleware System

**What Next.js Did:**
- Middleware for auth, logging, etc.
- Plugin system for extending functionality
- Composable patterns

**FABRK Equivalent:**
```typescript
// Plugins
import { createCostTracker } from '@fabrk/ai'
import { createStripeAdapter } from '@fabrk/payments'

// Middleware
export const middleware = fabrk.chain([
  fabrk.auth(),
  fabrk.costTracking(),
  fabrk.validation(),
])
```

### 5. Separate Core from Starters

**What Next.js Did:**
- `next` = core framework
- `create-next-app` = scaffolding tool
- Multiple starter templates

**FABRK Equivalent:**
```
@fabrk/core              # Core framework
@fabrk/cli               # create-fabrk-app
@fabrk/components        # Component library
@fabrk/ai                # AI toolkit
@fabrk/design-system     # Design system

create-fabrk-app         # Scaffolding CLI
  --template basic
  --template ai-saas
  --template dashboard
```

---

## What AI Agents Would Build With FABRK Framework

**Target Users**: AI coding assistants (Claude Code, Cursor, GitHub Copilot, v0.dev, etc.)

**Core Concept**: Framework designed for AI to build with, not just for humans building AI features.



### Example 1: "Build me a dashboard" → AI uses FABRK

**Human prompt to Cursor:**
> "Build me a dashboard showing my AI costs with charts"

**AI (Cursor/Claude Code) response:**
```typescript
// AI knows to use FABRK components
import { BarChart, LineChart, KPICard, Card } from '@fabrk/components'
import { useCostTracking } from '@fabrk/core'

export default function Dashboard() {
  const { todaysCost, weekTrend, topFeatures } = useCostTracking()

  return (
    <div className="grid gap-4 p-6">
      <div className="grid grid-cols-3 gap-4">
        <KPICard title="Today" value={`$${todaysCost}`} />
        <KPICard title="This Week" value={`$${weekTotal}`} />
        <KPICard title="Budget Left" value={`$${remaining}`} />
      </div>

      <Card>
        <LineChart data={weekTrend} />
      </Card>

      <Card>
        <BarChart data={topFeatures} title="Top Features by Cost" />
      </Card>
    </div>
  )
}
```

**Why this works:**
1. **AI knows the components** - AGENTS.md lists all 70 components
2. **AI follows design system** - Uses `grid gap-4 p-6` (8-point grid)
3. **AI uses hooks** - `useCostTracking()` is documented
4. **Zero custom components needed** - Everything exists in FABRK

**What happens without FABRK:**
```typescript
// AI has to build everything from scratch
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [costs, setCosts] = useState([])

  // AI writes 100+ lines of:
  // - Custom chart components
  // - Data fetching logic
  // - Styling from scratch
  // - State management
  // = Slow, inconsistent, bugs
}
```

### Example 2: "Add a settings page" → AI builds it

**Human prompt:**
> "Add a settings page with billing, API keys, and team management"

**AI builds with FABRK:**
```typescript
import { Tabs, Card, Button, Input, Table } from '@fabrk/components'
import { useTeam, useBilling, useAPIKeys } from '@fabrk/core'

export default function SettingsPage() {
  const { team, inviteMember } = useTeam()
  const { plan, cancelSubscription } = useBilling()
  const { keys, createKey } = useAPIKeys()

  return (
    <Tabs defaultValue="billing">
      <Tabs.List>
        <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
        <Tabs.Trigger value="api">API Keys</Tabs.Trigger>
        <Tabs.Trigger value="team">Team</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="billing">
        <Card>
          <h2>Current Plan: {plan.name}</h2>
          <Button onClick={cancelSubscription}>Cancel</Button>
        </Card>
      </Tabs.Content>

      <Tabs.Content value="api">
        <Button onClick={createKey}>Create Key</Button>
        <Table data={keys} columns={[/* ... */]} />
      </Tabs.Content>

      <Tabs.Content value="team">
        {/* AI uses team components */}
      </Tabs.Content>
    </Tabs>
  )
}
```

**Why AI loves this:**
1. All components exist (`Tabs`, `Card`, `Table`)
2. All hooks exist (`useTeam`, `useBilling`)
3. Patterns are documented (AGENTS.md shows examples)
4. Design tokens enforced (AI can't use wrong colors)

**What AI knows from AGENTS.md:**
```markdown
## Components Available

### Tabs
- `<Tabs>` - Tab container
- `<Tabs.List>` - Tab list
- `<Tabs.Trigger>` - Tab button
- Usage: Settings pages, dashboards

### Hooks

#### useTeam()
Returns: { team, inviteMember, removeMember }
Example: Settings page team management

#### useBilling()
Returns: { plan, cancelSubscription, updatePayment }
Example: Billing page
```

### Example 3: "I need a login page" → AI builds it

**Human:**
> "Add a login page with Google OAuth and magic link"

**AI knows FABRK has auth:**
```typescript
import { SignInForm, SocialAuthButtons } from '@fabrk/components'
import { signIn } from '@fabrk/core'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md p-6">
        <h1>Sign In</h1>

        <SocialAuthButtons providers={['google']} />

        <SignInForm
          onSubmit={(email) => signIn('email', { email })}
          magicLink
        />
      </Card>
    </div>
  )
}
```

**AI doesn't need to:**
- Build OAuth flow
- Style forms
- Handle auth state
- Create components

**FABRK provides:**
- Pre-built `<SignInForm>` component
- `<SocialAuthButtons>` for OAuth
- `signIn()` function that works
- Design system (terminal theme)

### Example 4: "Build a pricing page" → Done in 2 minutes

**Human:**
> "Create a pricing page with 3 tiers and Stripe checkout"

**AI with FABRK:**
```typescript
import { PricingCard, Button } from '@fabrk/components'
import { createCheckout } from '@fabrk/core'

const plans = [
  { name: 'Free', price: 0, features: ['10 API calls'] },
  { name: 'Pro', price: 99, features: ['Unlimited', 'Analytics'] },
  { name: 'Team', price: 299, features: ['Everything', 'Team'] },
]

export default function PricingPage() {
  return (
    <div className="grid grid-cols-3 gap-6 p-12">
      {plans.map((plan) => (
        <PricingCard
          key={plan.name}
          plan={plan}
          onSelect={() => createCheckout(plan.price)}
        />
      ))}
    </div>
  )
}
```

**What AI skips:**
- ❌ Building pricing cards
- ❌ Stripe integration
- ❌ Checkout flow
- ❌ Payment UI

**FABRK provides:**
- `<PricingCard>` component
- `createCheckout()` function
- Stripe already configured
- Design tokens

---

## What Makes FABRK Different (For AI Agents)

| Aspect | Next.js | shadcn/ui | FABRK Framework |
|--------|---------|-----------|-----------------|
| **Target User** | Human developers | Human developers | **AI coding agents** |
| **Components** | None (bring your own) | Copy/paste | ✅ **70+ importable** |
| **Design System** | None | Minimal | ✅ **18 themes, strict rules** |
| **AI Context** | None | None | ✅ **AGENTS.md auto-generated** |
| **Auth** | Manual | None | ✅ **Pre-built forms + hooks** |
| **Payments** | Manual | None | ✅ **Multi-provider adapters** |
| **Cost Tracking** | N/A | N/A | ✅ **Built-in for AI APIs** |
| **Validation** | Manual | None | ✅ **Auto-validates AI code** |

### Why AI Agents Need FABRK

**Problem without FABRK:**
```
Human: "Build me a dashboard"

AI: *Writes 500 lines of custom components*
    *Inconsistent design*
    *Hardcoded colors*
    *No cost tracking*
    *Takes 30 minutes*
```

**With FABRK:**
```
Human: "Build me a dashboard"

AI: *Imports 5 components from @fabrk*
    *Follows design system (documented in AGENTS.md)*
    *Uses cost tracking hooks*
    *Takes 2 minutes*
```

**Key Insight:**
- **shadcn/ui** = Components for humans (copy/paste)
- **FABRK** = Components for AI agents (npm install)

AI can't "copy/paste" well - it needs `import { Button } from '@fabrk/components'`

---

## Use Cases (Vibe Coding Scenarios)

### 1. Weekend Project Builder
**Human:** "I want to build an AI writing tool this weekend"

**With FABRK:**
- Friday: `npx create-fabrk-app my-writer`
- Saturday: Tell Cursor to build editor + AI features
- Sunday: Add Stripe, deploy to Vercel
- **Total time:** 2 days

**Without FABRK:**
- Week 1: Set up Next.js, find components, choose design system
- Week 2: Build auth, billing, dashboard from scratch
- Week 3: Debug AI integration, add cost tracking
- **Total time:** 3+ weeks

### 2. AI Agent Building for AI Agent
**Scenario:** Claude Code building an app with Claude Code

**Prompt:**
> "Build me a chat app where users talk to Claude, track costs per conversation, show analytics dashboard"

**Claude Code with FABRK:**
```typescript
// 1. Creates chat interface
import { Chat, Card } from '@fabrk/components'
import { useCostTracking } from '@fabrk/core'

// 2. Adds cost tracking
const { track, byCon versation } = useCostTracking()

// 3. Builds dashboard
import { BarChart, LineChart } from '@fabrk/components'

// Done in 10 minutes
```

### 3. Indie Hacker Validation
**Human:** "I have 3 ideas, need to test them fast"

**With FABRK + AI:**
- Day 1: Build idea #1 (Cursor generates with FABRK)
- Day 2: Build idea #2
- Day 3: Build idea #3
- Day 4-7: Test with users
- **Ship 3 MVPs in a week**

### 4. Corporate "AI Wrapper" Team
**Company:** "Build internal tool for employees using GPT-4"

**Timeline:**
- Week 1: Cursor builds entire app using FABRK
- Week 2: Add SSO, team features
- Week 3: Deploy internally
- **3 weeks vs 3 months**

---

## What FABRK Has Today (Current State)

Based on codebase exploration:

### ✅ Strong Foundation
- **70+ Components** ready to extract
- **AI Toolkit** (cost tracking, validation, testing)
- **Design System** (18 themes, tokens, mode object)
- **Multi-Provider Payments** (Stripe, Polar, Lemonsqueezy)
- **Full Auth** (NextAuth v5, OAuth, MFA)
- **CLI Tools** (66 npm scripts, setup wizard)
- **Documentation** (100+ files, .ai/ folder)

### ❌ Missing Framework Pieces
- Not published as npm packages
- No plugin/adapter system
- Tightly coupled to specific choices
- Users fork entire codebase
- No versioning strategy for components
- No official extension points

---

## Transformation Plan: Boilerplate → Framework

### Phase 1: Package Architecture (~4 weeks)

**Goal**: Extract code into publishable npm packages

#### 1.1 Create Monorepo Structure
```
fabrk/
├── packages/
│   ├── core/              # @fabrk/core (framework runtime)
│   ├── components/        # @fabrk/components (UI library)
│   ├── ai/                # @fabrk/ai (AI toolkit)
│   ├── design-system/     # @fabrk/design-system (themes + tokens)
│   ├── cli/               # create-fabrk-app (scaffolding)
│   └── config/            # @fabrk/config (config builder)
├── templates/
│   ├── basic/             # Minimal starter
│   ├── ai-saas/           # Full AI SaaS
│   └── dashboard/         # Admin dashboard
├── docs/
└── examples/
```

**Files to Create:**
- `pnpm-workspace.yaml` - Monorepo configuration
- `packages/core/package.json` - Core package
- `packages/components/package.json` - Components package
- `packages/ai/package.json` - AI toolkit package
- `packages/cli/package.json` - CLI package

**Migration:**
- Extract `/src/lib/ai/*` → `packages/ai/src/`
- Extract `/src/components/ui/*` → `packages/components/src/ui/`
- Extract `/src/design-system/*` → `packages/design-system/src/`

#### 1.2 Define Core API
```typescript
// packages/core/src/index.ts
export * from './framework'
export * from './middleware'
export * from './hooks'
export * from './providers'

// packages/core/src/framework.ts
export function createFabrk(config: FabrkConfig) {
  return {
    middleware: createMiddleware(config),
    providers: createProviders(config),
    hooks: createHooks(config),
  }
}
```

**Files to Create:**
- `packages/core/src/framework.ts` - Core framework API
- `packages/core/src/types.ts` - Type definitions
- `packages/core/src/config.ts` - Configuration schema
- `packages/core/src/middleware.ts` - Middleware system
- `packages/core/src/providers.ts` - Provider pattern

#### 1.3 Extract Components
```typescript
// packages/components/src/index.ts
export * from './ui/button'
export * from './ui/card'
// ... all 70 components

// User imports:
import { Button, Card } from '@fabrk/components'
```

**Files to Modify:**
- Move all `/src/components/ui/*.tsx` → `packages/components/src/ui/`
- Move all `/src/components/charts/*.tsx` → `packages/components/src/charts/`
- Keep feature components in user projects (auth, billing, etc.)

#### 1.4 Extract AI Toolkit
```typescript
// packages/ai/src/index.ts
export { CostTracker } from './cost'
export { CodeValidator } from './validation'
export { AITest } from './testing'

// User code:
import { createCostTracker } from '@fabrk/ai'

const tracker = createCostTracker({
  model: 'claude-sonnet-4-5',
  budget: 100,
})
```

**Files to Modify:**
- Move `/src/lib/ai/*` → `packages/ai/src/`
- Export public API only (hide internal utilities)
- Add peer dependencies (anthropic SDK, openai SDK)

---

### Phase 2: Plugin System (~2 weeks)

**Goal**: Enable customization without forking

#### 2.1 Provider Adapters
```typescript
// packages/core/src/adapters/payment.ts
export interface PaymentAdapter {
  createCheckout(params: CheckoutParams): Promise<CheckoutSession>
  handleWebhook(event: WebhookEvent): Promise<void>
  cancelSubscription(subscriptionId: string): Promise<void>
}

// packages/stripe/src/index.ts
export class StripeAdapter implements PaymentAdapter {
  // Implementation
}

// User code:
import { StripeAdapter } from '@fabrk/stripe'
import { fabrk } from '@fabrk/core'

fabrk.use(new StripeAdapter({ apiKey: process.env.STRIPE_KEY }))
```

**Adapters to Create:**
- Payment adapters (Stripe, Polar, Lemonsqueezy)
- Auth adapters (NextAuth, Clerk, Supabase)
- Email adapters (Resend, Sendgrid, Postmark)
- Database adapters (Prisma, Drizzle)

**Files to Create:**
- `packages/stripe/src/adapter.ts`
- `packages/polar/src/adapter.ts`
- `packages/lemonsqueezy/src/adapter.ts`

#### 2.2 Middleware System
```typescript
// packages/core/src/middleware.ts
export function createMiddleware(options: MiddlewareOptions) {
  return async (req, res, next) => {
    // Run middleware chain
  }
}

// User code:
export const middleware = fabrk.chain([
  fabrk.auth(),
  fabrk.cors(),
  fabrk.costTracking(),
])
```

**Files to Create:**
- `packages/core/src/middleware/auth.ts`
- `packages/core/src/middleware/cost-tracking.ts`
- `packages/core/src/middleware/validation.ts`

#### 2.3 Hooks API
```typescript
// packages/core/src/hooks.ts
export function useCostTracking() {
  const fabrk = useFabrk()
  return fabrk.ai.costTracker
}

export function useDesignSystem() {
  const fabrk = useFabrk()
  return fabrk.design.mode
}

// User code:
const { track } = useCostTracking()
await track('claude-sonnet', async () => {
  return await generateText(prompt)
})
```

**Files to Create:**
- `packages/core/src/hooks/use-fabrk.ts`
- `packages/core/src/hooks/use-cost-tracking.ts`
- `packages/core/src/hooks/use-design-system.ts`

---

### Phase 3: Configuration System (~1 week)

**Goal**: Type-safe, validated configuration

#### 3.1 Config Schema
```typescript
// packages/config/src/schema.ts
import { z } from 'zod'

export const fabrkConfigSchema = z.object({
  ai: z.object({
    costTracking: z.boolean().default(true),
    validation: z.enum(['strict', 'loose', 'off']).default('strict'),
    providers: z.array(z.enum(['claude', 'openai', 'gemini'])),
    budget: z.object({
      daily: z.number().optional(),
      monthly: z.number().optional(),
    }).optional(),
  }),
  design: z.object({
    theme: z.string().default('terminal'),
    radius: z.enum(['sharp', 'rounded', 'pill']).default('sharp'),
  }),
  payments: z.object({
    provider: z.enum(['stripe', 'polar', 'lemonsqueezy']),
    mode: z.enum(['test', 'live']).default('test'),
  }).optional(),
})

export type FabrkConfig = z.infer<typeof fabrkConfigSchema>
```

#### 3.2 Config Builder
```typescript
// packages/config/src/builder.ts
export function defineFabrkConfig(config: FabrkConfig) {
  return fabrkConfigSchema.parse(config)
}

// User's fabrk.config.ts:
import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  ai: {
    costTracking: true,
    providers: ['claude', 'openai'],
    budget: { daily: 50 },
  },
  design: {
    theme: 'terminal',
  },
  payments: {
    provider: 'stripe',
  },
})
```

**Files to Create:**
- `packages/config/src/schema.ts`
- `packages/config/src/builder.ts`
- `packages/config/src/loader.ts` - Load and merge config

---

### Phase 4: CLI & Scaffolding (~1 week)

**Goal**: `create-fabrk-app` command like `create-next-app`

#### 4.1 CLI Tool
```bash
# Usage:
npx create-fabrk-app my-app
# or
npm create fabrk-app my-app

# Options:
npx create-fabrk-app my-app --template ai-saas
npx create-fabrk-app my-app --template dashboard
npx create-fabrk-app my-app --template basic
```

#### 4.2 Templates
```
templates/
├── basic/              # Minimal (components + design system only)
├── ai-saas/           # Full AI SaaS (cost tracking, validation, etc.)
└── dashboard/         # Admin dashboard (charts, tables, metrics)
```

**Template Structure:**
```
template/
├── package.json       # With @fabrk/* dependencies
├── fabrk.config.ts    # Pre-configured
├── .env.example       # Environment template
├── src/
│   ├── app/          # Minimal pages
│   └── components/   # Custom components (not from @fabrk)
└── README.md         # Setup instructions
```

**Files to Create:**
- `packages/cli/src/index.ts` - CLI entry point
- `packages/cli/src/scaffold.ts` - Scaffolding logic
- `packages/cli/src/templates.ts` - Template selection
- `templates/basic/` - Basic template
- `templates/ai-saas/` - AI SaaS template

---

### Phase 5: Documentation & DX (~2 weeks)

**Goal**: Framework-quality docs and developer experience

#### 5.1 Documentation Site
```
docs/
├── getting-started/
│   ├── installation.md
│   ├── quick-start.md
│   └── configuration.md
├── core-concepts/
│   ├── framework.md
│   ├── middleware.md
│   ├── providers.md
│   └── hooks.md
├── api-reference/
│   ├── core.md
│   ├── components.md
│   ├── ai.md
│   └── config.md
├── guides/
│   ├── cost-tracking.md
│   ├── design-system.md
│   ├── payments.md
│   └── deployment.md
└── examples/
```

#### 5.2 Type Documentation
```typescript
// Inline JSDoc for all public APIs
/**
 * Create a cost tracker for AI API calls
 *
 * @param config - Cost tracking configuration
 * @returns Cost tracker instance
 *
 * @example
 * ```ts
 * const tracker = createCostTracker({
 *   model: 'claude-sonnet-4-5',
 *   budget: { daily: 50 },
 * })
 *
 * await tracker.track(async () => {
 *   return await generateText(prompt)
 * })
 * ```
 */
export function createCostTracker(config: CostConfig): CostTracker
```

#### 5.3 Migration Guide
```markdown
# Migrating from Boilerplate to Framework

## Before (Boilerplate)
```bash
git clone fabrk
cd fabrk
npm install
# Modify files directly
```

## After (Framework)
```bash
npx create-fabrk-app my-app
cd my-app
npm install
# Import from @fabrk packages
```

## Breaking Changes
- Components moved to `@fabrk/components`
- AI utilities moved to `@fabrk/ai`
- Config changed to `fabrk.config.ts`
```

---

## Timeline & Effort (AI-Assisted)

### Without AI (Manual Coding)
| Phase | Duration | Effort | Deliverables |
|-------|----------|--------|--------------|
| Phase 1: Packages | 4 weeks | 120-160h | Monorepo, npm packages, core API |
| Phase 2: Plugins | 2 weeks | 60-80h | Adapters, middleware, hooks |
| Phase 3: Config | 1 week | 30-40h | Type-safe configuration |
| Phase 4: CLI | 1 week | 30-40h | Scaffolding tool, templates |
| Phase 5: Docs | 2 weeks | 60-80h | Framework docs, migration guide |
| **Total** | **10 weeks** | **300-400h** | Full framework |

### With AI Assistance (Claude Code + Cursor)
| Phase | Duration | Effort | Why Faster |
|-------|----------|--------|------------|
| Phase 1: Packages | **1-2 weeks** | **30-40h** | AI extracts components, generates package.json, scaffolds monorepo |
| Phase 2: Plugins | **3-4 days** | **15-20h** | AI writes adapters following patterns, generates middleware |
| Phase 3: Config | **2-3 days** | **8-12h** | AI writes Zod schemas, generates types |
| Phase 4: CLI | **2-3 days** | **8-12h** | AI scaffolds CLI, copies existing patterns |
| Phase 5: Docs | **1 week** | **20-30h** | AI generates docs from types, writes examples |
| **Total** | **3-4 weeks** | **81-114h** | **70% faster** |

**Key AI Accelerators:**
1. **Code extraction** - AI moves files to packages in minutes
2. **Pattern replication** - Show AI one adapter, it writes the rest
3. **Type generation** - AI generates TypeScript from schemas
4. **Documentation** - AI writes docs from JSDoc comments
5. **Boilerplate reduction** - AI scaffolds package.json, tsconfig, etc.

---

## Success Metrics

### Developer Experience
- [ ] Install with `npx create-fabrk-app`
- [ ] Zero config default (works out of the box)
- [ ] TypeScript autocomplete for all APIs
- [ ] Hot module replacement for components
- [ ] CLI validates config on startup

### Extensibility
- [ ] Custom payment adapter in <50 lines
- [ ] Custom theme without forking
- [ ] Plugin system for features
- [ ] Middleware composition
- [ ] Override any default behavior

### Performance
- [ ] Tree-shakeable components (only bundle what's used)
- [ ] < 100kb framework overhead
- [ ] No runtime performance penalty
- [ ] Fast refresh for dev experience

### Community
- [ ] 5+ community templates
- [ ] 10+ published plugins
- [ ] 50+ GitHub stars in month 1
- [ ] Active Discord community

---

## Comparison: Boilerplate vs Framework

| Aspect | FABRK Boilerplate (Today) | FABRK Framework (Future) |
|--------|---------------------------|--------------------------|
| **Installation** | `git clone` + setup wizard | `npx create-fabrk-app` |
| **Updates** | Manual git pull | `npm update @fabrk/core` |
| **Components** | Copy files | `import from '@fabrk/components'` |
| **Customization** | Edit source directly | Config file + plugins |
| **Versioning** | None (single repo) | Semantic versioning per package |
| **Extensibility** | Fork and modify | Plugin system |
| **Breaking Changes** | User deals with conflicts | Migration guides |
| **Community** | Templates = forks | Templates = npm packages |
| **Learning Curve** | High (understand all code) | Low (learn API surface) |

---

## Critical Files to Create

### Monorepo Setup
- `/pnpm-workspace.yaml` - Workspace configuration
- `/turbo.json` - Build orchestration
- `/.changeset/config.json` - Versioning

### Core Package
- `/packages/core/package.json`
- `/packages/core/src/index.ts`
- `/packages/core/src/framework.ts`
- `/packages/core/src/middleware.ts`
- `/packages/core/src/providers.ts`

### Components Package
- `/packages/components/package.json`
- `/packages/components/src/index.ts`
- `/packages/components/src/ui/*` (extract from current codebase)

### AI Package
- `/packages/ai/package.json`
- `/packages/ai/src/index.ts`
- `/packages/ai/src/cost.ts` (from current `/src/lib/ai/cost.ts`)
- `/packages/ai/src/validation.ts`
- `/packages/ai/src/testing.ts`

### CLI Package
- `/packages/cli/package.json`
- `/packages/cli/src/index.ts`
- `/packages/cli/src/scaffold.ts`
- `/packages/cli/templates/basic/`
- `/packages/cli/templates/ai-saas/`

### Config Package
- `/packages/config/package.json`
- `/packages/config/src/schema.ts`
- `/packages/config/src/builder.ts`

---

## AI-Assisted Workflow (How We'd Build It)

### Week 1-2: Package Architecture (30-40h with AI)

**Day 1-2: Monorepo Setup**
```bash
# Claude generates:
- pnpm-workspace.yaml
- packages/core/package.json
- packages/components/package.json
- packages/ai/package.json
- turbo.json for builds
```

**Day 3-5: Extract Components**
```bash
# You: "Extract all UI components to packages/components"
# AI:
# - Moves 62 files from src/components/ui/ to packages/components/src/ui/
# - Generates barrel exports (index.ts)
# - Updates imports across codebase
# - Creates package.json with dependencies
```

**Day 6-7: Extract AI Toolkit**
```bash
# You: "Extract AI toolkit to @fabrk/ai package"
# AI:
# - Moves src/lib/ai/* to packages/ai/src/
# - Exports public API
# - Generates TypeScript definitions
# - Adds peer dependencies
```

**Day 8-10: Core API**
```bash
# You: "Create framework API with middleware, hooks, providers"
# AI:
# - Scaffolds packages/core/src/framework.ts
# - Writes middleware chain system
# - Creates hook wrappers
# - Generates types
```

### Week 3: Plugin System (15-20h with AI)

**Day 1-2: Payment Adapters**
```bash
# You: "Create PaymentAdapter interface and Stripe implementation"
# AI: Writes interface + StripeAdapter

# You: "Now create Polar and Lemonsqueezy adapters following same pattern"
# AI: Replicates pattern for other providers (10 minutes)
```

**Day 3-4: Auth & Email Adapters**
```bash
# Same pattern - AI replicates once shown the structure
```

**Day 5: Middleware System**
```bash
# You: "Create middleware chain with auth, CORS, cost tracking"
# AI: Generates composable middleware system
```

### Week 4: CLI, Config, Docs (28-42h with AI)

**Day 1-2: Config System**
```bash
# You: "Create Zod schema for fabrk.config.ts"
# AI: Generates schema + builder + loader
```

**Day 3-5: CLI Tool**
```bash
# You: "Create create-fabrk-app CLI like create-next-app"
# AI:
# - Scaffolds CLI structure
# - Writes template copying logic
# - Creates interactive prompts
```

**Day 6-10: Documentation**
```bash
# You: "Generate API docs from JSDoc comments"
# AI:
# - Extracts all exported functions
# - Generates markdown docs
# - Creates examples from @example tags
```

---

## Realistic Timeline With AI

**Minimum Viable Framework (MVP):**
- **3 weeks** (80-100 hours total)
- Core packages published
- Basic CLI working
- 1-2 starter templates
- Minimal docs

**Production-Ready Framework:**
- **4-5 weeks** (110-140 hours total)
- All packages published
- Full plugin system
- 3+ templates
- Complete documentation

**What AI Does Well:**
- ✅ Code extraction and reorganization
- ✅ Pattern replication (adapters, middleware)
- ✅ Type generation from schemas
- ✅ Boilerplate (package.json, tsconfig, etc.)
- ✅ Documentation from code

**What You Still Need To Do:**
- ❌ Architecture decisions (what to extract, API design)
- ❌ Testing and debugging
- ❌ Publishing to npm
- ❌ Marketing and community building
- ❌ Real-world usage testing

---

## How To Actually Do This (Step-by-Step)

### Step 1: Create Monorepo (1-2 hours)

**What you'll do:**
```bash
cd fabrk-dev
mkdir packages

# Create workspace config
echo 'packages:\n  - "packages/*"' > pnpm-workspace.yaml
```

**Create first package (components):**
```bash
mkdir -p packages/components/src/ui
cd packages/components

# Initialize package
npm init -y
# Edit package.json to set name: "@fabrk/components"
```

**AI prompt:**
> "Create package.json for @fabrk/components with:
> - name: @fabrk/components
> - Exports all UI components
> - Peer dependencies: react, react-dom, next
> - Build script using tsup"

### Step 2: Extract First Component (30 minutes)

**Manual:**
```bash
# Copy one component to test
cp ../../src/components/ui/button.tsx packages/components/src/ui/
```

**AI prompt:**
> "Update this Button component to work as a standalone package:
> - Remove any imports from parent project
> - Make all dependencies explicit
> - Add JSDoc documentation
> - Export properly"

**Test it works:**
```bash
cd packages/components
npm run build
# Should create dist/ folder
```

### Step 3: Extract ALL Components (2-4 hours with AI)

**AI prompt:**
> "Move all 62 components from src/components/ui/ to packages/components/src/ui/:
> - Keep file structure
> - Update all imports
> - Generate barrel export (index.ts)
> - Create README.md"

**Verify:**
```bash
cd packages/components
npm run build
# Should have 62 components in dist/
```

### Step 4: Make Parent Project Use Package (1 hour)

**Update parent package.json:**
```json
{
  "dependencies": {
    "@fabrk/components": "workspace:*"
  }
}
```

**Update imports in parent:**
```typescript
// Before
import { Button } from '@/components/ui/button'

// After
import { Button } from '@fabrk/components'
```

**AI prompt:**
> "Replace all imports from @/components/ui/* with @fabrk/components across the entire codebase"

### Step 5: Extract AI Package (4-6 hours with AI)

**Create package:**
```bash
mkdir -p packages/ai/src
cd packages/ai
npm init -y
```

**AI prompt:**
> "Extract AI toolkit from src/lib/ai/ to packages/ai/:
> - Move all 8 files (cost.ts, validation.ts, testing.ts, etc.)
> - Create clean public API in index.ts
> - Add peer dependencies (@anthropic-ai/sdk, openai)
> - Generate types
> - Write README with examples"

### Step 6: Extract Design System (2-3 hours)

**AI prompt:**
> "Extract design system from src/design-system/ to packages/design-system/:
> - Move mode object, tokens, themes
> - Keep CSS variables
> - Export theme presets
> - Generate type-safe theme builder"

### Step 7: Create Core Package (6-8 hours with AI)

This is the framework runtime.

**AI prompt:**
> "Create @fabrk/core package with:
> - Configuration loader (reads fabrk.config.ts)
> - Middleware system (compose middleware functions)
> - Provider registry (register payment/auth/email providers)
> - React hooks (useFabrk, useCostTracking, useDesignSystem)"

### Step 8: Build CLI (4-6 hours with AI)

**AI prompt:**
> "Create create-fabrk-app CLI that:
> - Scaffolds new project
> - Copies template (basic, ai-saas, dashboard)
> - Runs npm install
> - Prompts for config (payment provider, theme, etc.)
> - Generates fabrk.config.ts"

### Step 9: Publish to npm (1-2 hours)

**For each package:**
```bash
cd packages/components
npm version 0.1.0
npm publish --access public

cd ../ai
npm version 0.1.0
npm publish --access public

# Repeat for all packages
```

### Step 10: Test End-to-End (2-3 hours)

```bash
# In fresh directory
npx @fabrk/cli create my-test-app

cd my-test-app
npm install
npm run dev

# Should see app running with framework packages
```

---

## Detailed: How to Build Each Package

### Package 1: @fabrk/components

**Structure:**
```
packages/components/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts              # export * from './ui/button'
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ... (62 components)
│   └── charts/
│       └── ... (8 charts)
└── README.md
```

**package.json:**
```json
{
  "name": "@fabrk/components",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./ui/*": "./dist/ui/*.js"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next": "^16.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --format esm --watch"
  }
}
```

### Package 2: @fabrk/ai

**Structure:**
```
packages/ai/
├── package.json
├── src/
│   ├── index.ts
│   ├── cost.ts
│   ├── validation.ts
│   ├── testing.ts
│   └── types.ts
└── README.md
```

**Public API (index.ts):**
```typescript
export { createCostTracker } from './cost'
export { CodeValidator } from './validation'
export { AITest } from './testing'
export type { CostConfig, ValidationResult } from './types'
```

### Package 3: @fabrk/core

**Structure:**
```
packages/core/
├── package.json
├── src/
│   ├── index.ts
│   ├── framework.ts         # createFabrk()
│   ├── middleware.ts        # Middleware chain
│   ├── providers.ts         # Provider registry
│   ├── hooks.ts             # React hooks
│   ├── config.ts            # Config loader
│   └── types.ts
└── README.md
```

**Framework API:**
```typescript
// packages/core/src/framework.ts
export function createFabrk(config: FabrkConfig) {
  return {
    middleware: createMiddleware(config),
    providers: registerProviders(config),
    hooks: {
      useCostTracking: () => useCostTracking(),
      useDesignSystem: () => useDesignSystem(),
    }
  }
}
```

**Usage in user's app:**
```typescript
// app/layout.tsx
import { createFabrk } from '@fabrk/core'
import fabrkConfig from '../fabrk.config'

const fabrk = createFabrk(fabrkConfig)

export default function RootLayout({ children }) {
  return (
    <html>
      <body className={fabrk.design.mode.font}>
        {children}
      </body>
    </html>
  )
}
```

---

## Phase 6: AGENTS.md Auto-Generation (~3-4 days)

**Goal**: Auto-generate context files so AI tools know about FABRK

### 6.1 Integrate agentsmith CLI

```bash
# In framework repo
npx @jpoindexter/agent-smith --output AGENTS.md

# This scans packages/ and generates:
# - All 70+ components with props
# - All hooks with signatures
# - Design system rules
# - Usage patterns
```

### 6.2 Add to Build Process

```json
// packages/components/package.json
{
  "scripts": {
    "build": "tsup && npm run generate-docs",
    "generate-docs": "agent-smith --output AGENTS.md"
  }
}
```

### 6.3 Publish AGENTS.md with Packages

```
packages/components/
├── dist/
├── AGENTS.md          # Auto-generated context file
└── package.json
```

**AI tools can then:**
```bash
# Read FABRK context
cat node_modules/@fabrk/components/AGENTS.md
```

---

## Phase 7: Marketing & Distribution (~1 week)

**Goal**: Get FABRK into AI coding tools' knowledge

### 7.1 Documentation Site (fabrk.dev)

```bash
# Deploy docs to Vercel
npx create-next-app@latest docs --template docs
# Or use Mintlify, Docusaurus, etc.
```

**Critical pages:**
- `/docs/ai-agents` - Guide for AI tools to use FABRK
- `/examples` - Working demo apps
- `/templates` - Browse starter templates
- `/components` - Interactive component gallery

### 7.2 Get into AI Tool Knowledge Bases

**Claude Code:**
- Submit to https://docs.anthropic.com/claude-code
- Add FABRK to recommended frameworks

**Cursor:**
- Submit docs to Cursor's indexing
- Create `.cursorrules` template for FABRK projects

**v0.dev:**
- Submit component library
- Provide Vercel v0 integration

**GitHub Copilot:**
- Publish to npm (indexed automatically)
- Add to VSCode extension marketplace

### 7.3 Launch Strategy

**Week 1: Soft Launch**
- Ship to ProductHunt as "Framework for AI Coders"
- Post on Twitter/X with demo video
- Share in AI coding Discord servers

**Week 2: Content Marketing**
- Blog post: "How to Build a SaaS in 10 Minutes with AI"
- YouTube tutorial: "Vibe Coding with FABRK"
- Dev.to article: "Framework Designed for AI Agents"

**Week 3: Community**
- Create Discord server
- Start weekly "Show Your Build" threads
- Launch affiliate program (20% revenue share)

---

## Phase 8: Testing & Quality (~3-4 days)

**Goal**: Ensure framework packages work reliably

### 8.1 Unit Tests for Packages

```typescript
// packages/ai/src/cost.test.ts
import { describe, it, expect } from 'vitest'
import { createCostTracker } from './cost'

describe('createCostTracker', () => {
  it('calculates Claude Sonnet cost correctly', async () => {
    const tracker = createCostTracker({ model: 'claude-sonnet-4-5' })
    const result = await tracker.track(async () => {
      return { inputTokens: 1000, outputTokens: 500 }
    })
    expect(result.cost).toBe(0.012) // $3/$15 per million tokens
  })
})
```

**Run tests:**
```bash
cd packages/ai
npm test
```

### 8.2 E2E Template Tests

```bash
# Test that templates actually work
npx create-fabrk-app test-basic --template basic
cd test-basic
npm install
npm run build # Should succeed

npx create-fabrk-app test-ai-saas --template ai-saas
cd test-ai-saas
npm install
npm run build # Should succeed
```

### 8.3 Bundle Size Tracking

```json
// package.json
{
  "scripts": {
    "size": "size-limit"
  }
}

// .size-limit.json
[
  {
    "path": "packages/components/dist/index.js",
    "limit": "50 KB"
  },
  {
    "path": "packages/ai/dist/index.js",
    "limit": "20 KB"
  }
]
```

**CI/CD:**
- GitHub Action that fails if bundle size increases >10%

---

## Phase 9: Migration Tooling (~2-3 days)

**Goal**: Help existing FABRK users migrate to framework

### 9.1 Migration CLI

```bash
npx @fabrk/migrate

# Detects:
# - Current FABRK boilerplate installation
# - Converts to use @fabrk/* packages
# - Updates imports
# - Creates fabrk.config.ts
# - Removes duplicated code
```

### 9.2 Migration Guide

```markdown
# Migrating from FABRK Boilerplate

## Automatic Migration (Recommended)

```bash
npx @fabrk/migrate
```

## Manual Migration

1. Install packages:
```bash
npm install @fabrk/core @fabrk/components @fabrk/ai
```

2. Replace imports:
```diff
- import { Button } from '@/components/ui/button'
+ import { Button } from '@fabrk/components'
```

3. Create config:
```typescript
// fabrk.config.ts
export default {
  ai: { costTracking: true },
  design: { theme: 'terminal' },
}
```

4. Delete old files:
- Remove `src/components/ui/*`
- Remove `src/lib/ai/*`
- Keep custom feature components
```

---

## Phase 10: Community & Support (~ongoing)

**Goal**: Build ecosystem around FABRK

### 10.1 Discord Server

**Channels:**
- `#announcements` - Framework updates
- `#showcase` - Apps built with FABRK
- `#help` - Support questions
- `#feature-requests` - Community suggestions
- `#ai-agents` - AI coding tips

### 10.2 GitHub Templates

```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml
│   ├── feature_request.yml
│   └── component_request.yml
├── PULL_REQUEST_TEMPLATE.md
└── FUNDING.yml  # Sponsors / donations
```

### 10.3 Examples Repository

```
fabrk-framework/examples/
├── ai-writing-tool/
├── dashboard-app/
├── chat-with-ai/
├── saas-starter/
└── admin-panel/
```

**Each example:**
- Working Next.js app
- Uses only @fabrk/* packages
- Includes README with "Built with FABRK" badge
- Deploy button (Vercel one-click)

---

## Updated Timeline (All Phases)

### With AI Assistance

| Phase | Duration | Effort | Deliverables |
|-------|----------|--------|--------------|
| Phase 1: Packages | 1-2 weeks | 30-40h | Monorepo, npm packages |
| Phase 2: Plugins | 3-4 days | 15-20h | Adapters, middleware |
| Phase 3: Config | 2-3 days | 8-12h | Type-safe config |
| Phase 4: CLI | 2-3 days | 8-12h | Scaffolding tool |
| Phase 5: Docs | 1 week | 20-30h | Framework docs |
| Phase 6: AGENTS.md | 3-4 days | 8-10h | Auto-generation |
| Phase 7: Marketing | 1 week | 15-20h | Launch, content |
| Phase 8: Testing | 3-4 days | 10-12h | Tests, CI/CD |
| Phase 9: Migration | 2-3 days | 6-8h | Migration CLI |
| Phase 10: Community | Ongoing | 5h/week | Discord, support |
| **Total** | **5-6 weeks** | **125-172h** | Production framework |

---

## Success Metrics (Updated)

### Technical
- [ ] All packages published to npm
- [ ] <100KB total bundle size (tree-shakeable)
- [ ] 90%+ test coverage on core packages
- [ ] <2s cold start for templates
- [ ] TypeScript strict mode passes

### Adoption
- [ ] 100+ npm downloads in week 1
- [ ] 50+ GitHub stars in month 1
- [ ] 10+ showcase apps built with FABRK
- [ ] 5+ community-contributed templates
- [ ] Featured in 1+ AI coding tool docs

### Community
- [ ] 50+ Discord members in month 1
- [ ] 20+ community PRs accepted
- [ ] 3+ blog posts/tutorials by users
- [ ] Active weekly engagement

### AI Integration
- [ ] Claude Code knows about FABRK (via docs)
- [ ] Cursor autocompletes @fabrk imports
- [ ] v0.dev can generate FABRK components
- [ ] AGENTS.md validates correctly

---

## Critical Dependencies

### Required Tools
- **pnpm** - Workspace management
- **turbo** - Monorepo builds
- **tsup** - Package bundling
- **changesets** - Versioning
- **size-limit** - Bundle tracking
- **vitest** - Testing

### Required Services
- **npm** - Package hosting
- **Vercel** - Docs hosting
- **GitHub** - Code + CI/CD
- **Discord** - Community
- **PostHog** (optional) - Analytics

### Required Skills
- TypeScript (strong)
- Monorepo management
- npm publishing
- API design
- Technical writing

---

## Risk Mitigation

### Risk: Breaking Changes
**Mitigation:** Strict semver, deprecation warnings, migration guides

### Risk: Adoption
**Mitigation:** Focus on AI tool integration, quality examples, active support

### Risk: Maintenance Burden
**Mitigation:** Automated testing, clear contribution guide, community involvement

### Risk: Competing Frameworks
**Mitigation:** Unique positioning (AI-first), superior DX, cost tracking built-in

---

## Next Steps

**Immediate Decision**: Start framework transformation?

**If YES - Week 1 Action Plan:**

**Day 1: Repository Setup**
1. Create new directory: `/Users/jasonpoindexter/Documents/GitHub/_active/fabrk-framework`
2. Initialize git repo: `git init && git branch -M main`
3. Create private GitHub repo: `gh repo create fabrk-framework --private`
4. Initial commit with README, .gitignore, LICENSE
5. Set up pnpm workspace structure

**Day 2: Monorepo Foundation**
1. Create `packages/` directory structure
2. Add `pnpm-workspace.yaml`
3. Add `turbo.json` for build orchestration
4. Create initial package.json files for each package

**Day 3: Extract Components Package**
1. Create `packages/components/` structure
2. Copy components from fabrk-dev to new repo
3. Set up build system (tsup)
4. Test first build

**Day 4: Test Component Extraction**
1. Verify all 70+ components build correctly
2. Create barrel exports (index.ts)
3. Test imports work

**Day 5: Extract AI Package**
1. Create `packages/ai/` structure
2. Copy AI toolkit from fabrk-dev
3. Set up peer dependencies
4. Test builds

**Weekend: Core Package**
1. Create `packages/core/` structure
2. Design framework API
3. Initial implementation

**After Week 1 Review:**
- Verify packages build correctly
- Test import/export works
- Decide on phase 2 timeline

**If NO:**
- Keep FABRK as boilerplate
- Focus on adding features (more components, better docs)
- Revisit framework idea in 6 months

**Recommendation**: With AI assistance, the framework is feasible in 5-6 weeks. The hardest part isn't the code (AI handles that) - it's the architecture decisions, marketing, and ensuring the API is intuitive for both humans AND AI agents.
