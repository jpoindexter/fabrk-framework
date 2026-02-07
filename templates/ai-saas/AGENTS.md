# AGENTS.md — FABRK AI SaaS App

## Stack

| | |
|---|---|
| **Framework** | Next.js 15 (App Router) + React 19 |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS 4 + FABRK Design System |
| **UI Library** | @fabrk/components (70+ components) |
| **AI Toolkit** | @fabrk/ai (cost tracking, validation, streaming, prompts) |
| **Config** | @fabrk/config (fabrk.config.ts) |
| **AI SDK** | Vercel AI SDK (@ai-sdk/openai) |

## Quick Start

```bash
cp .env.example .env.local
# Add your OPENAI_API_KEY or ANTHROPIC_API_KEY
pnpm install && pnpm dev
```

## FABRK Packages Available

```typescript
// UI
import { Button, Card, TokenCounter, UsageBar } from '@fabrk/components'

// Framework
import { FabrkProvider, useCostTracking, useNotifications, cn } from '@fabrk/core'

// Design System
import { mode } from '@fabrk/design-system'

// AI Toolkit
import { createCostTracker, createPromptTemplate, streamText } from '@fabrk/ai'

// Config
import { defineFabrkConfig } from '@fabrk/config'
```

## Key Features

### Cost Tracking

```tsx
import { useCostTracking } from '@fabrk/core'

function Dashboard() {
  const { todaysCost, budget, percentUsed, withinBudget } = useCostTracking()
  return (
    <UsageBar current={todaysCost} max={budget} label="AI BUDGET" />
  )
}
```

### AI Streaming

```tsx
import { streamText } from '@fabrk/ai'

// In API route
const stream = await streamText({
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: prompt }],
})
```

### Prompt Templates

```tsx
import { createPromptTemplate } from '@fabrk/ai'

const summarize = createPromptTemplate({
  name: 'summarize',
  template: 'Summarize the following in {{style}} style:\n\n{{content}}',
  variables: { style: 'concise', content: '' },
})
```

## Critical Rules

### 1. USE @fabrk/components — DON'T rebuild from scratch

### 2. USE design tokens — NEVER hardcode colors

`bg-primary`, `text-foreground`, `border-border` etc.

### 3. USE mode.radius for full borders

```tsx
className={cn("border border-border", mode.radius)}
```

### 4. Terminal text casing

- Labels: UPPERCASE `[SYSTEM]`
- Buttons: `> SUBMIT`
- Headlines: UPPERCASE

## Configuration

```typescript
// fabrk.config.ts
import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  ai: {
    costTracking: true,
    providers: ['claude', 'openai'],
    budget: { daily: 50, monthly: 1000 },
  },
  design: { theme: 'terminal' },
  notifications: { enabled: true },
})
```

## Project Structure

```
app/
  layout.tsx         ← Root layout with FabrkProvider
  page.tsx           ← Home page
  api/               ← API routes (AI endpoints)
  globals.css
fabrk.config.ts      ← FABRK configuration
prisma/
  schema.prisma      ← User, ApiKey, AICostLog, Subscription, Notification
.env.example         ← API keys + database URL
```

## Commands

```bash
pnpm dev                              # Start dev server
pnpm build                            # Production build
fabrk lint                            # FABRK compliance check
fabrk generate api chat               # Scaffold API route
fabrk generate component CostCard     # Scaffold component
```

## Environment Variables

```bash
OPENAI_API_KEY=          # OpenAI API key
ANTHROPIC_API_KEY=       # Anthropic API key
AI_DAILY_BUDGET=50       # Daily cost limit ($)
DATABASE_URL=            # PostgreSQL URL (optional)
```
