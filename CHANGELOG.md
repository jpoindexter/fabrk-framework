# Changelog

## 0.2.0 (2026-02-25)

### Package Consolidation

Consolidated from 17 packages down to 12 focused packages (~43K source lines, 763 tests).

**Removed packages:**
- `@fabrk/themes` -- merged into `@fabrk/design-system`
- `@fabrk/ui` -- merged into `@fabrk/components`
- `@fabrk/mcp` -- removed (niche)
- `@fabrk/referrals` -- removed (niche)
- `@fabrk/framework` -- removed (unused)

**Current 12 packages:** `@fabrk/config`, `@fabrk/design-system`, `@fabrk/core`, `@fabrk/components`, `@fabrk/ai`, `@fabrk/payments`, `@fabrk/auth`, `@fabrk/email`, `@fabrk/storage`, `@fabrk/security`, `@fabrk/store-prisma`, `create-fabrk-app`

---

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
- **`@fabrk/store-prisma` v0.1.0** -- Prisma store implementations with 7 database adapters and example schema
- **`create-fabrk-app` v0.1.0** -- CLI tool to scaffold new FABRK applications with `fabrk` dev CLI

#### Highlights

- **105+ UI components** including charts, dashboard shell, data tables, AI chat, and admin views
- **8 chart types** powered by Recharts (bar, line, area, pie, donut, radar, scatter, funnel)
- **18 themes** with runtime switching via CSS variables
- **12 packages** publish-ready for npm
- **Adapter pattern** for all external services (payments, auth, email, storage, security)
- **In-memory defaults** for every store, enabling zero-config development
- **Auto-wiring** via `fabrk.config.ts` convention -- one config file creates all adapters
- **AI agent optimized** -- each package includes `AGENTS.md` with component props and usage examples
- **16 React hooks** -- useMediaQuery, useDebounce, useLocalStorage, useToast, useKeyboardShortcut, useEditLock, and more
- **Accessibility** -- All custom interactive components pass axe scans with keyboard navigation
- **Tree-shakeable** -- `sideEffects: false` on all publishable packages
- **JSDoc** -- 27 top components documented with @example blocks
- **Dual module support** -- ESM + CJS builds with TypeScript declarations for every package
