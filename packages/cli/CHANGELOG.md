# create-fabrk-app

## 0.3.1

### Patch Changes

- Fix client-side hydration, resolve all CodeQL security alerts, overhaul starter templates

  **@fabrk/framework:**
  - Fix client hydration: use inline import for virtual module instead of script src
  - Fix 11 ReDoS vulnerabilities: replace polynomial regex with loop-based helpers
  - Fix incomplete string escaping in middleware and SQL query tool
  - Rewrite server-action-transform to line-by-line matching

  **create-fabrk-app:**
  - Rewrite basic template as polished landing page showcasing FABRK components
  - Add @vitejs/plugin-react for HMR/Fast Refresh
  - Add Tailwind v4 @source directive for component class scanning
  - Add inline SVG favicon
  - Fix port message (5173 for Vite, 3000 for Next.js)
  - Make dev/build/start commands detect runtime (Vite vs Next.js)

## 0.3.0

### Minor Changes

- Security hardening (12 rounds), @fabrk/framework new capabilities (AI agents, tools, MCP, A2A protocol, StateGraph, agent network, long-term memory, SSE dashboard, OTel tracing), design system enforcement (ESLint rules, CLI lint), and RAG reranking support.

## 0.2.0

### Minor Changes

- Initial release — CLI scaffolding tool and dev CLI
