# Current Task: FABRK Framework (AI-first React framework on Vite)

**Plan:** `docs/plans/2026-02-25-fabrk-framework-implementation.md`
**Design:** `docs/plans/2026-02-25-fabrk-framework-design.md`

## Status: All 7 Days Complete (MVP Done)

### Day 1: Fork + Rename
- [x] Task 1: Clone vinext into packages/framework
- [x] Task 2: Rename vinext to fabrk (CLI, package.json, index.ts — 0 vinext refs remain)
- [x] Task 3: Wire fabrk.config.ts support (defineFabrkConfig + loadFabrkConfig, 3 tests)
- [x] Task 4: Verify build + CLI works (tsc builds clean, `fabrk --help` shows branding)

### Day 2: Agent System
- [x] Task 5: Agents directory scanner (scanAgents() discovers agents/*/agent.ts, 4 tests)
- [x] Task 6: defineAgent() runtime (model, tools, budget, stream, auth with defaults, 4 tests)
- [x] Task 7: Agent API route handler (Web Request/Response, POST validation, system prompt, 5 tests)
- [x] Task 8: @fabrk/ai LLM bridge (auto-detect provider from model name, 5 tests)
- [x] Task 9: SSE streaming (formatSSEEvent, createSSEStream, createSSEResponse, 7 tests)
- [x] Task 10: Vite plugin integration (fabrk:agents plugin, /api/agents/* middleware)

### Day 3: Tool + Prompt System
- [x] Task 11: Tools scanner + defineTool() (scanTools, defineTool, textResult, 7 tests)
- [x] Task 12: MCP dev server auto-start (buildMcpTools converter, 3 tests)
- [x] Task 13: Prompts with interpolation + partials (loadPrompt, interpolatePrompt, {{> partial}}, 8 tests)

### Day 4: Built-in Runtime
- [x] Task 14: Auth guard middleware (createAuthGuard, Bearer token validation, 5 tests)
- [x] Task 15: useAgent() React hook (parseSSELine, SSE streaming, 5 tests)
- [x] Task 16: Security middleware (buildSecurityHeaders, CSP, 3 tests)
- [x] Task 17: Bundle components/themes exports (fabrk/components, fabrk/themes, fabrk/client/use-agent)

### Day 5: Dev Dashboard + AGENTS.md
- [x] Task 18: /__ai dashboard (terminal-aesthetic, auto-refresh, agent/tool/cost stats)
- [x] Task 19: AGENTS.md auto-generation (generateAgentsMd, tables for agents/tools/prompts, 3 tests)

### Day 6: Multi-target Deploy
- [x] Task 20: Node.js standalone target (generateNodeStandalone, server.mjs + package.json)
- [x] Task 21: Vercel adapter (generateVercelOutput, Build Output API v3)
- [x] Task 22: CLI deploy --target (workers | node | vercel flag in deploy command)

### Day 7: Polish + Integration
- [x] Task 23: Public API barrel exports (fabrk.ts — defineAgent, defineTool, loadPrompt, all types)
- [x] Task 24: E2E integration tests (4 tests: agent flow, tool flow, prompt flow, AGENTS.md)
- [x] Task 25: Final verification (66 tests, build clean, type-check clean)

---

## Review

_To be filled after implementation._
