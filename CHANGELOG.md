# Changelog

## 0.1.0 (2025-02-09)

### Initial Release

First release of the FABRK Framework -- the first UI framework designed for AI coding agents.

#### Packages

- **`@fabrk/config` v0.1.0** -- Type-safe configuration builder with 12 sections and Zod validation
- **`@fabrk/design-system` v0.1.0** -- Terminal-inspired design system with 18 themes and design tokens
- **`@fabrk/core` v0.1.0** -- Framework runtime with plugins, middleware, teams, jobs, feature flags, and auto-wiring
- **`@fabrk/components` v0.1.0** -- 105+ production-ready UI components, 8 charts, dashboard shell, AI chat, admin, and security views
- **`@fabrk/ai` v0.1.0** -- AI development toolkit with cost tracking, validation, streaming, prompt builder, and LLM provider support
- **`@fabrk/payments` v0.1.0** -- Payment adapters for Stripe, Polar, and Lemon Squeezy
- **`@fabrk/auth` v0.1.0** -- Authentication adapters for NextAuth, API keys (SHA-256), and MFA (TOTP + backup codes)
- **`@fabrk/email` v0.1.0** -- Email adapters for Resend and console, with 4 built-in templates
- **`@fabrk/storage` v0.1.0** -- Storage adapters for S3, R2, and local filesystem
- **`@fabrk/security` v0.1.0** -- Security utilities for CSRF, CSP, rate limiting, audit logging, GDPR, bot protection, and CORS
- **`@fabrk/mcp` v0.1.0** -- Model Context Protocol server toolkit
- **`@fabrk/store-prisma` v0.1.0** -- Prisma store implementations with 7 database adapters and example schema
- **`@fabrk/ui` v0.1.0** -- Component registry for shadcn-style copy-into-project components
- **`@fabrk/themes` v0.1.0** -- Opt-in theming layer for the design system
- **`@fabrk/referrals` v0.1.0** -- Referral and affiliate marketing system
- **`create-fabrk-app` v0.1.0** -- CLI tool to scaffold new FABRK applications with `fabrk` dev CLI

#### Highlights

- **105+ UI components** including charts, dashboard shell, data tables, AI chat, and admin views
- **8 chart types** powered by Recharts (bar, line, area, pie, donut, radar, scatter, funnel)
- **18 themes** with runtime switching via CSS variables
- **1,723 tests** across 57 test files, all passing (including axe accessibility scans)
- **16 packages** publish-ready for npm
- **Adapter pattern** for all external services (payments, auth, email, storage, security)
- **In-memory defaults** for every store, enabling zero-config development
- **Auto-wiring** via `fabrk.config.ts` convention -- one config file creates all adapters
- **AI agent optimized** -- each package includes `AGENTS.md` with component props and usage examples
- **16 React hooks** -- useMediaQuery, useDebounce, useLocalStorage, useToast, useKeyboardShortcut, useEditLock, and more
- **40 Storybook stories** across 7 categories with autodocs
- **Accessibility** -- All custom interactive components pass axe scans with keyboard navigation
- **TypeDoc API reference** -- `pnpm docs:api` generates full API docs for all 14 packages
- **Tree-shakeable** -- `sideEffects: false` on all 15 publishable packages
- **JSDoc** -- 27 top components documented with @example blocks
- **Dual module support** -- ESM + CJS builds with TypeScript declarations for every package
