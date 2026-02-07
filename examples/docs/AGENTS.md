# AGENTS.md — FABRK Documentation Site

## Stack

| | |
|---|---|
| **Framework** | Next.js 15 (App Router) + React 19 |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS 4 + FABRK Design System |
| **UI Library** | @fabrk/components (dogfooding the framework) |
| **Purpose** | Interactive documentation for FABRK Framework |

## Structure

```
src/
  app/
    layout.tsx              ← Root layout with sidebar navigation
    page.tsx                ← Landing page (hero, stats, quick install)
    getting-started/page.tsx ← 5-minute quickstart guide
    configuration/page.tsx   ← All 12 config sections
    packages/page.tsx        ← 14 package API docs
    components/page.tsx      ← 70+ component gallery
    guides/page.tsx          ← Auth, payments, AI, deployment guides
    cli/page.tsx             ← CLI reference (create-fabrk-app + fabrk)
    globals.css              ← Terminal theme CSS variables
  components/
    sidebar.tsx              ← Navigation sidebar with section links
    doc-layout.tsx           ← DocLayout, Section, CodeBlock, InfoCard
```

## Development

```bash
pnpm dev    # Starts on port 3001
pnpm build  # Production build (static export)
```

## Dogfooding

This site uses FABRK packages:
- `@fabrk/core` — `cn()` utility
- `@fabrk/design-system` — `mode` object for terminal aesthetic
- `@fabrk/components` — UI components (planned for live demos)

## Design Rules

Same as all FABRK projects:
- Full borders need `mode.radius`
- Partial borders never get `mode.radius`
- Labels: UPPERCASE in brackets `[SECTION]`
- Buttons: UPPERCASE with `>` prefix
- Headlines: UPPERCASE
- Design tokens only (no hardcoded colors)
