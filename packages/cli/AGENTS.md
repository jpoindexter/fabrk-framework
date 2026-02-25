# create-fabrk-app / fabrk CLI — Agent Reference

Two entry points ship in this package:
- **`create-fabrk-app`** — backwards-compatible alias, delegates to `fabrk create`
- **`fabrk`** — the primary CLI; owns the full developer lifecycle

---

## Scaffold a New App

```bash
# Interactive — prompts for name and template
npx create-fabrk-app@latest

# Non-interactive
npx create-fabrk-app@latest my-app --template dashboard

# Equivalent using fabrk directly
npx fabrk create my-app --template ai-saas

# Flags
#   -t, --template <name>   basic | ai-saas | dashboard
#   --no-install            skip pnpm install
#   --no-git                skip git init + initial commit
```

The scaffold: copies the chosen template, sets `package.json` `name`, runs
`pnpm install`, initializes git, and generates a `.fabrk/` directory with project
metadata and a CLAUDE.md for AI agents.

---

## Templates

### `basic`

Minimal starter. Includes:
- Next.js 15 + App Router, React 19, TypeScript
- `@fabrk/components`, `@fabrk/design-system`
- Tailwind CSS v4, ESLint
- `fabrk.config.ts` with sensible defaults

### `ai-saas`

Everything in `basic`, plus:
- `@fabrk/ai` — multi-provider LLM toolkit, cost tracking, prompt builder
- Example AI route handlers
- Budget management scaffolding

### `dashboard`

Everything in `basic`, plus:
- `@fabrk/components` charts and KPI components pre-wired
- `DashboardShell` with sidebar layout
- Analytics page with `BarChart`, `LineChart`, `StatsGrid`, `DataTable`

---

## Generated Project Structure

```
my-app/
├── fabrk.config.ts        # Single source of truth for app config
├── src/
│   ├── app/               # Next.js App Router pages + API routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── ui/            # fabrk add <component> copies files here
│   └── styles/
│       └── theme.css      # CSS custom properties for active theme
├── .fabrk/
│   ├── manifest.json      # Package list, features, pages (auto-updated)
│   └── CLAUDE.md          # AI agent rules auto-generated from manifest
└── package.json
```

---

## `fabrk` Dev Commands

Run these from inside a scaffolded project:

```bash
fabrk dev                   # Start Next.js dev server (validates fabrk.config.ts first)
fabrk dev --port 8080       # Custom port

fabrk build                 # Production build
fabrk start                 # Start production server

fabrk add button card       # Copy UI components from registry into src/components/ui/
fabrk add auth              # Install @fabrk/auth and update fabrk.config.ts hint
fabrk add payments          # Install @fabrk/payments
fabrk add storage           # Install @fabrk/storage
fabrk add security          # Install @fabrk/security
fabrk add ai                # Install @fabrk/ai

fabrk add-theme terminal    # Generate terminal theme CSS variables
fabrk add-theme swiss       # Generate Swiss (clean grid) theme CSS variables

fabrk generate component MyWidget      # Scaffold src/components/my-widget.tsx
fabrk generate page settings          # Scaffold app/settings/page.tsx
fabrk generate api users              # Scaffold app/api/users/route.ts
fabrk generate ai-rules               # Regenerate CLAUDE.md from current project state

fabrk doctor                # Diagnose config, missing deps, broken imports
fabrk info                  # Print project name, template, enabled features, packages
fabrk upgrade               # Upgrade @fabrk/* packages to latest
fabrk lint                  # Check design-token compliance (no hardcoded colors)
```

---

## Feature Modules (`fabrk add <module>`)

`auth` | `payments` | `email` | `storage` | `security` | `ai`

Each runs `pnpm add @fabrk/<module>` and prints a reminder to configure it in
`fabrk.config.ts`.

---

## Available Themes (`fabrk add-theme <theme>`)

| Theme | Description |
|-------|-------------|
| `terminal` | Monospace font, sharp corners (`--radius: 0px`), green-on-black |
| `swiss` | Helvetica Neue, 4px radius, clean industrial grid |

Themes write CSS custom properties to `src/styles/theme.css`. Import this file
in `app/layout.tsx`.

---

## After Scaffolding — Typical Next Steps

```bash
cd my-app
fabrk dev                          # http://localhost:3000
fabrk add auth payments            # add feature packages
fabrk add button card dialog       # add UI components
fabrk generate component Dashboard # generate scaffolds
fabrk generate ai-rules            # refresh CLAUDE.md
```
