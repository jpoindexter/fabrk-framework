# @fabrk/ai — AI Integration Toolkit

This package is the low-level layer that `fabrk` (the runtime) builds on. You can use it directly in any TypeScript project — it has no dependency on React or Vite.

```bash
pnpm add @fabrk/ai
```

---

## LLM providers

### Provider registry

Providers are registered by a unique key and matched to model strings via prefix rules. The registry ships with 6 native providers and 61 OpenAI-compatible adapters.

Built-in native providers:

| Key | Model prefixes | Env var |
|-----|---------------|---------|
| `openai` | `gpt-`, `o1-`, `o3-`, `o4-`, `chatgpt-` | `OPENAI_API_KEY` |
| `anthropic` | `claude-` | `ANTHROPIC_API_KEY` |
| `google` | `gemini-` | `GOOGLE_AI_API_KEY` |
| `ollama` | `ollama:` | (none — local) |
| `cohere` | `command-` | `COHERE_API_KEY` |
| `bedrock` | `amazon.`, `meta.`, `mistral.` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |

Matching is longest-prefix-first, so `claude-opus-4-6` matches `anthropic` and `gpt-4o-mini` matches `openai`.

### Getting a provider

```ts
import { getProvider, getProviderByKey } from '@fabrk/ai'

// By model string
const provider = getProvider('claude-sonnet-4-5')
const generate = provider!.makeGenerateWithTools({ anthropicModel: 'claude-sonnet-4-5' })

// By key
const openai = getProviderByKey('openai')
```

### Registering a custom provider

```ts
import { registerProvider } from '@fabrk/ai'

registerProvider('my-llm', {
  key: 'my-llm',
  prefixes: ['my-model-'],
  envKey: 'MY_LLM_API_KEY',
  makeGenerateWithTools(config) {
    return async (messages, tools, opts) => {
      // Call your LLM API
      return { content: '...', usage: { promptTokens: 10, completionTokens: 5 } }
    }
  },
  makeStreamWithTools(config) {
    return async function* (messages, tools, opts) {
      yield { type: 'text-delta', content: 'Hello' }
      yield { type: 'usage', promptTokens: 10, completionTokens: 5 }
    }
  },
})
```

### OpenAI-compatible providers

61 providers are available via `makeOpenAICompatAdapter`. They all speak the OpenAI REST API format. Examples: OpenRouter (which itself covers 200+ models), Groq, Fireworks, Together AI, Mistral, Perplexity, Anyscale, DeepInfra, vllm, LM Studio, LocalAI.

```ts
import { makeOpenAICompatAdapter, registerProvider } from '@fabrk/ai'

// OpenRouter — routes to 200+ models by model string
const openRouterAdapter = makeOpenAICompatAdapter({
  key: 'openrouter',
  prefixes: ['openrouter/'],
  baseURL: 'https://openrouter.ai/api/v1',
  envKey: 'OPENROUTER_API_KEY',
})
registerProvider('openrouter', openRouterAdapter)

// Now use it:
const provider = getProvider('openrouter/mistral-7b')
```

---

## Generating responses

### generateWithTools (batch)

```ts
import { openaiGenerateWithTools } from '@fabrk/ai'

const result = await openaiGenerateWithTools(
  [{ role: 'user', content: 'What is 2+2?' }],
  [], // no tools
  { openaiModel: 'gpt-4o-mini' }
)

console.log(result.content)        // "4"
console.log(result.usage)          // { promptTokens: 14, completionTokens: 2 }
console.log(result.toolCalls)      // [] (no tool calls made)
```

With tools:

```ts
const result = await anthropicGenerateWithTools(
  [{ role: 'user', content: 'Search for cats.' }],
  [{
    name: 'search',
    description: 'Search the web.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  }],
  { anthropicModel: 'claude-sonnet-4-5' }
)

if (result.toolCalls) {
  // result.toolCalls[0].name === 'search'
  // result.toolCalls[0].arguments === { query: 'cats' }
}
```

### streamWithTools (streaming)

```ts
import { anthropicStreamWithTools } from '@fabrk/ai'

async function* streamAnswer() {
  yield* anthropicStreamWithTools(
    [{ role: 'user', content: 'Tell me a story.' }],
    [],
    { anthropicModel: 'claude-sonnet-4-5' }
  )
}

for await (const event of streamAnswer()) {
  switch (event.type) {
    case 'text-delta':
      process.stdout.write(event.content)
      break
    case 'tool-call':
      console.log(`Tool: ${event.name}`, event.arguments)
      break
    case 'usage':
      console.log(`Tokens: ${event.promptTokens} in, ${event.completionTokens} out`)
      break
  }
}
```

Event types: `text-delta`, `tool-call`, `usage`.

### generateObject (structured output)

When you need the LLM to return JSON that conforms to a schema — without fighting string parsing:

```ts
import { generateObject } from '@fabrk/ai'

const result = await generateObject(
  [{ role: 'user', content: 'Extract the name and age from: Alice is 30 years old.' }],
  {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
    },
    required: ['name', 'age'],
  },
  { openaiModel: 'gpt-4o-mini' }
)

console.log(result.data)  // { name: 'Alice', age: 30 }
```

For streaming structured output that emits partial objects as they arrive:

```ts
import { streamObjectPartial } from '@fabrk/ai'

for await (const event of streamObjectPartial(messages, schema, config)) {
  if (event.type === 'partial') console.log(event.data)  // Partial parsed object
  if (event.type === 'done') console.log(event.data)     // Complete object
}
```

---

## Embeddings

### Getting a provider

```ts
import { getEmbeddingProvider } from '@fabrk/ai'

// OpenAI (default)
const embedder = getEmbeddingProvider({ provider: 'openai', model: 'text-embedding-3-small' })

// Ollama (local)
const embedder = getEmbeddingProvider({ provider: 'ollama', model: 'nomic-embed-text' })

// Cohere
const embedder = getEmbeddingProvider({ provider: 'cohere', model: 'embed-english-v3.0' })

// Voyage AI (high quality for RAG)
const embedder = getEmbeddingProvider({ provider: 'voyage', model: 'voyage-3' })

// Azure OpenAI
const embedder = getEmbeddingProvider({
  provider: 'azure',
  model: 'text-embedding-ada-002',
  azureEndpoint: process.env.AZURE_ENDPOINT,
  azureDeployment: 'my-deployment',
})
```

### Embedding text

```ts
const vector = await embedder.embed('Search query')         // Float32Array
const vectors = await embedder.embedBatch(['doc 1', 'doc 2', 'doc 3'])
```

### Similarity functions

```ts
import { cosineSimilarity, cosineDistance, findNearest, centroid, jaccardSimilarity } from '@fabrk/ai'

const similarity = cosineSimilarity(vec1, vec2)  // 0-1
const distance = cosineDistance(vec1, vec2)       // 0-2

// Find the 3 nearest vectors with score > 0.5
const results = findNearest(queryVec, candidateVecs, 3, 0.5)
// results: [{ vector, index, score }]

// Centroid of a cluster
const center = centroid([vec1, vec2, vec3])

// For keyword/set overlap
const overlap = jaccardSimilarity(setA, setB)
```

---

## RAG (Retrieval-Augmented Generation)

### Basic pipeline

```ts
import { createRagPipeline, getEmbeddingProvider } from '@fabrk/ai'

const pipeline = createRagPipeline({
  embedder: getEmbeddingProvider({ provider: 'openai' }),
  topK: 5,
  minScore: 0.7,
  chunkOptions: {
    size: 512,        // Characters per chunk
    overlap: 64,      // Overlap between adjacent chunks
  },
})

// Ingest documents
await pipeline.ingest(longDocument, { source: 'docs', version: '2.0' })
await pipeline.ingest(anotherDocument, { source: 'faq' })

// Search
const results = await pipeline.search('How do I reset my password?')
// results[].text — the chunk text
// results[].score — cosine similarity
// results[].metadata — what you passed to ingest()
```

### Vector store adapters

The default store is in-memory (`InMemoryVectorStoreAdapter`), useful for development and testing. For production:

```ts
import { PineconeVectorStore } from '@fabrk/ai'

const store = new PineconeVectorStore({
  apiKey: process.env.PINECONE_API_KEY!,
  indexName: 'my-index',
  namespace: 'prod',
})

const pipeline = createRagPipeline({ embedder, store })
```

You can also implement `VectorStoreAdapter` to plug in pgvector, Weaviate, Qdrant, etc:

```ts
import type { VectorStoreAdapter, VectorSearchResult } from '@fabrk/ai'

class MyStore implements VectorStoreAdapter {
  async add(entry: VectorEntry): Promise<void> { ... }
  async search(vector: number[], opts: { topK: number; minScore?: number }): Promise<VectorSearchResult[]> { ... }
  async delete(id: string): Promise<void> { ... }
}
```

### Reranking

Reranking runs a second pass over the initial vector results to improve relevance. The pipeline fetches `topK * 3` candidates, then reranks down to `topK`:

```ts
import { createRagPipeline, CrossEncoderReranker, cohereReranking, embeddingReranking } from '@fabrk/ai'

// Cross-encoder (most accurate, requires a local model or API)
const pipeline = createRagPipeline({
  embedder,
  reranker: cohereReranking({ apiKey: process.env.COHERE_API_KEY!, model: 'rerank-english-v3.0' }),
  topK: 5,
})

// Embedding-based reranking (no extra API call)
const pipeline = createRagPipeline({
  embedder,
  reranker: embeddingReranking(embedder),
  topK: 5,
})
```

---

## Semantic cache

Caches LLM responses by semantic similarity — if a new query is close enough to a cached query, return the cached response:

```ts
import { SemanticCache } from '@fabrk/ai'

const cache = new SemanticCache({
  embedder: getEmbeddingProvider({ provider: 'openai' }),
  similarityThreshold: 0.95,
  maxEntries: 1000,
  ttl: 3600_000,  // 1 hour in ms
})

async function cachedGenerate(query: string): Promise<string> {
  const cached = await cache.get(query)
  if (cached) return cached.response

  const response = await callLLM(query)
  await cache.set(query, response)
  return response
}
```

---

## Cost tracking

### AICostTracker

```ts
import { AICostTracker, InMemoryCostStore, calculateModelCost } from '@fabrk/ai'

const store = new InMemoryCostStore()
const tracker = new AICostTracker(store)

// Record a cost event
await tracker.record({
  model: 'claude-sonnet-4-5',
  feature: 'chat',
  promptTokens: 450,
  completionTokens: 82,
  costUSD: 0.0031,
  userId: 'user_123',
})

// Get summary
const summary = await tracker.getSummary('user_123')
console.log(summary.totalCostUSD)
console.log(summary.byModel)  // Cost broken down by model
```

### Pricing lookup

```ts
import { calculateModelCost, MODEL_PRICING } from '@fabrk/ai'

const { costUSD } = calculateModelCost('claude-sonnet-4-5', 1000, 200)
console.log(`$${costUSD.toFixed(6)}`)

// Check if a model is in the pricing table
console.log(MODEL_PRICING['gpt-4o'])  // { input: 0.000005, output: 0.000015 } per token
```

In production, swap `InMemoryCostStore` for `PrismaCostStore` from `@fabrk/ai`:

```ts
import { PrismaCostStore } from '@fabrk/ai'

const store = new PrismaCostStore(prismaClient)
```

---

## AI middleware

Composable middleware that wraps any LLM call with budget enforcement and provider fallback:

```ts
import { createAIMiddleware, budgetEnforcement, providerFallback } from '@fabrk/ai'

const middleware = createAIMiddleware([
  budgetEnforcement({
    maxCostPerRequest: 0.10,
    maxCostPerDay: 50.00,
    store: costStore,
  }),
  providerFallback({
    primary: 'anthropic',
    fallbacks: ['openai', 'google'],
    onFallback: (from, to, err) => logger.warn(`Fell back from ${from} to ${to}`, err),
  }),
])

const result = await middleware.generate(messages, tools, config)
```

---

## Streaming utilities

```ts
import { streamToString, createTextStream, transformStream } from '@fabrk/ai'

// Collect a ReadableStream<Uint8Array> to a string
const text = await streamToString(response.body!)

// Create a ReadableStream from a string (useful for tests)
const stream = createTextStream('Hello, world!')

// Transform stream chunks
const upperStream = transformStream(stream, (chunk) => chunk.toUpperCase())
```

---

## Prompt builder

```ts
import { PromptBuilder } from '@fabrk/ai'

const prompt = new PromptBuilder()
  .system('You are a helpful assistant. Today is {{date}}.')
  .user('{{question}}')
  .build({ date: '2026-03-04', question: 'What is TypeScript?' })

// prompt is LLMMessage[]
```

```ts
import { createPromptTemplate, composePrompts } from '@fabrk/ai'

const systemTemplate = createPromptTemplate('You are {{role}}. Context: {{context}}.')
const userTemplate = createPromptTemplate('Answer: {{question}}')

const composed = composePrompts([systemTemplate, userTemplate])
const messages = composed({ role: 'assistant', context: 'SaaS app', question: 'How to refund?' })
```

---

## Voice

```ts
import { OpenAITTSProvider, ElevenLabsTTSProvider, OpenAISTTProvider } from '@fabrk/ai'

// Text-to-speech
const tts = new OpenAITTSProvider({ apiKey: process.env.OPENAI_API_KEY! })
const audio = await tts.synthesize({
  text: 'Hello, how can I help you?',
  voice: 'alloy',
  format: 'mp3',
  speed: 1.0,
})

// ElevenLabs
const elevenlabs = new ElevenLabsTTSProvider({ apiKey: process.env.ELEVENLABS_API_KEY! })
const audio = await elevenlabs.synthesize({ text: '...', voiceId: 'your-voice-id' })

// Speech-to-text
const stt = new OpenAISTTProvider({ apiKey: process.env.OPENAI_API_KEY! })
const result = await stt.transcribe({ audio: audioBuffer, language: 'en' })
console.log(result.text)
```

When using the `fabrk` runtime with `voice: true`, TTS is available at `POST /__ai/tts`, STT at `POST /__ai/stt`, and WebSocket realtime at `/__ai/realtime`.
