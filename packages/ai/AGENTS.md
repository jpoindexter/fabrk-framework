# @fabrk/ai — AGENTS.md

> AI toolkit for the FABRK framework

## Overview

| | |
|---|---|
| **Package** | `@fabrk/ai` |
| **Language** | TypeScript |
| **Features** | Cost tracking, code validation, testing, streaming, prompt management, provider integrations |
| **Tests** | 35+ tests across 3 test files |

## Quick Start

```ts
import { AICostTracker, PromptBuilder, createTextStream, streamToString } from '@fabrk/ai'

// Cost tracking
const tracker = new AICostTracker()
await tracker.trackCall({ model: 'claude-3-sonnet', feature: 'chat', ... })

// Prompt building
const prompt = new PromptBuilder()
  .system('You are a coding assistant.')
  .context('User is building a Next.js app.')
  .instruction('Generate a login form.')
  .constraint('Use TypeScript')
  .build()

// Streaming
const text = await streamToString(stream)
```

## Exports

### Cost Tracking
| Export | Type | Description |
|--------|------|-------------|
| `AICostTracker` | Class | Track AI API costs per model/feature |
| `InMemoryCostStore` | Class | In-memory cost event storage |
| `PrismaCostStore` | Class | Prisma-based persistence (reference impl) |
| `calculateModelCost` | Function | Calculate cost from token usage |
| `getCostTracker` | Function | Get singleton tracker |
| `setCostStore` | Function | Set the cost store implementation |
| `MODEL_PRICING` | Constant | Token pricing for Claude/OpenAI models |

### Code Validation
| Export | Type | Description |
|--------|------|-------------|
| `CodeValidator` | Class | Validate code for security/design/quality |
| `validateCode` | Function | Quick validation |
| `isCodeSafe` | Function | Security-only check |
| `getSecurityIssues` | Function | Get security issues only |
| `getDesignViolations` | Function | Get design violations only |

### Testing
| Export | Type | Description |
|--------|------|-------------|
| `AITest` | Class | Fluent test builder for AI functions |
| `testDoesNotThrow` | Function | Quick assertion helper |
| `testReturnsType` | Function | Type validation helper |
| `testCompletesInMs` | Function | Performance test helper |
| `commonSchemas` | Object | Reusable Zod schemas |

### Streaming
| Export | Type | Description |
|--------|------|-------------|
| `streamTextToString` | Function | Consume async iterable to string |
| `parseStreamChunks` | Function | Process chunks with callbacks |
| `createTextStream` | Function | Create test stream from string |
| `mergeStreams` | Function | Merge multiple streams |
| `transformStream` | Function | Transform stream chunks |
| `toReadableStream` | Function | Convert to Web ReadableStream |
| `fromReadableStream` | Function | Convert from Web ReadableStream |

### Prompt Management
| Export | Type | Description |
|--------|------|-------------|
| `createPromptTemplate` | Function | Reusable template with `{{variable}}` syntax |
| `composePrompts` | Function | Join prompt sections |
| `createMessagePair` | Function | System/user message pair helper |
| `PromptBuilder` | Class | Fluent API for complex prompts |

### Provider Integrations
| Export | Type | Description |
|--------|------|-------------|
| `chatWithOpenAI` | Function | OpenAI chat completions |
| `chatWithClaude` | Function | Anthropic Claude chat |
| `chat` | Function | Auto-select provider |
| `generateEmbeddings` | Function | OpenAI embeddings |
| `moderateContent` | Function | Content moderation |
| `generateImage` | Function | DALL-E image generation |

## Commands

```bash
pnpm build        # Build with tsup (ESM + CJS + DTS)
pnpm dev          # Watch mode
pnpm test         # Run tests (streaming, templates, builder)
```
