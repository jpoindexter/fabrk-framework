# fabrk — Runtime Package

The `fabrk` package turns a standard Vite project into a full-stack framework. Install it, point it at an `app/` directory, and you get file-system routing, SSR, AI agents, and a dev dashboard. It has no dependency on `@fabrk/components` or `@fabrk/design-system` — it is intentionally decoupled.

---

## Quick start

```bash
pnpm add fabrk
pnpm add -D @vitejs/plugin-react  # Optional, enables HMR
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import fabrk from 'fabrk'

export default defineConfig({
  plugins: [
    fabrk({
      agents: true,      // mount agent routes at /api/agents/:name
      dashboard: true,   // dev dashboard at /__ai
      voice: true,       // TTS/STT routes at /__ai/tts, /__ai/stt
      serverActions: true, // "use server" compiler transform
    }),
  ],
})
```

Every sub-plugin defaults to `true`. You can disable individual features:

```ts
fabrk({ dashboard: false, voice: false })
```

---

## File-system routing

Put files in `app/` and they become routes. The scanner runs at startup and watches for file additions and deletions in dev.

### File naming

| File | Purpose |
|------|---------|
| `app/page.tsx` | Route at `/` |
| `app/about/page.tsx` | Route at `/about` |
| `app/[id]/page.tsx` | Dynamic segment — `params.id` |
| `app/[...slug]/page.tsx` | Catch-all — `params.slug` |
| `app/[[...slug]]/page.tsx` | Optional catch-all |
| `app/layout.tsx` | Wraps all pages in the same directory and below |
| `app/error.tsx` | Error boundary for the directory |
| `app/loading.tsx` | Suspense fallback |
| `app/not-found.tsx` | 404 boundary |
| `app/middleware.ts` | Request middleware (runs before routing) |
| `app/route.ts` | API route handler |
| `island.MyComponent.tsx` | Server island — independent Suspense boundary |

Dynamic segments follow the Next.js App Router convention: `[param]`, `[...rest]`, `[[...optional]]`.

Parallel routes use `@slotName` directory prefixes. Intercepting routes use `(.)`, `(..)`, or `(...)` prefixes.

### Page module exports

```ts
// app/dashboard/page.tsx
import type { Metadata } from 'fabrk'

// Required: default export is the page component
export default function Dashboard({ params, searchParams }: {
  params: Record<string, string>
  searchParams: Record<string, string>
}) {
  return <div>Dashboard</div>
}

// Optional: static metadata
export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your dashboard',
}

// Optional: dynamic metadata (runs server-side)
export async function generateMetadata({ params }: { params: Record<string, string> }) {
  return { title: `Item ${params.id}` }
}

// Optional: static paths for pre-rendering
export async function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }]
}

// Optional: ISR — revalidate every N seconds
export const revalidate = 60

// Optional: tag-based ISR invalidation
export const tags = ['products']

// Optional: force edge runtime for this route
export const runtime = 'edge'

// Optional: enable Partial Pre-Rendering
export const ppr = true
```

### Middleware

Place `app/middleware.ts` (or `.js`) in the app directory. It receives a `Request` and can return a `Response` to short-circuit, or a config object to rewrite the URL or add response headers:

```ts
// app/middleware.ts
export default async function middleware(request: Request) {
  const url = new URL(request.url)

  // Short-circuit — return a Response to block/redirect
  if (!isAuthenticated(request)) {
    return Response.redirect(new URL('/login', request.url))
  }

  // Rewrite the URL without a redirect
  if (url.pathname.startsWith('/legacy')) {
    return { rewriteUrl: url.pathname.replace('/legacy', '/v2') }
  }

  // Add response headers to every matched response
  const responseHeaders = new Headers()
  responseHeaders.set('X-Custom-Header', 'value')
  return { responseHeaders }
}
```

---

## SSR

Every page request goes through `handleRequest`, which:

1. Runs middleware (if present)
2. Extracts the locale from the path (if i18n is configured)
3. Matches the route
4. Loads the page module and all layout modules via Vite's `ssrLoadModule`
5. Resolves metadata by merging `generateMetadata` from layouts and the page
6. Renders the React tree to an HTML string
7. Returns a `Response` with security headers on every path — including error paths

In production, the Vite dev server is replaced by a Node.js HTTP server. For Cloudflare Workers, use `createFetchHandler`:

```ts
import { createFetchHandler } from 'fabrk'

export default createFetchHandler({ /* options */ })
```

---

## Agents

Agents live in `app/agents/<name>.ts` and are accessible via the agent route handler at `/api/agents/:name`.

### Defining an agent

```ts
// app/agents/assistant.ts
import { defineAgent } from 'fabrk'

export default defineAgent({
  model: 'claude-sonnet-4-5',          // Provider detected from model name prefix
  fallback: ['gpt-4o'],                  // Tried in order if primary model fails
  systemPrompt: 'You are a helpful assistant.',
  tools: ['search', 'calculator'],       // Tool names registered in the tool registry
  stream: true,
  auth: 'none',                          // 'required' | 'optional' | 'none'
  budget: {
    daily: 10.00,                        // USD
    perSession: 1.00,
    alertThreshold: 0.8,                 // Warn at 80% of budget
    perUser: 2.00,                       // Per-user daily limit
    perTenant: 50.00,                    // Per-tenant daily limit
  },
  memory: {
    maxMessages: 100,
    semantic: { topK: 5, threshold: 0.7 },
    compression: {
      enabled: true,
      triggerAt: 80,
      keepRecent: 20,
      summarize: async (messages) => callLLM('Summarize: ' + JSON.stringify(messages)),
    },
  },
  inputGuardrails: [maxLength(10_000), denyList([/\bSSN\b/])],
  outputGuardrails: [piiRedactor()],
  handoffs: ['specialist'],              // Emit handoff event when 'specialist' tool is called
  outputSchema: {                        // Parse final text as JSON and emit structured-output event
    type: 'object',
    properties: { answer: { type: 'string' }, confidence: { type: 'number' } },
    required: ['answer'],
  },
})
```

### The agent loop

The loop follows the ReAct pattern: observe (receive messages) → think (call LLM) → act (execute tools) → repeat until no tool calls remain, then yield `done`.

Key properties:
- Hard cap of **25 iterations** regardless of `maxIterations` setting
- Tool calls within a single LLM response execute in parallel via `Promise.allSettled`
- Tool failures return `"Error: Tool execution failed"` to the LLM rather than crashing the loop
- Budget is checked at the start of each iteration
- Guardrails run on the last user message (input) and on the final text response (output)

SSE event stream from the agent route:

```
data: {"type":"text-delta","content":"Hello"}
data: {"type":"tool-call","name":"search","input":{"q":"cats"},"iteration":0}
data: {"type":"tool-result","name":"search","output":"...","durationMs":142,"iteration":0}
data: {"type":"usage","promptTokens":450,"completionTokens":82,"cost":0.0031}
data: {"type":"text","content":"Here is what I found..."}
data: {"type":"done"}
```

Other event types: `error`, `approval-required`, `handoff`, `structured-output`.

### Client hook

```tsx
import { useAgent } from 'fabrk'

function Chat() {
  const { send, stop, messages, isStreaming, cost, usage, error, toolCalls } = useAgent('assistant')

  return (
    <>
      {messages.map((m, i) => (
        <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
          {typeof m.content === 'string' ? m.content : '[multimodal]'}
        </div>
      ))}
      {isStreaming && <button onClick={stop}>Stop</button>}
      <input onKeyDown={(e) => e.key === 'Enter' && send(e.currentTarget.value)} />
    </>
  )
}
```

`useAgent` caps history at 50 messages before sending to avoid unbounded payloads. It handles both streaming (SSE) and non-streaming (JSON) responses transparently. The `stop()` method aborts the in-flight fetch.

---

## Tools

Tools are how agents take actions in the world. You define a tool with a name, JSON schema, and handler function. The agent loop calls the handler when the LLM requests that tool.

### Defining a tool

```ts
import { defineTool, textResult } from 'fabrk'

const searchTool = defineTool({
  name: 'search',
  description: 'Search the web for current information.',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
      maxResults: { type: 'number', description: 'Maximum results (default 5)' },
    },
    required: ['query'],
  },
  handler: async (input) => {
    const results = await performSearch(input.query as string)
    return textResult(results.join('\n'))
  },
  requiresApproval: false, // Set true to pause and emit approval-required event
})
```

Tool results can include text, images (base64), or files:

```ts
return {
  content: [
    { type: 'text', text: 'Caption for the image' },
    { type: 'image', data: base64String, mediaType: 'image/png' },
  ],
}
```

### Built-in tools

**SQL query tool** — executes parameterized queries against your database:

```ts
import { sqlQueryTool } from 'fabrk'

const tool = sqlQueryTool({
  execute: async (sql, params) => db.query(sql, params),
  maxRows: 100,
  allowedTables: ['users', 'orders'], // Allowlist prevents arbitrary table access
})
```

**RAG tool** — retrieves relevant context from a knowledge base:

```ts
import { ragToolFromPipeline } from 'fabrk'
import { createRagPipeline, getEmbeddingProvider } from '@fabrk/ai'

const pipeline = createRagPipeline({
  embedder: getEmbeddingProvider({ provider: 'openai' }),
})
await pipeline.ingest(docsText, { source: 'docs' })

const tool = ragToolFromPipeline(pipeline, {
  name: 'knowledge-search',
  description: 'Search the knowledge base.',
  topK: 5,
})
```

**Computer use tools** — Anthropic `computer_use_20250124`-compatible:

```ts
import { defineBashTool, defineTextEditorTool, defineComputerTool } from 'fabrk'

const bash = defineBashTool({ onExecute: async (cmd) => execTool(cmd) })
const editor = defineTextEditorTool({ onExecute: async (cmd, opts) => runEditor(cmd, opts) })
const computer = defineComputerTool({ onAction: async (action) => performAction(action), onScreenshot: async () => takeScreenshot() })
```

### Isomorphic tool split

Sometimes you need to send tool descriptions to the client — for example, to render a UI showing available tools — without leaking server-side handler code. `toolDefinition` lets you define the tool once and strip the handler at the boundary:

```ts
import { toolDefinition, clientTools } from 'fabrk'

const myTool = toolDefinition('send-email')
  .description('Send an email to a user.')
  .schema({ type: 'object', properties: { to: { type: 'string' }, body: { type: 'string' } }, required: ['to', 'body'] })
  .server(async (input) => {
    await sendEmail(input.to as string, input.body as string)
    return textResult('Email sent.')
  })
  .client()

// In a server module:
export const tool = myTool.asTool()

// In a client module — handler is stripped:
export const clientDescriptors = clientTools([myTool])
```

---

## MCP (Model Context Protocol)

MCP is an open protocol for sharing tools, resources, and prompts between AI systems. You can expose your app's tools as an MCP server, or connect to external MCP servers and use their tools in your agents.

### Exposing tools as an MCP server

```ts
import { createMCPServer } from 'fabrk'

const server = createMCPServer({
  name: 'my-app',
  version: '1.0.0',
  tools: [searchTool, calculatorTool],
  resources: [
    {
      uri: 'data://config',
      name: 'App config',
      mimeType: 'application/json',
      read: async () => JSON.stringify(appConfig),
    },
  ],
  prompts: [
    {
      name: 'summarize',
      description: 'Summarize a document',
      args: [{ name: 'text', required: true }],
      get: async (args) => `Summarize: ${args.text}`,
    },
  ],
})
```

Configure in `fabrk.config.ts` to expose via HTTP:

```ts
export default {
  mcp: { expose: true },
}
```

This mounts the MCP server at `/__ai/mcp`.

### Consuming external MCP servers

```ts
import { connectMCPServer } from 'fabrk'

// HTTP transport
const conn = await connectMCPServer({
  transport: 'http',
  url: 'https://mcp.example.com/server',
  auth: { type: 'bearer', token: process.env.MCP_TOKEN! },
})

// stdio transport — for local tools
const conn = await connectMCPServer({
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem'],
})

// Tools from the MCP connection can be passed directly to an agent
console.log(conn.tools) // ToolDefinition[]
```

OAuth2 is supported for MCP HTTP connections. The token cache refreshes before expiry automatically.

---

## Workflows

Workflows are linear sequences of steps. Use them when you want explicit control over step order and branching, rather than letting the LLM decide what to do next.

```ts
import { defineWorkflow, agentStep, toolStep, conditionStep, parallelStep, runWorkflow } from 'fabrk'

const researchWorkflow = defineWorkflow('research', [
  agentStep('gather', async (ctx) => {
    const result = await callAgent('researcher', ctx.input)
    ctx.set('raw', result)
    return result
  }),
  parallelStep('enrich', [
    toolStep('fetch-details', async (ctx) => fetchDetails(ctx.get('raw'))),
    toolStep('translate', async (ctx) => translate(ctx.get('raw'))),
  ]),
  conditionStep('needs-review',
    (ctx) => ctx.get('raw').includes('FLAGGED'),
    [agentStep('review', async (ctx) => humanReview(ctx.get('raw')))],
    [agentStep('publish', async (ctx) => publish(ctx.get('raw')))]
  ),
])

const result = await researchWorkflow.run('Research topic: quantum computing')
if (result.status === 'completed') {
  console.log(result.output)
}
```

### Suspendable steps (human-in-the-loop)

```ts
import { suspendableStep, resumeWorkflow } from 'fabrk'

const approvalWorkflow = defineWorkflow('approval', [
  agentStep('draft', async (ctx) => generateDraft(ctx.input)),
  suspendableStep('human-review', async (ctx, control) => {
    // Suspend and surface a payload to the caller
    control.suspend({ draftOutput: ctx.get('draft'), question: 'Approve?' })
    // Code after suspend() never runs in the first call.
    // After resume, execution continues here.
    return ctx.get('approval') ? 'Approved' : 'Rejected'
  }),
])

// First call: returns { status: 'suspended', suspendPayload: { ... }, checkpointId }
const result1 = await approvalWorkflow.run(input)

// Later, after human interaction:
const result2 = await resumeWorkflow(approvalWorkflow, result1.checkpointId, { approval: true })
```

---

## StateGraph (cyclic workflows)

`defineStateGraph` handles workflows that need cycles — where a node routes back to a previous node based on its output. Use this for retry loops, reflection passes, or multi-stage pipelines where the number of iterations is not known upfront.

```ts
import { defineStateGraph } from 'fabrk'

interface ReviewState {
  draft: string
  feedback: string
  approved: boolean
  attempts: number
}

const graph = defineStateGraph<ReviewState>({
  initialState: { draft: '', feedback: '', approved: false, attempts: 0 },
  initial: 'write',
  maxCycles: 10,
  nodes: [
    {
      name: 'write',
      run: async (input, state) => {
        const draft = await writeDraft(state.feedback || String(input))
        return { nextNode: 'review', state: { ...state, draft, attempts: state.attempts + 1 } }
      },
    },
    {
      name: 'review',
      run: async (input, state) => {
        const { approved, feedback } = await reviewDraft(state.draft)
        if (approved) return { nextNode: 'END', state: { ...state, approved: true } }
        return { nextNode: 'write', state: { ...state, feedback } }
      },
    },
  ],
  edges: [
    { from: 'write', to: 'review' },
    { from: 'review', to: (output) => (output as { approved: boolean }).approved ? 'END' : 'write' },
  ],
})

for await (const event of graph.run('Write a blog post about TypeScript')) {
  console.log(event.type, event.node, event.state)
  if (event.type === 'done') break
}
```

StateGraph supports interrupt points for human review:

```ts
import { interrupt } from 'fabrk'

const graph = defineStateGraph<MyState>({
  // ...
  nodes: [{
    name: 'review',
    run: async (input, state) => {
      interrupt({ question: 'Approve?', data: state.draft }) // Pauses graph
      return { nextNode: 'END', state }
    },
  }],
  interruptBefore: ['review'], // Also supports interrupt before/after named nodes
})
```

---

## Agent orchestration

### Agent as tool

One agent can call another agent directly in-process — no HTTP round-trip needed:

```ts
import { agentAsTool } from 'fabrk'

const specialistTool = agentAsTool({
  name: 'specialist',
  description: 'Calls the specialist agent for domain expertise.',
  agentName: 'specialist',
})
```

### Supervisor

```ts
import { defineSupervisor } from 'fabrk'

const supervisor = defineSupervisor({
  agents: ['researcher', 'writer', 'reviewer'],
  routingStrategy: 'llm',  // or 'round-robin', 'random'
  model: 'claude-sonnet-4-5',
  maxDelegationDepth: 3,
})
```

### Agent network

A named collection of agents with a configurable router:

```ts
import { defineAgentNetwork } from 'fabrk'

const network = defineAgentNetwork({
  agents: { researcher, writer },
  router: async (input, ctx) => {
    if (input.includes('research')) return 'researcher'
    return 'writer'
  },
})
```

---

## Guardrails

Guardrails check content before it reaches the LLM (input) and before it reaches the user (output). Each guardrail can block, pass, or rewrite the content.

```ts
import { maxLength, denyList, piiRedactor, requireJsonSchema } from 'fabrk'

const inputGuardrails = [
  maxLength(50_000),
  denyList([/\bpassword\b/i, /\bsecret\b/i]),
]

const outputGuardrails = [
  piiRedactor(),  // Replaces email, phone, SSN patterns with [REDACTED]
  requireJsonSchema({ required: ['answer'], properties: { answer: { type: 'string' } } }),
]
```

Custom guardrail (sync or async):

```ts
import type { Guardrail } from 'fabrk'

const profanityFilter: Guardrail = (content, ctx) => {
  if (containsProfanity(content)) {
    return { pass: false, reason: 'Content contains profanity' }
  }
  return { pass: true }
}

// To replace instead of block:
const sanitizer: Guardrail = (content) => ({
  pass: true,
  replacement: content.replace(/\bfoo\b/g, '[filtered]'),
})
```

For guardrails that make API calls, run them in parallel to avoid stacking latency:

```ts
import { runGuardrailsParallel } from 'fabrk'

const result = await runGuardrailsParallel([guard1, guard2, guard3], content, ctx)
```

---

## Stop conditions

Stop conditions let you terminate the agent loop early based on what has happened so far. You compose them from predicates:

```ts
import { stepCountIs, hasToolCall } from 'fabrk'

defineAgent({
  // ...
  // Stop after 3 iterations regardless of tool calls
  stopWhen: stepCountIs(3),

  // Stop when the agent calls the 'finalize' tool
  stopWhen: hasToolCall('finalize'),

  // Both conditions checked — stops when either passes
  stopWhen: [stepCountIs(5), hasToolCall('done')],
})
```

---

## Evals and testing

### MockLLM

`MockLLM` replaces the LLM in tests — no API calls, no cost, no flakiness:

```ts
import { mockLLM } from 'fabrk'

const mock = mockLLM()
  .onMessage('hello').respondWith('Hello back!')
  .onMessage(/weather/i).callTool('get-weather', { location: 'SF' })
  .onToolCall('get-weather').returnResult('72°F, sunny')
  .setDefault('I am not sure.')

// Use as generateWithTools or streamWithTools in runAgentLoop
const generate = mock.asGenerateWithTools()
const stream = mock.asStreamWithTools()

// Inspect calls
console.log(mock.callCount)
console.log(mock.getCalls()[0].messages)
```

### createTestAgent

A higher-level wrapper that runs an agent with a mock LLM and collects assertions:

```ts
import { createTestAgent, calledTool, calledToolWith, respondedWith, costUnder } from 'fabrk'

const result = await createTestAgent({
  mock: mockLLM().onMessage('search').callTool('search', { q: 'test' }),
  tools: [searchTool],
  systemPrompt: 'Be helpful.',
  messages: [{ role: 'user', content: 'search for something' }],
})

calledTool(result, 'search')            // Asserts search was called
calledToolWith(result, 'search', { q: 'test' }) // Asserts exact arguments
respondedWith(result, /found/i)          // Asserts final text matches
costUnder(result, 0.01)                  // Asserts cost stayed under budget
```

### defineEval / runEvals

Evals are structured test suites with scorers. Run them in CI to catch regressions in agent behavior before they reach users.

```ts
import { defineEval, runEvals, exactMatch, includes, toolCallSequence, llmAsJudge } from 'fabrk'

const suite = defineEval({
  name: 'customer-support-eval',
  agent: {
    mock: mockLLM().onMessage('refund').respondWith('I can help you with a refund.'),
    systemPrompt: 'You are a helpful support agent.',
  },
  cases: [
    { input: 'I want a refund', expected: 'I can help you with a refund.' },
    { input: 'How do I cancel?', expected: /cancel.*account/i },
  ],
  scorers: [exactMatch(), includes('refund')],
  threshold: 0.8,  // Pass if >= 80% of cases pass
})

const result = await runEvals(suite)
console.log(result.passRate, result.pass)
```

Built-in scorers:

| Scorer | What it checks |
|--------|---------------|
| `exactMatch()` | Output === expected (string comparison) |
| `includes(substring)` | Output contains substring or matches regex |
| `toolCallSequence(names)` | Agent called tools in the specified order |
| `jsonSchema(schema)` | Output is valid JSON matching the schema |
| `llmAsJudge({ judge })` | Calls an LLM to rate the output (0-1 score) |

For versioned datasets and regression tracking across releases:

```ts
import { defineDataset, FileEvalRunStore } from 'fabrk'

const dataset = defineDataset({
  name: 'support-cases-v2',
  cases: [...],
})

const store = new FileEvalRunStore('./eval-results')
const result = await runEvals(suite, { dataset, store, compareWith: 'previous' })
```

---

## fabrk.config.ts

```ts
// fabrk.config.ts
import { defineFabrkConfig } from 'fabrk/config'

export default defineFabrkConfig({
  siteUrl: 'https://myapp.com',

  ai: {
    defaultModel: 'claude-sonnet-4-5',
    fallback: ['gpt-4o'],
    budget: { daily: 100, perSession: 5, alertThreshold: 0.9 },
  },

  agents: {
    maxIterations: 15,
    defaultStream: true,
  },

  mcp: {
    expose: true,           // Mount MCP server at /__ai/mcp
    consume: ['stdio://some-tool'],
  },

  i18n: {
    locales: ['en', 'fr', 'de'],
    defaultLocale: 'en',
    strategy: 'prefix',  // Routes become /en/page, /fr/page, etc.
  },

  tracing: {
    enabled: true,
    exporter: 'otlp',
    endpoint: 'http://localhost:4318/v1/traces',
    serviceName: 'my-app',
  },

  reactCompiler: true,  // Requires babel-plugin-react-compiler installed
})
```

The Vite plugin loads the config file at startup. Both `.ts` and `.js` extensions are supported. A missing config file is valid — every option is optional.

---

## Durable agents (checkpoint/resume)

Durable agents save their state to a checkpoint store after each step. That means they survive process restarts and can be paused for hours or days before resuming.

```ts
import { handleStartAgent, handleResumeAgent, handleAgentStatus, InMemoryCheckpointStore } from 'fabrk'

const store = new InMemoryCheckpointStore()

// In your route handler:
app.post('/agents/:name/start', (req, res) => handleStartAgent(req, res, { store }))
app.post('/agents/:name/resume/:id', (req, res) => handleResumeAgent(req, res, { store }))
app.get('/agents/:name/status/:id', (req, res) => handleAgentStatus(req, res, { store }))
```

In production, replace `InMemoryCheckpointStore` with a Prisma or Redis implementation of the `CheckpointStore` interface.

---

## OpenTelemetry

When `@opentelemetry/api` is not installed, the tracer does nothing and costs nothing. When it is installed, spans are created automatically for agent loop iterations, LLM calls, tool calls, guardrail runs, and SSR requests.

```ts
import { initTracer, startSpan } from 'fabrk'

initTracer('my-app')  // Called automatically by the Vite plugin

// In your own code:
const span = startSpan('custom-operation', { 'custom.attr': 'value' })
try {
  await doWork()
} finally {
  span?.end()
}
```
