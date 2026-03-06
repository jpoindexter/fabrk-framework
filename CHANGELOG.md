# Changelog

## 0.3.0 (2026-03-06)

### @fabrk/framework — New Package

Added `@fabrk/framework` — the full-stack runtime package with own Vite 7 file-system routing, SSR, AI agent system, tool executor, MCP client, developer dashboard, and CLI (`fabrk dev/build/start`).

Key capabilities:
- File-system routing with layouts, dynamic segments, middleware
- SSR with `renderToString` / `renderToReadableStream`
- AI agent system: `defineAgent()`, `defineTool()`, `runAgentLoop()`, approval workflow, budget guards
- ReAct loop: async generator, `stopWhen`, `handoffs`, tool executor with 30s timeout + 50K truncation
- Memory: per-thread `MemoryStore`, working memory injection, long-term `LongTermStore`
- Orchestration: `defineWorkflow()`, `defineStateGraph()` (cyclic), `defineAgentNetwork()`, parallel eval runner
- MCP client with OAuth 2.0 bearer/client-credentials and elicitation support
- Developer dashboard at `/__ai` with SSE real-time call inspector, dataset export, call history
- A2A protocol: `createA2AServer()`, `A2AClient`, `/.well-known/agent.json` discovery
- OTel tracing config in `FabrkConfig.tracing`
- Built-in tools: `sqlQueryTool()`, `ragTool()`
- Testing utilities: `mockLLM()`, `createTestAgent()`, eval runner
- CLI: `fabrk dev`, `fabrk build`, `fabrk start`, `fabrk agents`, `fabrk check`, `fabrk test`

### Security Hardening (Rounds 3–12)

12 rounds of adversarial security auditing. Total: 2,677 tests.

**Rounds 3–7** (commits 244259c–612a0fd):
- Open redirect prevention on all redirect paths (same-origin validation)
- Approval TTL enforcement (expired approvals auto-rejected)
- Budget bypass fix (daily cost accumulation with LRU-capped agent map, 1000 limit)
- Regex injection prevention (`patternToRegex` sanitizes user-supplied patterns)
- Thread isolation (Vite SSR module namespacing — shared state via `globalThis`)
- CSP default hardening (strict defaults, nonce injection)
- Auth fail-closed (auth guard errors default to 403, not pass-through)
- IPv6 SSRF prevention (`::1`, `::ffff:127.0.0.1` added to localhost blocklist)
- ReDoS prevention (3 regex patterns refactored)
- CRLF injection prevention (3 response header paths sanitized)

**Rounds 8–12**:
- MCP tool name shadowing detection (duplicate names rejected at construction)
- Working memory prompt injection: sanitized + wrapped in `<working_memory>` delimiters
- Non-text tool output truncation (image/file parts count toward 50K byte cap)
- Dashboard hardcoded hex colors replaced with CSS custom properties
- CLI lint regex synced with ESLint design system plugin (ring/fill/stroke/outline/decoration)
- SSR header sanitization: strips tab (`\x09`), validates same-origin rewrites
- TOTP input validation guards in `@fabrk/auth`
- JSON-RPC response ID integer validation in MCP stdio transport
- Modular refactor: 6 modules extracted (metadata-types, design-system-plugin, router-types, memory-helpers, long-term-memory-tools, in-memory-cost-store), dead MetadataHead component removed

### Design System Enforcement

- Added `fabrk/no-font-mono` ESLint rule (prevents raw `font-mono` — use `mode.font` instead)
- CLI lint (`fabrk check`) synced with ESLint: now catches ring/fill/stroke/outline/decoration/from/via/to prefixes plus bare `white`/`black`
- `fabrk:design-system` Vite plugin warns on hardcoded color classes at dev-server transform time

---

## 0.2.0 (2026-02-25)

### Package Consolidation

Consolidated from 17 packages down to 12 focused packages (~43K source lines, 748 tests).

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

- **`@fabrk/config` v0.1.0** -- Type-safe configuration builder with 13 sections and Zod validation
- **`@fabrk/design-system` v0.1.0** -- Terminal-inspired design system with 18 themes and design tokens
- **`@fabrk/core` v0.1.0** -- Framework runtime with plugins, middleware, teams, jobs, feature flags, and auto-wiring
- **`@fabrk/components` v0.1.0** -- 109+ production-ready UI components, 11 chart types, dashboard shell, AI chat, admin, and security views
- **`@fabrk/ai` v0.1.0** -- AI development toolkit with cost tracking, validation, streaming, prompt builder, and LLM provider support
- **`@fabrk/payments` v0.1.0** -- Payment adapters for Stripe, Polar, and Lemon Squeezy
- **`@fabrk/auth` v0.1.0** -- Authentication adapters for NextAuth, API keys (SHA-256), and MFA (TOTP + backup codes)
- **`@fabrk/email` v0.1.0** -- Email adapters for Resend and console, with 4 built-in templates
- **`@fabrk/storage` v0.1.0** -- Storage adapters for S3, R2, and local filesystem
- **`@fabrk/security` v0.1.0** -- Security utilities for CSRF, CSP, rate limiting, audit logging, GDPR, bot protection, and CORS
- **`@fabrk/store-prisma` v0.1.0** -- Prisma store implementations with 7 database adapters and example schema
- **`create-fabrk-app` v0.1.0** -- CLI tool to scaffold new FABRK applications with `fabrk` dev CLI

#### Highlights

- **109+ UI components** including charts, dashboard shell, data tables, AI chat, and admin views
- **11 chart types** powered by Recharts (bar, stacked bar, line, area, pie, donut, funnel, gauge, sparkline)
- **18 themes** with runtime switching via CSS variables
- **12 packages** publish-ready for npm
- **Adapter pattern** for all external services (payments, auth, email, storage, security)
- **In-memory defaults** for every store, enabling zero-config development
- **Auto-wiring** via `fabrk.config.ts` convention -- one config file creates all adapters
- **AI agent optimized** -- each package includes `AGENTS.md` with component props and usage examples
- **15 React hooks** -- useMediaQuery, useDebounce, useLocalStorage, useClickOutside, useCopyToClipboard, useBodyScrollLock, useIntersectionObserver, useWindowSize, usePrevious, useListKeyboardNav, useViewHistory, useCookieConsent, and more
- **Accessibility** -- All custom interactive components pass axe scans with keyboard navigation
- **Tree-shakeable** -- `sideEffects: false` on all publishable packages
- **JSDoc** -- 27 top components documented with @example blocks
- **Dual module support** -- ESM + CJS builds with TypeScript declarations for every package
