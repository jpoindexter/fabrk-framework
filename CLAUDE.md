# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FABRK Framework is a monorepo that provides the first UI framework designed specifically for AI coding agents. It enables AI assistants (Claude Code, Cursor, GitHub Copilot, v0.dev) to build full-stack applications in minutes by importing pre-built components and tools instead of writing everything from scratch.

**Tech Stack:** TypeScript 5.x • pnpm workspaces • Turbo monorepo • React 19 • Next.js 16 • Changesets for versioning

**Requirements:** Node.js 22+ • pnpm 9+

**Source Material:** Code extracted from the `fabrk-dev` boilerplate (sibling repo)

---

## Commands

```bash
# Setup
pnpm install              # Install all dependencies (run this first!)

# Development
pnpm dev                  # Build all packages in watch mode
pnpm build                # Build all packages for production
pnpm type-check           # TypeScript validation across all packages
pnpm lint                 # Lint all packages
pnpm test                 # Run all 748 tests
pnpm clean                # Remove all build artifacts

# Quality
pnpm size                 # Bundle size tracking (7 packages)
pnpm storybook            # Launch Storybook at localhost:6006
pnpm build-storybook      # Build static Storybook site

# Package-specific (from package directory)
cd packages/components
pnpm build                # Build single package
pnpm dev                  # Watch mode for single package

# Documentation
pnpm generate-docs        # Generate AGENTS.md files for AI agents

# Version Management
pnpm changeset            # Create a changeset for versioning
pnpm version-packages     # Version packages based on changesets
pnpm release              # Build and publish to npm
```

---

## Architecture

This is a **pnpm workspace monorepo** orchestrated by **Turbo**. Dependencies flow from foundational packages outward:

```
@fabrk/config (foundational — Zod schemas, no deps)
@fabrk/design-system (foundational — 18 themes, design tokens, no deps)
    ↓
@fabrk/core (depends on config, design-system)
    ↓
@fabrk/payments (depends on core)
@fabrk/auth (depends on core)
@fabrk/email (depends on core)
@fabrk/storage (depends on core)
@fabrk/security (depends on core)
@fabrk/store-prisma (depends on core)
    ↓
@fabrk/ai (depends on core)
@fabrk/components (depends on core, design-system)
    ↓
Templates & Examples (depend on all packages)
```

### Package Structure

```
fabrk-framework/
├── packages/
│   ├── config/            # @fabrk/config - Type-safe config builder (12 sections, Zod)
│   ├── design-system/     # @fabrk/design-system - 18 themes, design tokens
│   ├── core/              # @fabrk/core - Framework runtime, plugins, middleware, teams, jobs, flags
│   ├── components/        # @fabrk/components - 105+ UI components, 8 charts, dashboard shell, component registry
│   ├── ai/                # @fabrk/ai - AI toolkit (cost tracking, streaming, LLM providers, embeddings)
│   ├── payments/          # @fabrk/payments - Stripe, Polar, Lemon Squeezy adapters
│   ├── auth/              # @fabrk/auth - NextAuth, API keys, MFA (TOTP + backup codes)
│   ├── email/             # @fabrk/email - Resend adapter + email templates
│   ├── storage/           # @fabrk/storage - S3, R2, local filesystem adapters
│   ├── security/          # @fabrk/security - CSRF, CSP, rate limiting, audit, GDPR, CORS
│   ├── store-prisma/      # @fabrk/store-prisma - 7 Prisma store adapters
│   └── cli/               # create-fabrk-app - CLI scaffolding tool
├── templates/             # Starter templates (basic, ai-saas, dashboard)
├── examples/              # Example applications (basic-usage, docs, saas-analytics, ecommerce)
├── tasks/                 # Task tracking (todo.md, lessons.md)
└── docs/                  # Design docs and plans
```

### Package Build System

Each package uses:
- **tsup** for building (ESM + CJS + TypeScript declarations)
- **TypeScript** for type checking
- Exports via `package.json` `exports` field for proper module resolution
- Source maps enabled for debugging
- Peer dependencies for React/Next.js to avoid version conflicts

Build order is handled automatically by Turbo based on `^build` dependencies in `turbo.json`.

---

## Key Design Patterns

### 1. Dynamic Design System (mode)

All components use the `mode` design system from `@fabrk/design-system` for theme-aware styling. The design system is **runtime-dynamic** via CSS variables.

**Critical Rules:**
- **Full borders** (`border`, `border-2`) → ALWAYS add `mode.radius`
- **Partial borders** (`border-t`, `border-b`, `border-l`, `border-r`) → NEVER add `mode.radius`
- **Table cells** (`<th>`, `<td>`) → NEVER add `mode.radius` (breaks layout)
- **Switches** → Always `rounded-full` (pill-shaped by design)

**Allowed:**
```tsx
import { mode } from '@fabrk/design-system'

// Full border - needs mode.radius
<Card className={cn("border border-border", mode.radius)}>

// Partial border - NO mode.radius
<div className="border-t border-border">

// Button with all mode properties
<Button className={cn(mode.radius, mode.font, "text-xs")}>
```

**Banned:**
```tsx
// Hardcoded colors break theme switching
<div className="bg-purple-500 text-white">

// Missing mode.radius on full border
<Card className="border rounded-lg">
```

### 2. Terminal Text Casing

| Element | Casing | Example |
|---------|--------|---------|
| UI Labels/Badges | UPPERCASE | `[SYSTEM]`, `[STATUS]` |
| Buttons | UPPERCASE with `>` prefix | `> SUBMIT`, `> CONTINUE` |
| Headlines (H1/H2) | UPPERCASE | `WELCOME TO YOUR APP` |
| Body Text | Normal sentence case | "Get started by..." |

**Never use underscores in user-facing text** - use spaces for readability.

### 3. Design Tokens Only

```tsx
// GOOD - Uses semantic tokens
className="bg-primary text-primary-foreground"
className="bg-card border-border"

// BAD - Hardcoded colors break theming
className="bg-blue-500 text-white"
className="bg-gray-100"
```

Available tokens:
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`, `bg-primary`, `bg-secondary`, `bg-destructive`
- Text: `text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`, `text-success`
- Borders: `border-border`, `border-primary`

### 4. Workspace Dependencies

Packages reference each other via `workspace:*` protocol:

```json
{
  "dependencies": {
    "@fabrk/design-system": "workspace:*",
    "@fabrk/core": "workspace:*"
  }
}
```

pnpm automatically links local packages during development.

---

## Development Workflow

### Adding Components

When extracting or adding components from fabrk-dev:

1. **Copy files to appropriate package:**
   ```bash
   # UI components
   cp -r ../fabrk-dev/src/components/ui/button.tsx packages/components/src/ui/

   # Charts
   cp -r ../fabrk-dev/src/components/charts/bar-chart.tsx packages/components/src/charts/
   ```

2. **Update imports:**
   ```tsx
   // Remove @ path aliases
   - import { cn } from '@/lib/utils'
   + import { cn } from '@fabrk/core'

   // Update design system imports
   - import { mode } from '@/design-system'
   + import { mode } from '@fabrk/design-system'
   ```

3. **Add to barrel export:**
   ```tsx
   // packages/components/src/index.ts
   export * from './ui/button'
   export * from './charts/bar-chart'
   ```

4. **Test build:**
   ```bash
   cd packages/components
   pnpm build
   ```

### Adding Features to Packages

1. Create feature files in package's `src/` directory
2. Export from package's `src/index.ts`
3. Run `pnpm type-check` to validate TypeScript
4. Run `pnpm build` to ensure it builds correctly
5. Create changeset: `pnpm changeset`

### Working Across Packages

When a change affects multiple packages:

1. Make changes in dependency order (design-system → core → components)
2. Build affected packages: `pnpm build`
3. Test dependents rebuild correctly
4. Create changesets for all affected packages

---

## Testing Changes

```bash
# Type check everything
pnpm type-check

# Build everything (verifies exports)
pnpm build

# Test specific package
cd packages/components
pnpm build
pnpm type-check

# Clean slate rebuild
pnpm clean
pnpm install
pnpm build
```

---

## Important Files

- **`pnpm-workspace.yaml`** - Defines workspace packages
- **`turbo.json`** - Build pipeline configuration
- **`tsconfig.json`** - Base TypeScript config (extended by packages)
- **`.changeset/config.json`** - Versioning configuration
- **`package.json` (root)** - Workspace scripts and shared dev dependencies
- **`packages/*/package.json`** - Individual package configs with exports

### Package.json Exports Pattern

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

This enables proper ESM/CJS dual-module support and TypeScript resolution.

---

## Non-Obvious Patterns (Gotchas)

1. **Vitest split**: Root `vitest.config.ts` runs all non-component tests. `packages/components` has its own vitest config with `jsdom` environment. Root excludes `packages/components/src/__tests__/**`.

2. **`"use client"` banner**: The components package uses tsup's `banner` option to inject `"use client"` at the top of every output file. This is needed for Next.js App Router compatibility. Components using hooks or event handlers work because of this — don't add `"use client"` manually to individual component files.

3. **`cn()` lives in `@fabrk/core`**: Not `@/lib/utils` or `@/utils`. Every import transformation from fabrk-dev must change `import { cn } from '@/lib/utils'` to `import { cn } from '@fabrk/core'`.

4. **Adapter + Store patterns**: All external services use adapter interfaces from `@fabrk/core`. Every store (CostStore, TeamStore, AuditStore, etc.) has an in-memory default for dev/testing. Real implementations (Prisma, etc.) are injected at runtime.

5. **Web Crypto API**: Used throughout for hashing, tokens — no Node.js `crypto` module. This ensures compatibility with edge runtimes (Cloudflare Workers, Vercel Edge).

6. **`pnpm size` not `size`**: On macOS, `size` is a system binary. Use `npx size-limit` or the `pnpm size` script which wraps it correctly.

---

## Component Extraction Process

This monorepo is being built by extracting code from the fabrk-dev boilerplate. When extracting:

### From fabrk-dev to this repo:

1. **Components:** `fabrk-dev/src/components/` → `packages/components/src/`
2. **AI utilities:** `fabrk-dev/src/lib/ai/` → `packages/ai/src/`
3. **Design system:** `fabrk-dev/src/design-system/` → `packages/design-system/src/`

### Import transformations:

```tsx
// fabrk-dev imports (path aliases)
import { Button } from '@/components/ui/button'
import { mode } from '@/design-system'
import { cn } from '@/lib/utils'

// Transform to framework imports (explicit packages)
import { Button } from '@fabrk/components'
import { mode } from '@fabrk/design-system'
import { cn } from '@fabrk/core'
```

### Preserve:

- All design system rules (see DESIGN_SYSTEM_RULES.md)
- Component prop types and interfaces
- Terminal aesthetic (monospace font, uppercase buttons, bracket labels)
- Accessibility attributes

### Remove:

- `@/` path aliases
- Next.js-specific imports (unless in templates)
- Application-specific business logic

---

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

## Engineering Preferences

These guide all code review and implementation decisions:

- **DRY is important** — flag repetition aggressively
- **Well-tested code is non-negotiable** — rather have too many tests than too few
- **"Engineered enough"** — not under-engineered (fragile, hacky) and not over-engineered (premature abstraction, unnecessary complexity)
- **Handle more edge cases, not fewer** — thoughtfulness > speed
- **Explicit over clever** — bias toward readability

---

## Plan Mode Review Process

When reviewing a plan before implementation, evaluate these areas in order. For every issue found: describe concretely with file/line references, present 2-3 options (including "do nothing"), specify effort/risk/impact for each, give an opinionated recommendation, then ask for input before proceeding.

### Review Areas

1. **Architecture**: System design, component boundaries, dependency graph, coupling, data flow, scaling, security (auth, data access, API boundaries)
2. **Code Quality**: Organization, module structure, DRY violations (aggressive), error handling, edge cases (explicit), tech debt hotspots, over/under-engineering
3. **Tests**: Coverage gaps (unit/integration/e2e), assertion strength, missing edge cases, untested failure modes and error paths
4. **Performance**: N+1 queries, memory usage, caching opportunities, slow/high-complexity code paths

### Review Workflow

- **Before starting**: Ask if BIG CHANGE (4 top issues per section, interactive) or SMALL CHANGE (1 question per section)
- Number issues and letter options (e.g., "Issue #1, Option A")
- Recommended option always listed first
- Pause after each section for feedback
- Do not assume priorities on timeline or scale

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Git Workflow

```bash
# Make changes
git add .
git commit -m "feat: extract UI components from fabrk-dev"
git push origin main

# Use conventional commits
# feat: new feature
# fix: bug fix
# docs: documentation
# chore: maintenance
# refactor: code refactoring
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Type errors after adding dependency | Run `pnpm install` at root |
| Build fails on package | Check `tsconfig.json` extends root config |
| Import not found | Verify package exports in `package.json` |
| Turbo cache stale | Run `pnpm clean && pnpm build` |
| Workspace link broken | Delete `node_modules`, run `pnpm install` |

---

## Reference Documentation

Read these files for context:

- **CONTRIBUTING.md** - How to contribute (setup, adding components/adapters, design rules)
- **CHANGELOG.md** - Release history
- **DESIGN_SYSTEM_RULES.md** - Design rules to preserve
- **COMPONENT_INVENTORY.md** - List of all 105+ components

### Current Stats

- **17/17 packages build** (12 packages + 5 examples)
- **748 tests**, all passing (353 root + 395 components)
- **109+ components**, 15 hooks, 11 chart types, 18 themes
- **12 packages**, ~43K source lines
- **5 examples**: basic-usage, docs site, saas-analytics, ecommerce, agent-demo
- **Docs site**: 40+ pages with Cmd+K search, sticky TOC, mobile nav, 18-theme switcher
- **Bundle size tracking**: 7 packages tracked via size-limit, all within limits
- **6 passes of adversarial security audits** — enterprise-grade hardening

---

## For AI Agents Reading This

This framework exists to make YOUR job easier. Instead of generating 500 lines of custom components from scratch, you can:

```typescript
// When user says: "Build me a dashboard"
// You generate this:
import {
  DashboardShell, DashboardHeader, StatsGrid, TierBadge,
  BarChart, LineChart, KPICard, DataTable
} from '@fabrk/components'
import { mode } from '@fabrk/design-system'

export default function Dashboard() {
  return (
    <DashboardShell
      sidebarItems={[
        { id: 'overview', label: 'Overview', href: '/dashboard' },
        { id: 'repos', label: 'Repos', href: '/dashboard/repos' },
      ]}
      user={{ name: 'Jason', tier: 'pro' }}
      logo={<span className="text-accent text-xl">#</span>}
      onSignOut={() => signOut()}
    >
      <DashboardHeader title="Overview" />
      <StatsGrid items={[
        { label: 'Files', value: 1572 },
        { label: 'Components', value: 279, change: '+12%' },
      ]} />
      <LineChart data={weekTrend} />
    </DashboardShell>
  )
}
```

Result: Full dashboard with sidebar, responsive layout, KPIs, charts — in minutes.

Each package includes `AGENTS.md` files documenting all components, props, and usage examples specifically for AI consumption.
