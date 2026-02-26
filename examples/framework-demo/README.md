# Framework Demo

A CodeScan dashboard built with the `fabrk` framework package — proving the agent/tool/dashboard stack works end-to-end with Vite + React.

## What This Demonstrates

- **Vite plugins**: `agentPlugin()` + `dashboardPlugin()` from `fabrk/fabrk` in `vite.config.ts`
- **AI agent**: `agents/assistant/agent.ts` using `defineAgent()` — auto-discovered at startup
- **Tool**: `tools/get-stats.ts` using `defineTool()` — auto-scanned, MCP-compatible
- **Config**: `fabrk.config.ts` with AI budget and security settings
- **Components**: Full dashboard imported from `fabrk/components` (re-exports `@fabrk/components`)
- **Dev dashboard**: Visit `/__ai` to see discovered agents, tools, and call history

## Running

```bash
# From monorepo root
pnpm install
pnpm build

# Start the demo
cd examples/framework-demo
pnpm dev
```

Visit `http://localhost:5173` for the dashboard, `http://localhost:5173/__ai` for the AI dev dashboard.

## Stack

- **Build**: [Vite 7](https://vite.dev) + `@vitejs/plugin-react`
- **Framework**: `fabrk` — AI agent scanning, tool scanning, MCP dev server, dev dashboard
- **Components**: `@fabrk/components` via `fabrk/components` (105+ UI components)
- **Design**: `@fabrk/design-system` via `fabrk/themes` (18 themes, design tokens)
