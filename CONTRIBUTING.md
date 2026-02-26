# Contributing to FABRK Framework

Thank you for your interest in contributing to FABRK Framework. This guide will help you get started.

## Prerequisites

- **Node.js 22+** ([download](https://nodejs.org/))
- **pnpm 9+** (`npm install -g pnpm`)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/jpoindexter/fabrk-framework.git
cd fabrk-framework

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type-check
pnpm type-check
```

## Project Structure

```
packages/
  config/          # @fabrk/config — Type-safe config builder (Zod schemas)
  design-system/   # @fabrk/design-system — 18 themes, design tokens, mode object
  core/            # @fabrk/core — Framework runtime, plugins, middleware, utilities
  components/      # @fabrk/components — 109+ UI components, 11 charts, dashboard shell, 15 hooks
  ai/              # @fabrk/ai — AI toolkit (cost tracking, validation, streaming)
  payments/        # @fabrk/payments — Stripe, Polar, Lemon Squeezy adapters
  auth/            # @fabrk/auth — NextAuth, API keys, MFA
  email/           # @fabrk/email — Resend adapter + templates
  storage/         # @fabrk/storage — S3, R2, local filesystem adapters
  security/        # @fabrk/security — CSRF, CSP, rate limiting, audit, GDPR
  store-prisma/    # @fabrk/store-prisma — Prisma database adapters
  framework/       # fabrk — Meta-package: vinext + AI agents, tools, MCP, dashboard
  cli/             # create-fabrk-app — CLI scaffolding tool
```

Dependencies flow in this order:

```
config, design-system (foundational, no deps)
  -> core
    -> payments, auth, email, storage, security, store-prisma
    -> ai, components
    -> framework (fabrk meta-package)
```

## Development Workflow

### Making Changes

When a change affects multiple packages, make changes in dependency order:

1. `@fabrk/config` / `@fabrk/design-system` (foundational)
2. `@fabrk/core`
3. Adapter packages (`payments`, `auth`, `email`, `storage`, `security`)
4. `@fabrk/components`, `@fabrk/ai`

Turbo handles the build order automatically, so running `pnpm build` at the root always builds in the correct sequence.

### Running Tests

```bash
# Run all tests (858 across all test files)
pnpm test

# Watch mode
pnpm test:watch
```

### Type Checking

```bash
# Check all packages
pnpm type-check
```

### Linting

```bash
# Lint all packages
pnpm lint
```

### Clean Rebuild

If you run into stale caches or broken builds:

```bash
pnpm clean
pnpm install
pnpm build
```

## Adding a Component

1. **Create the component file** in `packages/components/src/ui/`:

   ```tsx
   // packages/components/src/ui/my-widget.tsx
   'use client'

   import * as React from 'react'
   import { cn } from '@fabrk/core'
   import { mode } from '@fabrk/design-system'

   export interface MyWidgetProps {
     title: string
     className?: string
   }

   export function MyWidget({ title, className }: MyWidgetProps) {
     return (
       <div className={cn("border border-border bg-card p-4", mode.radius, className)}>
         <h3 className="text-xs font-mono uppercase text-muted-foreground">
           {title}
         </h3>
       </div>
     )
   }
   ```

2. **Follow the design system rules** (see [Design System Rules](#design-system-rules) below).

3. **Add to the barrel export**:

   ```tsx
   // packages/components/src/index.ts
   export * from './ui/my-widget'
   ```

4. **Add a rendering test** in `packages/components/src/__tests__/`:

   ```tsx
   import { describe, it, expect } from 'vitest'
   import { render } from '@testing-library/react'
   import { MyWidget } from '../ui/my-widget'

   describe('MyWidget', () => {
     it('renders with title', () => {
       const { getByText } = render(<MyWidget title="Test" />)
       expect(getByText('Test')).toBeDefined()
     })
   })
   ```

5. **Verify the build**:

   ```bash
   cd packages/components
   pnpm build
   pnpm type-check
   ```

## Adding an Adapter

Adapters wrap external services behind interfaces defined in `@fabrk/core`.

1. **Create the adapter file** in the appropriate package's `src/` directory:

   ```tsx
   // packages/email/src/my-provider.ts
   import type { EmailAdapter } from '@fabrk/core'

   export function createMyProviderAdapter(apiKey: string): EmailAdapter {
     return {
       async send({ to, subject, html }) {
         // Implementation here
       },
     }
   }
   ```

2. **Add tests** verifying the adapter conforms to the interface:

   ```tsx
   import { describe, it, expect } from 'vitest'
   import { createMyProviderAdapter } from '../my-provider'

   describe('MyProviderAdapter', () => {
     it('implements the EmailAdapter interface', () => {
       const adapter = createMyProviderAdapter('test-key')
       expect(typeof adapter.send).toBe('function')
     })
   })
   ```

3. **Export from the package barrel**:

   ```tsx
   // packages/email/src/index.ts
   export * from './my-provider'
   ```

4. **Build and test**:

   ```bash
   pnpm build
   pnpm test
   pnpm type-check
   ```

## Commit Guidelines

Use [conventional commits](https://www.conventionalcommits.org/):

| Prefix     | Use for                                |
|------------|----------------------------------------|
| `feat:`    | New feature or component               |
| `fix:`     | Bug fix                                |
| `docs:`    | Documentation changes                  |
| `chore:`   | Maintenance, dependency updates        |
| `refactor:`| Code restructuring without behavior change |
| `test:`    | Adding or updating tests               |

Examples:

```bash
git commit -m "feat: add MyWidget component to @fabrk/components"
git commit -m "fix: resolve mode.radius missing on Card border"
git commit -m "docs: update CONTRIBUTING.md with adapter guide"
```

## Pull Request Process

1. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feat/my-widget
   ```

   Branch naming conventions:
   - `feat/description` for features
   - `fix/description` for bug fixes
   - `docs/description` for documentation
   - `chore/description` for maintenance

2. **Make your changes** following the guidelines in this document.

3. **Ensure all checks pass** before submitting:

   ```bash
   pnpm build
   pnpm test
   pnpm type-check
   pnpm lint
   ```

4. **Create a changeset** if your change affects published packages:

   ```bash
   pnpm changeset
   ```

5. **Open a pull request** against `main` with a clear description:
   - What changed and why
   - Which packages are affected
   - How to test the change

6. **All CI checks must pass** before merging (build, test, type-check, lint).

## Design System Rules

These rules are critical for maintaining visual consistency across all 18 themes.

### 1. Full borders require `mode.radius`

When an element has a full border (`border`, `border-2`), always apply `mode.radius`:

```tsx
// Correct
<Card className={cn("border border-border", mode.radius)}>

// Wrong - hardcoded radius breaks theme switching
<Card className="border border-border rounded-lg">
```

### 2. Partial borders must NOT have `mode.radius`

When using directional borders (`border-t`, `border-b`, `border-l`, `border-r`), never add `mode.radius`:

```tsx
// Correct
<div className="border-t border-border">

// Wrong
<div className={cn("border-t border-border", mode.radius)}>
```

Table cells (`<th>`, `<td>`) and switches (`rounded-full`) are also exceptions.

### 3. Use design tokens, not hardcoded colors

```tsx
// Correct - semantic tokens
className="bg-primary text-primary-foreground"
className="bg-card border-border"
className="text-muted-foreground"

// Wrong - hardcoded colors break theming
className="bg-blue-500 text-white"
className="bg-gray-100"
```

Available tokens: `bg-background`, `bg-card`, `bg-muted`, `bg-primary`, `bg-secondary`, `bg-destructive`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-primary`.

### 4. Terminal text casing

| Element          | Casing                              | Example              |
|------------------|-------------------------------------|----------------------|
| Labels / Badges  | UPPERCASE                           | `[SYSTEM]`           |
| Buttons          | UPPERCASE with `>` prefix           | `> SUBMIT`           |
| Headlines (H1/H2)| UPPERCASE                          | `WELCOME TO YOUR APP`|
| Body text        | Normal sentence case                | "Get started by..."  |

Never use underscores in user-facing text -- use spaces instead.

## Publishing

Maintainers handle releases using Changesets:

```bash
pnpm changeset version
pnpm build
pnpm release
```

## Questions?

Open an issue at [github.com/jpoindexter/fabrk-framework/issues](https://github.com/jpoindexter/fabrk-framework/issues).
