# @fabrk/ai

AI development toolkit with cost tracking, validation, and testing.

## Installation

```bash
npm install @fabrk/ai
# Plus your AI provider:
npm install openai  # or @anthropic-ai/sdk or @ai-sdk/openai
```

## Usage

```tsx
import { trackCost, validateCost, AIProvider } from '@fabrk/ai'

const response = await trackCost(
  'chat-feature',
  async () => {
    return await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello!' }]
    })
  }
)

// With validation
const safe = await validateCost(() => expensiveAICall(), {
  maxCost: 0.50,
  dailyBudget: 10.00
})
```

## Features

- **Cost Tracking** - Automatic cost calculation for OpenAI, Anthropic, Google
- **Budget Management** - Daily/monthly budget enforcement
- **Validation** - Pre-flight cost checks
- **Multi-provider** - Works with all major AI providers
- **Type-safe** - Full TypeScript support

## Supported Providers

- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- Ollama (local models)

## Documentation

[View full documentation](https://github.com/jpoindexter/fabrk-framework)

## License

MIT
