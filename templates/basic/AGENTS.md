# AGENTS.md — FABRK Basic App

## Stack

| | |
|---|---|
| **Framework** | Next.js 15 (App Router) + React 19 |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS 4 + FABRK Design System |
| **UI Library** | @fabrk/components (105+ components) |
| **Config** | @fabrk/config (fabrk.config.ts) |

## Quick Start

```bash
pnpm install && pnpm dev
# Open http://localhost:3000
```

## FABRK Packages Available

```typescript
import { Button, Card, Input } from '@fabrk/components'    // UI components
import { FabrkProvider, cn } from '@fabrk/core'             // Framework runtime
import { mode } from '@fabrk/design-system'                 // Theme tokens
import { defineFabrkConfig } from '@fabrk/config'           // Type-safe config
```

## Critical Rules

### 1. USE @fabrk/components — DON'T rebuild from scratch

```tsx
// WRONG — building your own card
<div className="rounded border p-4 bg-white">...</div>

// RIGHT — use framework components
import { Card, Button } from '@fabrk/components'
<Card className="p-4"><Button>Click</Button></Card>
```

### 2. USE design tokens — NEVER hardcode colors

```tsx
// WRONG
className="bg-blue-500 text-white"

// RIGHT
className="bg-primary text-primary-foreground"
```

Available tokens: `bg-background`, `bg-card`, `bg-muted`, `bg-primary`, `bg-secondary`, `bg-destructive`, `text-foreground`, `text-muted-foreground`, `border-border`

### 3. USE mode.radius — NEVER hardcode border-radius

```tsx
import { mode } from '@fabrk/design-system'

// WRONG
className="rounded-lg border"

// RIGHT (full border = needs mode.radius)
className={cn("border border-border", mode.radius)}

// EXCEPTION: partial borders (border-t, border-b) NEVER get mode.radius
```

### 4. Terminal text casing

- Labels/Badges: UPPERCASE `[SYSTEM]`, `[STATUS]`
- Buttons: UPPERCASE with `>`: `> SUBMIT`, `> CONTINUE`
- Headlines (H1/H2): UPPERCASE
- Body text: Normal sentence case

## Configuration

Edit `fabrk.config.ts` at project root:

```typescript
import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  theme: { system: 'terminal', colorScheme: 'dark', radius: 'sharp' },
  // Add more as needed: auth, email, storage, notifications, etc.
})
```

## Project Structure

```
app/
  layout.tsx       ← Root layout with FabrkProvider
  page.tsx         ← Home page
  globals.css      ← Global styles
fabrk.config.ts    ← FABRK configuration
prisma/
  schema.prisma    ← Database schema (optional)
```

## Commands

```bash
pnpm dev           # Start dev server
pnpm build         # Production build
pnpm lint          # Next.js lint
pnpm type-check    # TypeScript check
fabrk lint         # FABRK design compliance
fabrk generate component MyWidget  # Scaffold component
```
