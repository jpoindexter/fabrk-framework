# START HERE - For New Claude Code Instance

Welcome to the FABRK Framework repository! This is a fresh monorepo being built to transform FABRK from a boilerplate into a framework for AI coding agents.

## What This Is

FABRK Framework is designed to be the first UI framework built FOR AI coding agents (Claude Code, Cursor, GitHub Copilot, v0.dev). Instead of humans forking a boilerplate and customizing it, AI agents will install `@fabrk/components` and other packages to build apps in minutes.

**Current Status:** Day 2 Complete ✅
- Monorepo foundation is set up
- All package structures are ready
- Ready to extract code from fabrk-dev boilerplate

## Repository Structure

```
fabrk-framework/
├── packages/
│   ├── core/              # @fabrk/core - Framework runtime
│   ├── components/        # @fabrk/components - 70+ UI components (TO EXTRACT)
│   ├── ai/                # @fabrk/ai - AI toolkit (TO EXTRACT)
│   ├── design-system/     # @fabrk/design-system - Design tokens (TO EXTRACT)
│   ├── config/            # @fabrk/config - Config builder (DONE)
│   └── cli/               # create-fabrk-app - CLI tool (TO BUILD)
├── templates/             # Starter templates (TO CREATE)
├── examples/              # Example apps (TO CREATE)
├── FULL_PLAN.md          # Complete 5-6 week transformation plan
└── IMPLEMENTATION_PLAN.md # Current status and next steps
```

## Source Material

All code will be extracted from the existing FABRK boilerplate at:
**`/Users/jasonpoindexter/Documents/GitHub/_active/fabrk-dev`**

This boilerplate has:
- 70+ components in `src/components/ui/` and `src/components/charts/`
- AI toolkit in `src/lib/ai/`
- Design system in `src/design-system/`
- 18 terminal themes with full design tokens

## Next Steps (Day 3)

Your immediate task is to **extract the components package**:

1. **Copy all UI components**
   ```bash
   # From fabrk-dev/src/components/ui/ → packages/components/src/ui/
   # From fabrk-dev/src/components/charts/ → packages/components/src/charts/
   ```

2. **Update imports**
   - Remove `@/` path aliases
   - Make dependencies explicit
   - Update to use `@fabrk/design-system`

3. **Create barrel exports**
   - `packages/components/src/index.ts` should export all components

4. **Test build**
   ```bash
   cd packages/components
   pnpm install
   pnpm build
   ```

## Key Files to Read First

1. **FULL_PLAN.md** - Complete transformation plan (read this first!)
2. **IMPLEMENTATION_PLAN.md** - Current status and commands
3. **packages/components/package.json** - Component package config
4. **fabrk-dev/src/components/** - Source components to extract

## Important Locations

- **This repo:** `/Users/jasonpoindexter/Documents/GitHub/_active/fabrk-framework`
- **Source repo:** `/Users/jasonpoindexter/Documents/GitHub/_active/fabrk-dev`
- **Original plan:** `/Users/jasonpoindexter/.claude/plans/quirky-sparking-pnueli.md`

## Commands

```bash
# Install all dependencies (run this first!)
pnpm install

# Build all packages
pnpm build

# Build in watch mode
pnpm dev

# Type check
pnpm type-check

# Clean builds
pnpm clean
```

## Goals

**Week 1-2 Goal:** Extract all code from fabrk-dev into packages
- Day 3: Extract components ← **YOU ARE HERE**
- Day 4: Test component builds and exports
- Day 5: Extract AI toolkit
- Weekend: Extract design system

**Final Goal:** Create a framework that enables this:

```typescript
// AI agent receives prompt: "Build me a dashboard"
// AI generates this code in 2 minutes:
import { BarChart, LineChart, KPICard } from '@fabrk/components'
import { useCostTracking } from '@fabrk/core'

export default function Dashboard() {
  const { todaysCost, weekTrend } = useCostTracking()
  return (
    <div className="grid gap-4 p-6">
      <KPICard title="Today" value={`$${todaysCost}`} />
      <LineChart data={weekTrend} />
    </div>
  )
}
```

Instead of writing 500 lines of custom components from scratch.

## Questions?

- Read **FULL_PLAN.md** for complete context
- Check **IMPLEMENTATION_PLAN.md** for current status
- See **CONTRIBUTING.md** for development workflow

## Get Started

1. Read FULL_PLAN.md (skim the examples section first)
2. Run `pnpm install`
3. Start Day 3: Extract components from fabrk-dev

Good luck! 🚀
