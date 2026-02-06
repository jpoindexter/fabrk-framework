# Extraction Guide - Step-by-Step

This guide explains how to extract code from fabrk-dev into framework packages.

## Source Location

**fabrk-dev:** `/Users/jasonpoindexter/Documents/GitHub/_active/fabrk-dev`

## General Extraction Process

For each file you extract:

### 1. Copy File Structure
Maintain the same directory structure:
```bash
# Example for button component
fabrk-dev/src/components/ui/button.tsx
→ fabrk-framework/packages/components/src/ui/button.tsx
```

### 2. Update Imports

**Change path aliases:**
```typescript
// BEFORE (in fabrk-dev)
import { cn } from '@/lib/utils'
import { mode } from '@/design-system'

// AFTER (in framework)
import { cn } from '../utils' // or add to dependencies
import { mode } from '@fabrk/design-system'
```

**Update design system imports:**
```typescript
// BEFORE
import { mode } from '@/design-system'

// AFTER
import { mode } from '@fabrk/design-system'
```

### 3. Handle Dependencies

**External dependencies** (add to package.json):
- `lucide-react` → already in dependencies
- `recharts` → already in dependencies
- `@radix-ui/*` → already in dependencies
- `class-variance-authority` → already in dependencies
- `clsx` → already in dependencies
- `tailwind-merge` → already in dependencies

**Internal utilities** (extract separately):
- `cn()` function → add to packages/components/src/lib/utils.ts
- Any other shared utilities

### 4. Preserve Design System Rules

**CRITICAL:** Keep these patterns from CLAUDE.md:

```typescript
// Always use mode.radius for elements with full borders
<Card className={cn("border", mode.radius)}>

// Never use mode.radius for partial borders
<div className="border-t"> // No mode.radius

// Always use mode.font for monospace
<Button className={mode.font}>

// Always use design tokens
className="bg-primary text-primary-foreground" // Good
className="bg-blue-500 text-white" // Bad - never hardcode colors
```

### 5. Create Barrel Exports

Update `packages/components/src/index.ts`:
```typescript
// UI Components
export * from './ui/button'
export * from './ui/card'
export * from './ui/input'
// ... all components

// Charts
export * from './charts/bar-chart'
export * from './charts/line-chart'
// ... all charts
```

## Day 3: Extract Components Package

### Step 1: Copy All UI Components

```bash
cd /Users/jasonpoindexter/Documents/GitHub/_active/fabrk-dev

# Copy all UI components
cp -r src/components/ui/* \
  /Users/jasonpoindexter/Documents/GitHub/_active/fabrk-framework/packages/components/src/ui/

# Copy all charts
cp -r src/components/charts/* \
  /Users/jasonpoindexter/Documents/GitHub/_active/fabrk-framework/packages/components/src/charts/
```

### Step 2: Extract Utilities

Create `packages/components/src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Step 3: Update All Imports

Run find/replace across all copied files:

```bash
cd packages/components

# Replace @/lib/utils
find src -type f -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i '' 's|@/lib/utils|../lib/utils|g'

# Replace @/design-system
find src -type f -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i '' 's|@/design-system|@fabrk/design-system|g'

# Replace @/components/ui
find src -type f -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i '' 's|@/components/ui/|./|g'
```

### Step 4: Create Index Exports

Generate barrel export:
```typescript
// packages/components/src/index.ts
export * from './ui/accordion'
export * from './ui/alert-dialog'
export * from './ui/alert'
// ... all 62 components
export * from './charts/bar-chart'
// ... all 8 charts
```

### Step 5: Test Build

```bash
cd packages/components
pnpm install
pnpm build
```

Fix any TypeScript errors or missing dependencies.

## Day 5: Extract AI Package

### Step 1: Copy AI Toolkit

```bash
cp -r /Users/jasonpoindexter/Documents/GitHub/_active/fabrk-dev/src/lib/ai/* \
  /Users/jasonpoindexter/Documents/GitHub/_active/fabrk-framework/packages/ai/src/
```

### Step 2: Update Imports

```bash
cd packages/ai

# Update path aliases
find src -type f -name "*.ts" | \
  xargs sed -i '' 's|@/lib/|./|g'

# Update env imports (if any)
find src -type f -name "*.ts" | \
  xargs sed -i '' 's|@/lib/env|./env|g'
```

### Step 3: Handle Prisma Dependencies

The `cost-store-prisma.ts` file has Prisma dependencies. Options:
1. Make Prisma a peer dependency
2. Extract cost-store to separate package
3. Make it optional via feature flag

### Step 4: Test Build

```bash
cd packages/ai
pnpm install
pnpm build
pnpm test # if tests exist
```

## Design System Extraction

### Step 1: Copy Design System

```bash
cp -r /Users/jasonpoindexter/Documents/GitHub/_active/fabrk-dev/src/design-system/* \
  /Users/jasonpoindexter/Documents/GitHub/_active/fabrk-framework/packages/design-system/src/
```

### Step 2: Update Exports

Ensure `packages/design-system/src/index.ts` exports:
- `mode` object
- All themes
- All tokens
- Theme utilities

### Step 3: Test Build

```bash
cd packages/design-system
pnpm install
pnpm build
```

## Validation Checklist

After extraction, verify:

- [ ] All files copied
- [ ] No `@/` imports remain
- [ ] All external dependencies in package.json
- [ ] All packages build successfully
- [ ] No TypeScript errors
- [ ] Design system rules preserved
- [ ] Barrel exports complete
- [ ] README updated in each package

## Common Issues

### Issue: Missing cn() utility
**Solution:** Create `packages/components/src/lib/utils.ts`

### Issue: Can't find @fabrk/design-system
**Solution:** Build design-system package first, or use workspace:* in dependencies

### Issue: Radix UI imports fail
**Solution:** Check all @radix-ui/* packages are in dependencies

### Issue: Prisma errors in AI package
**Solution:** Make Prisma a peer dependency and mark as optional

## Next Steps After Extraction

1. Run `pnpm build` from root to build all packages
2. Test imports work: `import { Button } from '@fabrk/components'`
3. Generate AGENTS.md: `pnpm generate-docs`
4. Create example app to test components
5. Write tests for AI toolkit
6. Document each package with README
