# Framework Demo

A CodeScan dashboard built with `@fabrk/framework` — proving the own Vite 7 runtime, file-system routing, SSR, agent/tool/dashboard stack works end-to-end.

## What This Demonstrates

- **Own runtime**: `@fabrk/framework` Vite 7 plugin with file-system routing and SSR
- **File conventions**: `app/page.tsx` for the root route, `app/layout.tsx` for the root layout
- **Metadata**: `export const metadata` on pages → injected into `<head>` during SSR
- **AI agent**: `agents/assistant/agent.ts` using `defineAgent()` — auto-discovered at startup
- **Tool**: `tools/get-stats.ts` using `defineTool()` — auto-scanned, MCP-compatible
- **Config**: `fabrk.config.ts` with AI budget and security settings
- **Components**: Full dashboard imported from `@fabrk/framework/components` (re-exports `@fabrk/components`)
- **Dev dashboard**: Visit `/__ai` to see discovered agents, tools, and call history

## File Structure

```
app/
├── layout.tsx          # Root layout — imports globals.css
├── page.tsx            # Route: / — renders the CodeScan dashboard
└── middleware.ts       # (optional) Runs before routing
agents/
└── assistant/
    └── agent.ts        # AI agent definition
tools/
└── get-stats.ts        # MCP-compatible tool
fabrk.config.ts         # Framework configuration
vite.config.ts          # Vite config with fabrk() plugin
```

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

- **Runtime**: `@fabrk/framework` — own Vite 7 plugin with file-system routing, SSR, middleware
- **Build**: [Vite 7](https://vite.dev) + [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite`
- **Components**: `@fabrk/components` via `@fabrk/framework/components` (109+ UI components)
- **Design**: `@fabrk/design-system` via `@fabrk/framework/themes` (18 themes, design tokens)
- **CLI**: `fabrk dev` / `fabrk build` / `fabrk start`
