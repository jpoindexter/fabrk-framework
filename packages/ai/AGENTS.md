# @fabrk/ai — AI Agent Reference

AI integration toolkit: LLM providers, cost tracking, prompt management, streaming,
embeddings, and middleware. Framework-agnostic TypeScript — works in Next.js, Express,
Node scripts, and edge runtimes.

---

## Quick Import

```ts
import {
  ai, claude, openai,
  AICostTracker, InMemoryCostStore, getCostTracker, setCostStore,
  PromptBuilder, createPromptTemplate,
  getLLMClient,
  streamToString, parseStreamChunks,
  createAIMiddleware, budgetEnforcement, providerFallback,
} from '@fabrk/ai'
```

---

## AI Providers (Unified Interface)

The `ai` object auto-selects the first available provider (Claude → OpenAI).
Costs are tracked automatically via `AICostTracker`.

```ts
import { ai, claude, openai, vercelAI } from '@fabrk/ai'

// Auto-select provider (preferred for most cases)
const result = await ai.generate({
  prompt: 'Generate a TypeScript interface for a user profile.',
  feature: 'code-generation',
  userId: session.user.id,
})
if (result.success) {
  console.log(result.data.content)
}

// Call Claude directly (cost tracked)
const claudeResult = await claude.generate({
  prompt: 'Write a product description for...',
  feature: 'product-description',
  model: 'claude-sonnet-4-20250514', // default
  maxTokens: 1024,
  systemPrompt: 'You are a concise copywriter.',
})

// Call OpenAI directly (cost tracked)
const openaiResult = await openai.generate({
  prompt: 'Summarize this article...',
  feature: 'summarization',
  model: 'gpt-4o', // default
})

// Stream via Vercel AI SDK (costs NOT tracked — use for edge streaming only)
const streamResult = await vercelAI.stream({ prompt: 'Tell me a story', feature: 'story' })
```

`GenerateOptions` type:
```ts
interface GenerateOptions {
  prompt: string
  feature: string       // used for cost attribution
  userId?: string
  model?: string
  maxTokens?: number    // default 1024, hard cap 100000
  temperature?: number  // default 0.7
  systemPrompt?: string
}
```

`GenerateResult.content` is the response text. Usage/cost fields are always 0 — query
`getCostTracker().getTodaysCost()` for actual spend.

Environment variables: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`

---

## Cost Tracking

Automatic cost tracking with per-feature attribution, daily budgets, and pluggable stores.

```ts
import { AICostTracker, InMemoryCostStore, getCostTracker, setCostStore } from '@fabrk/ai'

// Use the default singleton tracker (in-memory, reads AI_DAILY_BUDGET env var)
const tracker = getCostTracker()

// Check today's total spend
const todayCost = await tracker.getTodaysCost()
console.log(`Spent today: $${todayCost.toFixed(4)}`)

// Check budget status
const status = await tracker.checkBudget()
// status: { withinBudget, currentCost, budget, percentUsed, remainingBudget }

// Get cost breakdown by feature
const features = await tracker.getFeatureCosts({ startDate: new Date('2026-02-01') })
// features[]: { feature, totalCost, callCount, avgCostPerCall, successRate, lastUsed }

// Aggregate over time
const daily = await tracker.getCostSummary('daily')
// daily[]: { date, totalCost, totalTokens, requestCount, successCount, errorCount }
```

### Daily Budget Enforcement

```ts
// Option 1: env var (applies to singleton)
// AI_DAILY_BUDGET=10   sets a $10/day hard cap

// Option 2: constructor (custom tracker)
const tracker = new AICostTracker(store, { dailyBudget: 10 })
// Throws "Daily AI budget exceeded" before making the API call
```

### Production Store (Prisma)

```ts
import { setCostStore, PrismaCostStore } from '@fabrk/ai'
import { prisma } from '@/lib/prisma'

// Call at app startup (e.g., in instrumentation.ts)
setCostStore(new PrismaCostStore(prisma))
```

### Manual Tracking

```ts
import { AICostTracker, InMemoryCostStore } from '@fabrk/ai'
import Anthropic from '@anthropic-ai/sdk'

const store = new InMemoryCostStore()
const tracker = new AICostTracker(store)
const client = new Anthropic()

const text = await tracker.trackClaudeCall<string>({
  model: 'claude-sonnet-4-20250514',
  feature: 'page-generator',
  prompt: userPrompt,
  userId: session.user.id,
  fn: () => client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: userPrompt }],
  }),
})
// Returns the extracted text string; cost event is saved to store automatically
```

`trackClaudeCall` and `trackOpenAICall` have the same signature — they wrap the raw
SDK call, extract token counts, calculate cost via `MODEL_PRICING`, and persist an
`AICostEvent` to the store.

---

## LLM Client Abstraction

Single-method interface across OpenAI, Anthropic, and Ollama. Useful when you want
to swap providers without changing call sites.

```ts
import { getLLMClient, LLM_DEFAULTS } from '@fabrk/ai'

// OpenAI (default provider)
const client = getLLMClient({ provider: 'openai' })
const text = await client.generate({
  system: 'You are a helpful assistant.',
  prompt: 'What is TypeScript?',
  maxTokens: 500,
  temperature: 0.2,
})

// Anthropic
const claudeClient = getLLMClient({ provider: 'anthropic' })

// Ollama (local)
const ollamaClient = getLLMClient({
  provider: 'ollama',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1:8b-instruct',
})
```

`LLMConfig` fields: `provider`, `openaiModel`, `anthropicModel`, `ollamaModel`,
`ollamaBaseUrl`, `maxTokens`, `temperature`, `timeoutMs`.

`LLM_DEFAULTS`: provider `openai`, model `gpt-4o`, maxTokens `3000`, temperature `0.2`, timeout `90s`.

Exported clients: `OpenAIClient`, `AnthropicClient`, `OllamaClient` (instantiate directly if needed).

---

## Streaming Utilities

```ts
import {
  streamToString, parseStreamChunks,
  createTextStream, concatStreams, transformStream,
  toReadableStream, fromReadableStream,
} from '@fabrk/ai'

// Consume a Vercel AI textStream to string
const text = await streamToString(result.textStream)

// Process chunks as they arrive
await parseStreamChunks(result.textStream, {
  onChunk: (chunk, accumulated) => process.stdout.write(chunk),
  onDone: (full) => saveToDatabase(full),
  onError: (err) => console.error(err),
})

// Create a mock stream for testing
const mockStream = createTextStream('Hello world', { chunkSize: 5, delayMs: 50 })

// Convert to ReadableStream for Response objects (edge/streaming routes)
return new Response(toReadableStream(result.textStream), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
})
```

---

## Prompt Management

### PromptBuilder (fluent API)

```ts
import { PromptBuilder } from '@fabrk/ai'

const { system, user, messages } = new PromptBuilder()
  .system('You are a senior TypeScript engineer.')
  .context('The project uses Next.js 15 with App Router.')
  .instruction('Generate a server action for user profile updates.')
  .constraint('Use Zod for input validation')
  .constraint('Return typed ActionResult<T>')
  .example('Input: update email', 'Output: export async function updateEmail(...)')
  .outputFormat('Return only the TypeScript code, no prose.')
  .user('Write a server action that updates a user display name.')
  .build()

// Pass to any SDK
await anthropic.messages.create({ system, messages: [{ role: 'user', content: user }] })
```

### createPromptTemplate (variable interpolation)

```ts
import { createPromptTemplate, composePrompts, createMessagePair } from '@fabrk/ai'

const systemTpl = createPromptTemplate(
  'You are a {{role}} assistant. Always respond in {{language}}.',
  { role: 'helpful', language: 'English' }
)

systemTpl.render()                        // uses defaults
systemTpl.render({ language: 'Spanish' }) // override one variable
systemTpl.variables()                     // ['role', 'language']

// Compose multiple template strings
const fullSystem = composePrompts(
  systemTpl.render(),
  userContext ? `User context: ${userContext}` : null,
  'Always cite sources.'
)

// Build message array in one call
const messages = createMessagePair(systemTpl, 'Explain async/await', { role: 'coding' })
```

---

## Embeddings & Similarity

```ts
import {
  getEmbeddingProvider, cosineSimilarity, findNearest
} from '@fabrk/ai'

const provider = getEmbeddingProvider({ provider: 'openai' })
const [queryEmbedding] = await provider.embed(['search query'])

const results = findNearest(queryEmbedding, documentEmbeddings, { topK: 5, threshold: 0.7 })
// results[]: { index, similarity, distance }

// Standalone helpers
cosineSimilarity(vecA, vecB)   // 0-1 similarity score
cosineDistance(vecA, vecB)     // 0-1 distance
jaccardSimilarity(setA, setB)  // set-based overlap
centroid(vectors)              // average vector
```

Providers: `OpenAIEmbeddingProvider` (default model `text-embedding-3-small`),
`OllamaEmbeddingProvider`.

---

## Middleware (Budget & Fallback)

```ts
import { createAIMiddleware, budgetEnforcement, providerFallback } from '@fabrk/ai'

const pipeline = createAIMiddleware()
  .use(budgetEnforcement({
    daily: 50,
    monthly: 1000,
    alertThreshold: 0.8,
    onBudgetExceeded: (ctx, spent, budget) =>
      console.warn(`Budget exceeded: $${spent.toFixed(2)}/$${budget}`),
    onBudgetAlert: (ctx, spent, budget, pct) =>
      console.warn(`Budget ${(pct * 100).toFixed(0)}% used`),
  }))
  .use(providerFallback({
    providers: ['claude', 'openai', 'ollama'],
    models: {
      claude: 'claude-sonnet-4-20250514',
      openai: 'gpt-4o',
    },
    onFallback: (from, to, err) =>
      console.warn(`Falling back from ${from} to ${to}: ${err.message}`),
  }))

const ctx = await pipeline.run({
  prompt: 'Hello',
  model: 'claude-sonnet-4-20250514',
  feature: 'chat',
  userId: 'u_123',
})

if (ctx.blocked) {
  console.error(ctx.blockReason)
} else {
  console.log(ctx.response)
}
```

`AIRequestContext` fields: `prompt`, `model`, `provider?`, `feature?`, `userId?`,
`blocked?`, `blockReason?`, `response?`, `metadata?`.

---

## Key Types

```ts
// Cost tracking
interface AICostEvent {
  id: string; timestamp: Date; model: string; provider: string
  promptTokens: number; completionTokens: number; totalTokens: number
  costUSD: number; feature: string; success: boolean; durationMs: number
  userId?: string; errorMessage?: string; metadata?: Record<string, unknown>
}

interface CostStore {
  save(event: AICostEvent): Promise<void>
  query(filters: { feature?; startDate?; endDate?; userId?; model?; provider? }): Promise<AICostEvent[]>
  aggregate(period: 'daily'|'weekly'|'monthly', filters?): Promise<CostSummary[]>
  getFeatureCosts(filters?): Promise<FeatureCost[]>
}

// LLM abstraction
interface LLMClient {
  generate(opts: LLMOpts): Promise<string>
}

// Embeddings
interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
}
```

---

## Complete Example

```ts
// app/api/generate/route.ts
import { NextRequest } from 'next/server'
import { claude, getCostTracker, PromptBuilder, toReadableStream } from '@fabrk/ai'
import { PrismaCostStore } from '@fabrk/ai'
import { prisma } from '@/lib/prisma'

// Set production store at module load time
import { setCostStore } from '@fabrk/ai'
setCostStore(new PrismaCostStore(prisma))

export async function POST(req: NextRequest) {
  const { userMessage, userId } = await req.json()

  // Build structured prompt
  const { system, user } = new PromptBuilder()
    .system('You are a product manager assistant.')
    .instruction('Write a concise user story based on the feature request.')
    .constraint('Use "As a ... I want ... so that ..." format')
    .outputFormat('Return only the user story, no preamble.')
    .user(userMessage)
    .build()

  // Generate with cost tracking
  const result = await claude.generate({
    prompt: user,
    systemPrompt: system,
    feature: 'user-story-generator',
    userId,
    maxTokens: 256,
  })

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 500 })
  }

  // Check spend
  const todayCost = await getCostTracker().getTodaysCost(userId)
  console.log(`User ${userId} spent $${todayCost.toFixed(4)} today`)

  return Response.json({ content: result.data.content })
}
```
