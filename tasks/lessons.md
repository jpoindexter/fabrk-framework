# Lessons Learned

Patterns and mistakes to avoid. Updated after every user correction.

---

## Build & Tooling

- **Server components can't call `cn()`** from @fabrk/core — add `'use client'` to components using it
- **Zod `.default()` fix**: Use `z.input<>` for function params, `z.infer<>` for internal/output
- **Storybook v8 vs v10**: Addons are v8 only, pin all storybook deps to 8.6.x
- **`NPM_CONFIG_PROVENANCE=true`** as env var (not CLI flag) when changesets controls publish
- **`pnpm audit` in CI**: Use `|| true` to surface without blocking pipeline
- **Security headers in templates**: Add directly to next.config.js (not via @fabrk/security import)
- **ESLint**: Must disable `no-unused-vars`, `no-redeclare`, `no-undef` for TS files
- **Schema consolidation**: Core imports from @fabrk/config (single source of truth)
- **Root vitest exclude**: `packages/components/src/__tests__/**` — component tests run via their own vitest config with jsdom
- **`pnpm size` script**: Use `npx size-limit` to avoid macOS `size` binary collision
- **Link/div union wrapper**: TypeScript can't narrow props — use conditional render instead of dynamic component

## User Preferences

- **Do NOT use Firecrawl** — wastes credits. Use built-in tools (WebFetch, gh CLI, Grep, etc.)
- **Do NOT publish to npm** unless explicitly told
- **Be realistic about timelines** — don't pad estimates, reference prior art for calibration
- **Keep momentum** — when told to "keep going", don't pause for confirmation on every section
