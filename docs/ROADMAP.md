# FABRK Framework — Product Roadmap

> Last updated: 2026-03-02

## Current State

- **3,221 tests** passing
- **24/24 type-check**, 0 lint errors, 0 warnings
- **13 packages** + create-fabrk-app CLI
- Own Vite 7 runtime: file-system routing, SSR/RSC streaming, middleware, static export
- AI layer: agents, tools, MCP, orchestration, memory, skills, budget, dashboard
- 109+ UI components, 18 themes, 11 chart types

## Competitive Landscape

| | vinext (Cloudflare) | Next.js 16 | fabrk |
|---|---|---|---|
| **Positioning** | Next.js API on Vite | The standard | Modular, AI assisted |
| **Routing** | Full Next.js compat | Full | Full (own impl) |
| **SSR/RSC** | Full + streaming | Full | Full + streaming |
| **AI Agents** | None | None | Built-in |
| **Tool Calling** | None | Via AI SDK | Built-in |
| **MCP** | None | None | HTTP + stdio |
| **UI Components** | None | None | 109+ |
| **Tests** | 2,080+ | 10,000+ | 3,221 (target 5,000+) |
| **Deploy** | CF Workers | Vercel | Generic (Node, Workers, Edge) |

**Our thesis:** vinext reimplements Next.js. We're building something new — the first full-stack framework where AI agents are first-class citizens. Same routing, same SSR, same RSC — plus agents, tools, memory, MCP, orchestration, and 109+ components.

---

## Phase 1: Critical Bug Fixes

**Status:** Not started
**Scope:** ~200 LOC, ~15 tests

| Bug | File | Severity |
|-----|------|----------|
| SemanticMemoryStore.search() returns empty content | `agents/memory/semantic-store.ts` | P0 |
| llm-caller strips conversation history | `agents/llm-caller.ts` | P0 |
| Route handler token split wrong in batch mode | `agents/route-handler.ts:282` | P1 |
| Streaming path skips memory persistence | `agents/route-handler.ts:213-232` | P1 |
| Delegation depth always 0 | `agents/orchestration/agent-tool.ts` | P1 |
| Supervisor maxDelegations not enforced | `agents/orchestration/supervisor.ts` | P1 |
| Tool executor prototype pollution via `in` | `agents/tool-executor.ts` | P2 |
| useAgent String(err) leaks internals | `client/use-agent.ts:181` | P2 |
| OpenAI streaming tool calls silently dropped | `ai/llm/openai-tools.ts:176` | P1 |
| Vite plugin memory store not wired | `agents/vite-plugin.ts:115` | P1 |
| Skill tool definitions lost on apply | `skills/apply-skill.ts` | P2 |

---

## Phase 2: Runtime Parity

**Status:** Not started
**Scope:** ~1,500 LOC, ~40 tests

| Feature | Status | Priority |
|---------|--------|----------|
| Full metadata pipeline in SSR (OG, Twitter, robots, icons) | Dead code — built but not wired | HIGH |
| Streaming SSR in production | prod-server uses renderToString only | HIGH |
| Error/loading boundaries in production | buildPageTree not called in prod | HIGH |
| Fix global-error in prod builds | findGlobalError structurally broken | HIGH |
| Forward searchParams to page components | Not extracted from URL | HIGH |
| Middleware rewrites in dev | ssr-handler ignores rewriteUrl | MEDIUM |
| Image optimization endpoint (/_fabrk/image) | Component generates URLs, no handler | HIGH |
| ISR (Incremental Static Regeneration) | fetch-cache TTL exists, no ISR pipeline | HIGH |
| Parallel routes (@slot directories) | Not implemented | MEDIUM |
| Intercepting routes ((.), (..) conventions) | Not implemented | MEDIUM |
| Sitemap + robots.txt generation | Not implemented | MEDIUM |
| "use server" compiler transform | Manual registry only, no auto-wiring | HIGH |

---

## Phase 3: Test Coverage Blitz

**Status:** Not started
**Scope:** ~2,000 LOC of tests

| Target | Current | Gap |
|--------|---------|-----|
| `runtime/prod-server.ts` (558 LOC) | 0 tests | Critical |
| `@fabrk/ai tracker.ts` (395 LOC) | 0 tests | Critical |
| `@fabrk/ai openai-tools.ts` (180 LOC) | 0 tests | Critical |
| `@fabrk/ai anthropic-tools.ts` (214 LOC) | 0 tests | Critical |
| `@fabrk/security` package | 2 test files (~13%) | High |
| `@fabrk/payments` package | 1 test file (~14%) | High |
| `@fabrk/storage` package | 1 test file (~14%) | High |
| `@fabrk/email` package | 1 test file (~9%) | High |
| Playwright E2E tests | 0 | High |

**Target:** 3,221 → ~5,000 total tests

---

## Phase 4: AI-First Features

**Status:** Not started
**Scope:** ~800 LOC, ~30 tests

| Feature | Description |
|---------|-------------|
| **Agent testing framework** | `createTestAgent()`, `mockLLM()`, assertion helpers |
| **Database tools** | `sqlQueryTool()` — read-only SQL execution for agents |
| **RAG helper** | `ragTool()` — pluggable vector store search |
| **Observability dashboard** | Cost trends, tool heatmap, error tracking |

---

## Phase 5: Production Polish

**Status:** Not started
**Scope:** ~500 LOC, ~15 tests

- CLI: `fabrk test`, `fabrk agents`, `fabrk check` commands
- Performance: O(1) cost store eviction, dashboard debounce
- Pricing: Add GPT-4.1, o3, claude-4 series
- Security: Audit all error patterns, rate limit MCP endpoint
- Working example app with agents + tools + memory

---

## Phase 6: Documentation

**Status:** Not started
**Scope:** ~200 LOC of docs

- Feature comparison page (fabrk vs Next.js vs vinext vs LangGraph)
- Migration guide from Next.js
- Getting started with agents (5-minute tutorial)
- Update all AGENTS.md files

---

## Future (Post-Roadmap)

Not in current scope but on the radar:

- **i18n routing** — locale detection, sub-path routing
- **Font optimization** — self-hosting, subsetting, fallback metrics
- **OG image generation** — Satori/resvg integration
- **Pages Router compatibility** — for migration path
- **Agent marketplace** — share/discover agent configurations
- **Production observability** — Prometheus metrics export
- **VSCode extension** — agent development, dashboard in IDE
- **Cloudflare Workers deploy** — `fabrk deploy` command
- **CI/CD templates** — GitHub Actions, GitLab CI

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Total tests | 3,221 | 5,000+ |
| E2E tests | 0 | 50+ |
| Type-check errors | 0 | 0 |
| Lint warnings | 0 | 0 |
| Runtime features vs Next.js | ~75% | ~90% |
| AI features vs any competitor | Leading | Leading |
| Packages | 13 | 13 |
| UI components | 109+ | 109+ |
