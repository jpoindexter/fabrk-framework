# @fabrk/config

Type-safe configuration builder for FABRK framework.

## Installation

```bash
npm install @fabrk/config
```

## Usage

```tsx
import { defineConfig } from '@fabrk/config'

export default defineConfig({
  theme: {
    defaultColorTheme: 'green'
  },
  ai: {
    provider: 'openai',
    costTracking: true,
    dailyBudget: 50
  }
})
```

## Features

- **Type-safe** - Full TypeScript IntelliSense
- **Validation** - Zod-powered schema validation
- **Defaults** - Sensible default values
- **Environment** - Auto-loads from .env files

## Configuration Options

```typescript
{
  theme?: {
    defaultColorTheme?: string
    storageKeyPrefix?: string
  }
  ai?: {
    provider?: 'openai' | 'anthropic' | 'google' | 'ollama'
    costTracking?: boolean
    dailyBudget?: number
    monthlyBudget?: number
  }
}
```

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
