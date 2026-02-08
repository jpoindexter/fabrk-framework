# Contributing to FABRK Framework

Thank you for your interest in contributing to FABRK!

## Development Setup

1. **Prerequisites**
   - Node.js 22+
   - pnpm 9+

2. **Clone and Install**
   ```bash
   git clone https://github.com/jpoindexter/fabrk-framework.git
   cd fabrk-framework
   pnpm install
   ```

3. **Build Packages**
   ```bash
   pnpm build
   ```

## Monorepo Structure

```
fabrk-framework/
├── packages/
│   ├── core/              # @fabrk/core — Runtime, plugins, middleware, hooks
│   ├── config/            # @fabrk/config — Zod config schemas
│   ├── components/        # @fabrk/components — 70+ UI components
│   ├── themes/            # @fabrk/themes — Design tokens, theme provider
│   ├── ui/                # @fabrk/ui — Component registry (shadcn-style)
│   ├── ai/                # @fabrk/ai — LLM providers, cost tracking, streaming
│   ├── auth/              # @fabrk/auth — NextAuth, API keys, MFA
│   ├── payments/          # @fabrk/payments — Stripe, Polar, Lemon Squeezy
│   ├── email/             # @fabrk/email — Resend adapter, templates
│   ├── storage/           # @fabrk/storage — S3, R2, local filesystem
│   ├── security/          # @fabrk/security — CSRF, CSP, rate limiting, audit
│   ├── mcp/               # @fabrk/mcp — Model Context Protocol toolkit
│   ├── design-system/     # @fabrk/design-system — Base design tokens
│   ├── referrals/         # @fabrk/referrals — Referral system
│   ├── store-prisma/      # @fabrk/store-prisma — Prisma store adapters
│   └── cli/               # create-fabrk-app + fabrk CLI
├── templates/             # Starter templates (basic, ai-saas, dashboard)
├── examples/
│   ├── basic-usage/       # Basic usage example
│   └── docs/              # Documentation site (dogfoods FABRK)
```

## Development Workflow

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Edit files in appropriate package
   - Add tests if applicable
   - Update documentation

3. **Build and Test**
   ```bash
   pnpm build
   pnpm test
   pnpm type-check
   ```

4. **Create Changeset**
   ```bash
   pnpm changeset
   ```
   Follow prompts to describe your changes

5. **Commit**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

6. **Push and PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub

## Commit Convention

We use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `test:` - Test changes

## Design System Rules

When working on components, follow these rules:

- **Full borders** (`border`, `border-2`) — ALWAYS add `mode.radius`
- **Partial borders** (`border-t`, `border-b`) — NEVER add `mode.radius`
- **Design tokens only** — Use `bg-primary`, `text-foreground`, never `bg-blue-500`
- **Terminal casing** — Labels: `UPPERCASE`, Buttons: `> SUBMIT`, Body: sentence case

## Publishing

Maintainers will handle releases using Changesets:

```bash
pnpm changeset version
pnpm build
pnpm release
```

## Questions?

Open a GitHub issue or start a discussion.
