# @fabrk/ui

Component registry for FABRK — **copy components into your project** (shadcn-style), rather than importing from an npm package.

## Installation

```bash
pnpm add @fabrk/ui
```

## Usage

The `fabrk` CLI uses this registry to discover and copy components:

```bash
# Copy UI components into src/components/ui/
fabrk add button card dialog

# Copy chart components
fabrk add bar-chart sparkline

# Copy AI chat components
fabrk add chat
```

Components are copied as source files so you own and can customize them.

## API

```typescript
import { getRegistry, findComponent, listCategories, resolveDeps } from '@fabrk/ui'

// Get full registry
const registry = getRegistry()

// Find a specific component
const button = findComponent('button')
// { name: 'button', category: 'ui', file: 'button.tsx', deps: [] }

// List all categories
listCategories() // ['ui', 'charts', 'ai', ...]

// Resolve dependency tree
resolveDeps(['dialog', 'select'])
// ['button', 'popover', ...]
```

## Registry Format

The registry is defined in `registry.json`:

```json
{
  "name": "@fabrk/ui",
  "version": "0.1.0",
  "categories": { "ui": "UI Components", "charts": "Charts" },
  "components": [
    { "name": "button", "category": "ui", "file": "button.tsx", "deps": [] }
  ]
}
```

## License

[MIT](../../LICENSE)
