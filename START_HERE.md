# START HERE - For New Claude Code Instance

Welcome to the FABRK Framework repository! This is a fresh monorepo being built to transform FABRK from a boilerplate into a framework for AI coding agents.

## What This Is

FABRK Framework is designed to be the first UI framework built FOR AI coding agents (Claude Code, Cursor, GitHub Copilot, v0.dev). Instead of humans forking a boilerplate and customizing it, AI agents will install `@fabrk/components` and other packages to build apps in minutes.

**Current Status:** Day 5 Complete ✅
- ✅ Monorepo foundation is set up
- ✅ Component extraction complete (70+ components)
- ✅ Design system extraction complete (18 terminal themes)
- ✅ AI toolkit extraction complete (cost tracking, validation, integrations)
- ✅ @fabrk/core framework runtime implemented
- ✅ All 6 packages building cleanly with no warnings
- Ready for templates and examples

## Repository Structure

```
fabrk-framework/
├── packages/
│   ├── core/              # @fabrk/core - Framework runtime (✅ DONE)
│   ├── components/        # @fabrk/components - 70+ UI components (✅ DONE)
│   ├── ai/                # @fabrk/ai - AI toolkit (✅ DONE)
│   ├── design-system/     # @fabrk/design-system - Design tokens (✅ DONE)
│   ├── config/            # @fabrk/config - Config builder (✅ DONE)
│   └── cli/               # create-fabrk-app - CLI tool (⏳ PLACEHOLDER)
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

## Next Steps (Day 6+)

Your immediate task is to **create templates and examples**:

1. **Create starter templates**
   ```bash
   # Basic template - minimal setup
   templates/basic/

   # AI-SaaS template - full AI features
   templates/ai-saas/

   # Dashboard template - analytics focus
   templates/dashboard/
   ```

2. **Create example applications**
   ```bash
   # Show real-world usage
   examples/ai-cost-dashboard/
   examples/chat-interface/
   examples/analytics-platform/
   ```

3. **Implement create-fabrk-app CLI**
   - Scaffolding tool to generate projects from templates
   - Interactive prompt for template selection
   - Dependency installation and setup

4. **Documentation**
   - API reference for each package
   - Component usage guides
   - Migration guide from boilerplate

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

## Completed Milestones

**Week 1-2:** Extract all code from fabrk-dev into packages ✅
- ✅ Day 3: Extract components (70+ UI components)
- ✅ Day 4: Test component builds and exports
- ✅ Day 5: Extract AI toolkit (cost tracking, validation, integrations)
- ✅ Day 5: Extract design system (18 terminal themes, tokens, providers)
- ✅ Day 5: Implement @fabrk/core framework runtime

**Current Focus:** Templates and CLI tooling ← **YOU ARE HERE**
- Create starter templates (basic, ai-saas, dashboard)
- Build example applications
- Implement create-fabrk-app scaffolding CLI

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
