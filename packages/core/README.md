# @fabrk/core

Framework runtime and core utilities for FABRK applications.

## Installation

```bash
npm install @fabrk/core @fabrk/design-system
```

## Usage

```tsx
import { FabrkProvider, useCostTracking } from '@fabrk/core'

export default function App({ children }) {
  return (
    <FabrkProvider defaultColorTheme="green">
      {children}
    </FabrkProvider>
  )
}

function CostDashboard() {
  const { data, isLoading } = useCostTracking()
  return <div>Total cost: ${data?.total || 0}</div>
}
```

## Features

- **FabrkProvider** - Root provider with theme support
- **Hooks** - useCostTracking, useCostBudget, useFeatureCost
- **Middleware** - Composable middleware system
- **Type-safe** - Full TypeScript support

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
