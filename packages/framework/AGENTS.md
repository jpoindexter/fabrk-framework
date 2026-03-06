# AGENTS.md — @fabrk/framework

> For AI coding agents (Claude Code, Cursor, Copilot, v0.dev)

## What This Package Is

`@fabrk/framework` is the full-stack framework package — own Vite 7 runtime (file-system routing, SSR with streaming, middleware, metadata injection) with AI agents, tools, testing utilities, built-in tools, orchestration, skills, MCP, and a developer dashboard.

## Entry Points

| Import | Purpose |
|--------|---------|
| `@fabrk/framework` | Default: Vite plugin. Named: `defineAgent`, `defineTool`, `defineSkill`, `defineSupervisor`, `defineAgentNetwork`, `defineStateGraph`, `defineWorkflow`, `runGuardrails`, `useObject`, `useViewTransition`, `ViewTransitionLink`, `handleStreamObject`, testing/eval helpers, built-in tools, MCP, A2A |
| `@fabrk/framework/fabrk` | Full API (agents, tools, SSE, budget, config, middleware, prompts, dashboard) |
| `@fabrk/framework/client/use-agent` | `useAgent()` React hook, `parseSSELine()`, `readSSELines()` |
| `@fabrk/framework/components` | Re-exports `@fabrk/components` |
| `@fabrk/framework/themes` | Re-exports `@fabrk/design-system` |
| `@fabrk/framework/worker` | `createFetchHandler()` for edge runtimes |

## File Conventions

```
app/
├── layout.tsx          # Root layout (wraps all pages)
├── middleware.ts        # Runs before route matching
├── page.tsx            # Route: /
├── about/
│   └── page.tsx        # Route: /about
├── blog/
│   └── [slug]/
│       └── page.tsx    # Route: /blog/:slug
└── api/
    └── hello/
        └── route.ts    # API: /api/hello (GET/POST/etc)
```

- `page.tsx` = page component (default export)
- `layout.tsx` = wrapping layout (receives `children`, nests automatically)
- `route.ts` = API route (export `GET`, `POST`, `PUT`, `DELETE`, etc.)
- `middleware.ts` = runs before routing; return `Response` to short-circuit
- `[param]` = dynamic segments → `params.param`
- `export const metadata = { title, description }` on pages → injected into `<head>`

## Vite Plugin

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import fabrk from '@fabrk/framework'

export default defineConfig({
  plugins: [...fabrk()]
})
```

The `fabrk()` default export returns an array of Vite plugins. All sub-plugins default to enabled; pass `false` to disable:

```typescript
fabrk({ agents: true, dashboard: true, serverActions: true, voice: true })
```

- `fabrk:router` — file-system routing + SSR middleware
- `fabrk:virtual-entries` — virtual modules for client/SSR entries
- `fabrk:design-system` — warns at dev-server transform time when `.tsx`/`.jsx` files contain hardcoded Tailwind color classes (e.g. `bg-blue-500`) in `className` strings; logs with file path and offending classes
- `fabrk:agents` — agent scanning + SSE endpoints
- `fabrk:dashboard` — `/__ai` dev dashboard
- `fabrk:server-action-transform` — `"use server"` compiler transform (disable with `serverActions: false`)
- `fabrk:voice` — voice routes `/__ai/tts`, `/__ai/stt`, `/__ai/realtime` (disable with `voice: false`)

## Agent System

### defineAgent(options)

```typescript
import { defineAgent } from '@fabrk/framework'

export default defineAgent({
  model: 'claude-sonnet-4-6',
  tools: ['search-docs'],
  auth: 'required',
  budget: { daily: 10.0, perSession: 0.50, perUser: 1.0, perTenant: 50.0 },
  systemPrompt: 'You are a helpful assistant.',
  // Structured output: parse final response as JSON and emit structured-output event
  outputSchema: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] },
  // Guardrails on input and output
  inputGuardrails: [maxLength(4000), denyList([/profanity/i])],
  outputGuardrails: [piiRedactor()],
  // Hand off to sub-agents by name
  handoffs: ['researcher', 'coder'],
  // Long-term memory across threads
  memory: {
    longTerm: { store: new InMemoryLongTermStore(), namespace: 'my-agent' },
    workingMemory: { template: (msgs) => msgs.map(m => m.content).join('\n') },
  },
})
```

`DefineAgentOptions` fields (all optional except `model`):

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | LLM model ID (required) |
| `fallback` | `string[]` | Fallback model IDs tried in order |
| `systemPrompt` | `string` | System message prepended to every conversation |
| `tools` | `string[]` | Tool names the agent can call |
| `budget` | `AgentBudget` | Spend limits: `daily`, `perSession`, `perUser`, `perTenant`, `alertThreshold` |
| `stream` | `boolean` | Default: `false` |
| `auth` | `'required'\|'optional'\|'none'` | Default: `'none'` |
| `memory` | `boolean\|AgentMemoryConfig` | Enable memory (see Memory section) |
| `outputSchema` | `Record<string,unknown>` | JSON Schema; enables structured-output event on final response |
| `handoffs` | `string[]` | Agent names this agent can hand off to |
| `inputGuardrails` | `Guardrail[]` | Run before agent processes user message |
| `outputGuardrails` | `Guardrail[]` | Run before agent returns response |
| `toolHooks` | `ToolExecutorHooks` | Lifecycle hooks for tool calls |
| `generationOptions` | `GenerationOptions` | Provider-level generation params (temperature, topP, etc.) |
| `skills` | `SkillDefinition[]` | Pre-built skill bundles to attach |
| `agents` | `Array<{name,description}>` | Sub-agent descriptors (used with `defineSupervisor`) |

### createAgentHandler(options)

```typescript
import { createAgentHandler } from '@fabrk/framework/fabrk'

const handler = createAgentHandler({
  model: 'claude-sonnet-4-6',
  tools: [],
  stream: true,
  auth: 'required',
  budget: { daily: 10.0 },
})
// handler(request: Request) => Promise<Response>
```

### SSE Streaming

```typescript
import { createSSEResponse, formatSSEEvent } from '@fabrk/framework/fabrk'

const response = createSSEResponse(async function* () {
  yield { type: 'text', content: 'Hello' }
  yield { type: 'done' }
})
```

## Tool System

### defineTool(options)

```typescript
import { defineTool, textResult } from '@fabrk/framework'

export default defineTool({
  name: 'search-docs',
  description: 'Search documentation',
  schema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  handler: async (input) => textResult(`Found: ${input.query}`),
})
```

### Built-in Tools

#### sqlQueryTool(options)

SQL query tool for agents. Accepts any database driver via an injected `query` function. Read-only by default; blocks INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE.

```typescript
import { sqlQueryTool } from '@fabrk/framework'

const tool = sqlQueryTool({
  query: async (sql, params) => db.query(sql, params),  // your driver here
  allowWrite: false,   // default: read-only
  timeoutMs: 5000,     // default: 5000 ms
  maxRows: 100,        // default: 100 rows
  maxResultBytes: 100_000,  // default: 100 KB
})
```

Options:
- `query` (required) — `(sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>`
- `allowWrite` — allow INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE (default: `false`)
- `timeoutMs` — abort query after N ms (default: `5000`)
- `maxRows` — truncate result to at most N rows (default: `100`)
- `maxResultBytes` — truncate serialized result to at most N bytes (default: `100000`)

Results are returned as a GitHub-flavoured markdown table. Truncation notices are appended when limits are hit. All errors return a safe generic message; internal details are logged server-side only.

#### ragTool(options)

RAG (Retrieval-Augmented Generation) search tool. Pluggable vector store via an injected `search` function.

```typescript
import { ragTool } from '@fabrk/framework'
import type { RagResult } from '@fabrk/framework'

const tool = ragTool({
  search: async (query, topK) => vectorStore.search(query, topK),
  name: 'knowledge-search',           // default
  description: 'Search the knowledge base for relevant information.',  // default
  topK: 5,                            // default: 5 results
  minScore: 0.7,                      // filter results below this score
  formatResult: (results, query) => results.map(r => r.content).join('\n'),
})
```

Options:
- `search` (required) — `(query: string, topK: number) => Promise<RagResult[]>`
- `name` — tool name exposed to the LLM (default: `"knowledge-search"`)
- `description` — tool description (default: `"Search the knowledge base for relevant information."`)
- `topK` — default number of results (default: `5`)
- `minScore` — exclude results with score below this threshold; results without a score always pass through (default: `0.0`)
- `formatResult` — custom formatter `(results: RagResult[], query: string) => string`

`RagResult` type:
```typescript
interface RagResult {
  content: string
  score?: number
  metadata?: Record<string, unknown>
}
```

Default formatting: numbered `[1] content`, optional `score:` line, optional `metadata keys:` line.

#### ragToolFromPipeline(pipeline, options?)

Convenience wrapper for `ragTool` that accepts a `RagPipeline` (from `@fabrk/ai`) directly. Calls `pipeline.search(query, { topK })` and maps `RetrievedChunk` fields to `RagResult`.

```typescript
import { ragToolFromPipeline } from '@fabrk/framework'
import { createRagPipeline, InMemoryVectorStoreAdapter, OpenAIEmbeddingProvider } from '@fabrk/ai'

const pipeline = createRagPipeline({
  embedder: new OpenAIEmbeddingProvider(),
  store: new InMemoryVectorStoreAdapter(),
})
const tool = ragToolFromPipeline(pipeline, { name: 'docs-search', topK: 5 })
```

Accepts the same optional fields as `ragTool` except `search` (which is derived from the pipeline).

## Orchestration

### defineSupervisor(config)

Creates a supervisor agent that routes or plans across sub-agents. The supervisor calls sub-agents via `agentAsTool`, injecting them as tools automatically.

```typescript
import { defineSupervisor } from '@fabrk/framework'

const supervisor = defineSupervisor({
  name: 'coordinator',
  model: 'claude-sonnet-4-6',
  strategy: 'router',             // 'router' | 'planner'
  maxDelegations: 5,              // default: 5, max: 10
  agents: [
    { name: 'researcher', description: 'Searches the web' },
    { name: 'coder', description: 'Writes code' },
  ],
  handlerFactory: async (name) => {
    const mod = await import(`./agents/${name}`)
    return mod.default
  },
})
```

`SupervisorConfig` fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Supervisor agent name |
| `model` | `string` | LLM model for the supervisor |
| `strategy` | `'router'\|'planner'` | `router` delegates once; `planner` breaks into sequential steps |
| `agents` | `Array<{name,description}>` | Sub-agents to delegate to |
| `handlerFactory` | `(name: string) => Promise<handler>` | Factory that returns each sub-agent's request handler |
| `maxDelegations` | `number` | Max sub-agent calls, capped at 10 (default: 5) |
| `budget` | `AgentBudget` | Shared budget across delegations |
| `systemPrompt` | `string` | Appended after strategy system prompt |

### agentAsTool(descriptor, handlerFactory)

Wraps a sub-agent as a `ToolDefinition` callable by any agent. Used internally by `defineSupervisor`.

```typescript
import { agentAsTool } from '@fabrk/framework'

const researcherTool = agentAsTool(
  { name: 'researcher', description: 'Searches the web for information' },
  async (name) => (await import(`./agents/${name}`)).default
)
```

## Multi-Agent Networks

### defineAgentNetwork(config)

Routes messages across multiple agents via a custom or LLM-based router. Each hop passes the output of one agent as the input to the next.

```typescript
import { defineAgentNetwork } from '@fabrk/framework'

const network = defineAgentNetwork({
  agents: {
    researcher: { execute: async (input, ctx) => await researcher.run(input) },
    writer:     { execute: async (input, ctx) => await writer.run(input) },
  },
  // Custom router function:
  router: (input, ctx) => ctx.iteration === 0 ? 'researcher' : 'writer',
  // OR LLM-based router:
  // router: { model: 'gpt-4o-mini', systemPrompt: 'Pick an agent.' },
  maxHops: 5,  // default: 5
})

const result = await network.run('Research and write an article about AI safety')
// result: { output, hops, history }
```

`AgentNetworkConfig` fields:

| Field | Type | Description |
|-------|------|-------------|
| `agents` | `Record<string, {execute}>` | Map of agent name → `execute(input, ctx)` function |
| `router` | `RouterFn \| LLMRouterConfig` | Function or LLM config to select next agent; return `'END'` to stop |
| `maxHops` | `number` | Max agent calls before stopping (default: 5) |

`AgentNetworkResult`: `{ output: string; hops: number; history: Array<{agent, input, output}> }`

## StateGraph (Cyclic Workflows)

### defineStateGraph(config) / createStateGraph / StateGraphBuilder

Build stateful, cyclic graphs where nodes can loop back on themselves. Each node receives the current state and returns the next node name plus updated state.

```typescript
import { defineStateGraph, MessagesAnnotation, interrupt, GraphInterrupt, subgraphNode } from '@fabrk/framework'

const graph = defineStateGraph<{ count: number; result: string }>({
  nodes: [
    {
      name: 'increment',
      run: async (input, state) => {
        const count = state.count + 1
        if (count >= 3) return { nextNode: 'END', state: { ...state, count } }
        return { nextNode: 'increment', state: { ...state, count } }
      },
    },
  ],
  edges: [],
  initial: 'increment',
  initialState: { count: 0, result: '' },
  maxCycles: 50,        // default: 50 — guard against infinite loops
  interruptBefore: ['increment'],  // pause before these nodes
  interruptAfter: ['increment'],   // pause after these nodes
})

// Run — returns AsyncGenerator<StateGraphEvent<S>>
for await (const event of graph.run('start')) {
  // event.type: 'node-enter' | 'node-exit' | 'edge' | 'done' | 'error' | 'interrupt'
  // event.state — current state snapshot
  // event.cycles — cycle counter
}

// Resume after interrupt:
for await (const event of graph.run('resume', {
  resumeFrom: { node: 'increment', command: { goto: 'increment', update: { count: 0 } } }
})) { }
```

`StateGraphConfig<S>` fields:

| Field | Type | Description |
|-------|------|-------------|
| `nodes` | `GraphNode<S>[]` | Each node: `{ name, run(input, state) => Promise<NodeResult<S>> }` |
| `edges` | `GraphEdge[]` | Static edges: `{ from, to: string\|(output,state)=>string }` |
| `initial` | `string` | Starting node name |
| `initialState` | `S` | Starting state value |
| `maxCycles` | `number` | Hard cap on node executions (default: 50) |
| `reducers` | `StateReducers<S>` | Per-field merge functions for partial state updates |
| `interruptBefore` | `string[]` | Nodes to pause before executing |
| `interruptAfter` | `string[]` | Nodes to pause after executing |

**`MessagesAnnotation`** — pre-built annotation for `{ messages: LLMMessage[] }` state.

**`interrupt(value)`** — throw from inside a node to emit an `interrupt` event and pause the graph. Resume with `resumeFrom`.

**`GraphInterrupt`** — the error class thrown by `interrupt()`.

**`subgraphNode(name, compiledGraph)`** — wrap a compiled `StateGraph` as a node in a parent graph.

**`Command<S>`** type: `{ goto: string; update?: Partial<S> }` — passed to `resumeFrom.command`.

## Workflows (Linear)

### defineWorkflow / agentStep / toolStep / conditionStep / parallelStep / suspendableStep

Linear, ordered execution with branching and parallelism. Each step receives a `WorkflowContext` with the original input and prior step outputs.

```typescript
import {
  defineWorkflow, agentStep, toolStep, conditionStep, parallelStep, suspendableStep,
  runWorkflow, createWorkflowStream,
} from '@fabrk/framework'

const wf = defineWorkflow('pipeline', [
  agentStep('research', async (ctx) => `facts about: ${ctx.input}`),
  conditionStep('check',
    (ctx) => ctx.history[0].output.length > 100,
    [agentStep('summarize', async (ctx) => `summary: ${ctx.history[0].output}`)],
    [agentStep('expand',   async (ctx) => `expanded: ${ctx.history[0].output}`)],
  ),
  parallelStep('gather', [
    toolStep('fetch-a', async (ctx) => 'data-a'),
    toolStep('fetch-b', async (ctx) => 'data-b'),
  ]),
  suspendableStep('approve', async (ctx, { suspend }) => {
    // suspend pauses the workflow and serializes resume data
    suspend({ pendingItem: ctx.input })
  }),
])

// Run synchronously:
const result = await runWorkflow(wf, 'initial input', { userId: 'u_1' })
// result: { output, steps, suspended?, resumeData? }

// Stream WorkflowProgressEvent events:
const stream = createWorkflowStream(wf, 'initial input')
for await (const event of stream) {
  // event: WorkflowProgressEvent — { type, stepId, output?, error? }
}

// Resume after suspend:
import { resumeWorkflow } from '@fabrk/framework'
const resumed = await resumeWorkflow(wf, suspendedResult, { approved: true })
```

Step types:
- `agentStep(id, run)` — agent-executed step
- `toolStep(id, run)` — tool-executed step
- `conditionStep(id, condition, thenSteps, elseSteps?)` — branching
- `parallelStep(id, steps)` — concurrent execution; all steps run simultaneously
- `suspendableStep(id, run, opts?)` — can call `suspend(data)` to pause; resume via `resumeWorkflow`

`WorkflowContext`: `{ input, history: [{stepId, output}][], metadata?, writer? }`

## Durable Agent Execution

Checkpoint/resume for long-running or approval-gated agents.

```typescript
import {
  InMemoryCheckpointStore, generateCheckpointId,
  handleStartAgent, handleResumeAgent, handleAgentStatus,
  handleAgentHistory, handleAgentRollback,
} from '@fabrk/framework'
import type { CheckpointStore, CheckpointState, DurableAgentOptions } from '@fabrk/framework'

const store = new InMemoryCheckpointStore()

// In your API routes:
export const POST = (req) => handleStartAgent(req, { store, agent: myAgentDef })
export const PUT  = (req) => handleResumeAgent(req, { store })
export const GET  = (req) => handleAgentStatus(req, { store })
```

`CheckpointState` fields:
- `id`, `agentName`, `messages`, `iteration`, `status` (`running|paused|completed|error`)
- `pendingApproval?: { approvalId, toolName, input, expiresAt? }` — set when `requiresApproval: true` tool is called; resume sends approval decision

`CheckpointStore` methods: `save`, `load`, `delete`, `append`, `listHistory(agentName, sessionId)`, `rollback(agentName, sessionId, targetIteration)`

Tools can opt into approval flow via `requiresApproval: true` on `ToolDefinition`:
```typescript
const myTool = defineTool({
  name: 'deploy',
  requiresApproval: true,   // agent pauses, emits approval-required event
  ...
})
```

## Memory

### InMemoryLongTermStore

Cross-thread persistent key-value store. Namespace-scoped. `search()` does substring matching; swap with a vector-backed implementation for semantic search.

```typescript
import { InMemoryLongTermStore } from '@fabrk/framework'
import type { LongTermStore, LongTermEntry } from '@fabrk/framework'

const store = new InMemoryLongTermStore()
await store.set('agent-x', 'user-pref-lang', 'TypeScript')
const val = await store.get('agent-x', 'user-pref-lang')
const keys = await store.list('agent-x')
const results = await store.search('agent-x', 'TypeScript', 5)
// results: [{ key, value, score }]
await store.delete('agent-x', 'user-pref-lang')
```

`LongTermStore` interface: `set`, `get`, `delete`, `list`, `search`.

Inject into an agent via `memory.longTerm` — `memory_store` and `memory_recall` tools are auto-injected into the agent unless `autoInjectTool: false`.

### buildWorkingMemory(messages, config)

Computes a working memory string from the current thread's messages. Inject the result into the agent's system prompt.

```typescript
import { buildWorkingMemory } from '@fabrk/framework'
import type { WorkingMemoryConfig } from '@fabrk/framework'

const config: WorkingMemoryConfig = {
  template: (messages) => messages.map(m => `${m.role}: ${m.content}`).join('\n'),
  readOnly: false,  // if true, only computed at session start
}
const wm = buildWorkingMemory(threadMessages, config)
```

### SemanticMemoryStore

Wraps any `MemoryStore` to add embedding-based semantic search across stored messages. Messages are embedded asynchronously as they are appended; `search()` returns the most semantically similar messages.

```typescript
import { SemanticMemoryStore, InMemoryMemoryStore } from '@fabrk/framework'
import type { SemanticMemoryOptions } from '@fabrk/framework'
import { OpenAIEmbeddingProvider } from '@fabrk/ai'

const store = new SemanticMemoryStore(
  new InMemoryMemoryStore(),
  {
    embeddingProvider: new OpenAIEmbeddingProvider(),
    topK: 5,        // default: 5 — max results per search
    threshold: 0.7, // default: 0.7 — cosine similarity cutoff
  }
)

// Semantic search across all threads:
const messages = await store.search('payment methods', {
  agentName: 'chat',                      // optional filter by agent
  limit: 3,                               // override topK for this call
  messageRange: { before: 1, after: 1 },  // expand context around matches
})
```

`SemanticMemoryStore` implements the full `MemoryStore` interface. Embeddings are capped at 500,000 entries (LRU eviction). Embedding failures are non-fatal — the message is still stored; it just won't appear in semantic search results.

## Guardrails

Guardrails are synchronous functions applied to agent input or output before the LLM sees/returns them. They can block, pass, or replace content.

```typescript
import {
  runGuardrails, runGuardrailsParallel,
  maxLength, denyList, requireJsonSchema, piiRedactor,
} from '@fabrk/framework'
import type { Guardrail, AsyncGuardrail, GuardrailContext, GuardrailResult } from '@fabrk/framework'

// Compose built-in guardrails:
const guards = [maxLength(4000), denyList([/badword/i]), piiRedactor()]
const { content, blocked, reason } = runGuardrails(guards, userInput, {
  agentName: 'chat', sessionId: 'sess_1', direction: 'input'
})

// Parallel (async-safe — all run concurrently):
const result = await runGuardrailsParallel(guards, userInput, ctx)
```

Built-in guardrail factories:

| Factory | Description |
|---------|-------------|
| `maxLength(n)` | Blocks content longer than `n` characters |
| `denyList(patterns)` | Blocks content matching any `RegExp` in the array |
| `requireJsonSchema(schema)` | Blocks if content is not valid JSON matching the schema's `required` fields and property types |
| `piiRedactor()` | Replaces emails, US phone numbers, and SSNs with `[REDACTED]` |

Custom guardrail shape:
```typescript
const myGuard: Guardrail = (content, ctx) => {
  if (content.includes('SECRET')) return { pass: false, reason: 'Contains secret' }
  return { pass: true }
  // OR: return { pass: true, replacement: sanitized }
}
```

## Skills

Skills are pre-packaged (systemPrompt + tools + model) bundles that extend agent capabilities without coupling agent definitions.

```typescript
import { defineSkill, applySkill, composeSkills, scanSkills, docsSearch } from '@fabrk/framework'
import type { SkillDefinition, ScannedSkill } from '@fabrk/framework'

const codeSkill = defineSkill({
  name: 'code-reviewer',
  description: 'Reviews TypeScript code for bugs and style issues',
  systemPrompt: 'You are an expert TypeScript code reviewer.',
  tools: [myLintTool],
  defaultModel: 'claude-sonnet-4-6',
})

// Apply one skill to an agent definition (merges tools + system prompt):
const agent = applySkill(baseAgent, codeSkill)

// Merge multiple skills:
const agent2 = composeSkills(baseAgent, [codeSkill, searchSkill])

// Auto-discover skill files under skills/:
const skills = await scanSkills('./skills')

// Built-in: docs search skill
const search = docsSearch({ docs: [{ title: 'Intro', content: '...', url: '/docs/intro' }] })
```

## A2A Protocol (Agent-to-Agent)

### createA2AServer(options)

Creates an A2A-compatible HTTP request handler. Returns `(req: Request) => Promise<Response | null>` — returns `null` for non-A2A paths so you can fall through to your own routing.

Routes served:
- `GET /.well-known/agent.json` — agent card discovery
- `POST /` — task submission (route to agent with `@agentName <message>` prefix or default to first agent)

```typescript
import { createA2AServer } from '@fabrk/framework'

const a2aHandler = createA2AServer({
  baseUrl: 'https://my-service.example.com',
  name: 'My Agent Service',
  version: '1.0',
  agents: {
    chat: { execute: async (input, sessionId) => chatAgent.run(input) },
    coder: { execute: async (input, sessionId) => coderAgent.run(input) },
  },
  validateRequest: (req) => req.headers.get('X-Secret') === process.env.A2A_SECRET,
})

// In your route handler:
export async function handler(req: Request) {
  const a2aResponse = await a2aHandler(req)
  if (a2aResponse) return a2aResponse
  // ... your own routing
}
```

### A2AClient

Client for calling a remote A2A-compatible agent server.

```typescript
import { A2AClient, A2AClientError } from '@fabrk/framework'
import type { A2AAgentCard, A2ATask, A2ATaskResult } from '@fabrk/framework'

const client = new A2AClient('https://remote-agent.example.com')
const card = await client.discover()   // GET /.well-known/agent.json
const result = await client.sendTask({
  message: { role: 'user', parts: [{ text: '@coder write a hello world function' }] },
  sessionId: 'sess_123',
})
// result: { id, status: 'completed'|'failed'|'in_progress', artifacts?, error? }
```

`A2AClientError` has a `status?: number` field for the HTTP status code.

## Evals

### defineEval / runEvals

Define and run evaluation suites against agents with mock LLMs.

```typescript
import {
  defineEval, runEvals, defineDataset, FileEvalRunStore,
  exactMatch, includes, llmAsJudge, toolCallSequence, jsonSchema,
} from '@fabrk/framework'
import type { EvalCase, EvalSuite, EvalCaseResult, EvalSuiteResult, EvalDataset, EvalRunStore } from '@fabrk/framework'

const suite = defineEval({
  name: 'chat-suite',
  agent: {
    systemPrompt: 'You are helpful.',
    tools: [searchTool],
    mock: mockLLM().setDefault('42'),
    maxIterations: 5,
  },
  cases: [
    { input: 'What is 6x7?', expected: '42' },
    { input: 'Search for cats', expected: undefined },
  ],
  scorers: [exactMatch(), includes('42')],
  threshold: 0.8,  // pass rate required for suite to pass
})

const dataset = defineDataset({
  name: 'large-dataset',
  cases: bigCaseArray,
})

const result = await runEvals(suite, {
  dataset,
  concurrency: 4,               // run up to 4 cases in parallel (default: 1, max: 20)
  store: new FileEvalRunStore('./eval-runs'),
  compareWith: previousRunRecord,
})
// result: { name, results, passRate, pass }
```

Built-in scorers:

| Scorer | Description |
|--------|-------------|
| `exactMatch()` | `output === expected` |
| `includes(str)` | `output.includes(str)` |
| `llmAsJudge(opts)` | Uses an LLM to score quality (requires provider config) |
| `toolCallSequence(names)` | Checks tool calls happened in order |
| `jsonSchema(schema)` | Validates output parses as valid JSON matching schema |

`FileEvalRunStore` persists runs to disk as JSON. Pass `compareWith` a previous `EvalRunRecord` to diff pass rates between runs.

## Stop Conditions

Control agent loop termination beyond `maxIterations`.

```typescript
import { stepCountIs, hasToolCall } from '@fabrk/framework'
import type { StopCondition, StopConditionContext } from '@fabrk/framework'

// Stop after exactly 3 tool-use rounds:
const stop = stepCountIs(3)

// Stop once a specific tool has been called:
const stop2 = hasToolCall('final-report')

// Use in runAgentLoop:
import { runAgentLoop } from '@fabrk/framework'
for await (const event of runAgentLoop({ ..., stopWhen: [stop, stop2] })) { }
```

Custom stop condition:
```typescript
const myStop: StopCondition = (ctx: StopConditionContext) => ctx.iteration >= 2
```

## Prompt Registry

Version and A/B test system prompts.

```typescript
import { definePromptVersion, resolvePrompt, abTestPrompt } from '@fabrk/framework'
import type { PromptVersion } from '@fabrk/framework'

const v1 = definePromptVersion({ id: 'system-v1', content: 'You are helpful.', weight: 0.5 })
const v2 = definePromptVersion({ id: 'system-v2', content: 'You are precise.',  weight: 0.5 })

const prompt = resolvePrompt([v1, v2], 'deterministic-key')    // stable selection
const abPrompt = abTestPrompt([v1, v2])                        // random weighted selection
```

## Client Hooks

### useObject\<T\>(options)

Streams a structured JSON object from an API endpoint. Works with `handleStreamObject` server-side.

```typescript
import { useObject } from '@fabrk/framework'

function MyComponent() {
  const { submit, stop, object, isLoading, error } = useObject<{ answer: string }>({
    api: '/api/generate',
    onFinish: (obj) => console.log('Done:', obj),
  })

  return (
    <button onClick={() => submit({ question: 'What is AI?' })}>
      {isLoading ? <button onClick={stop}>Stop</button> : 'Generate'}
    </button>
  )
}
```

`UseObjectOptions<T>`: `api` (endpoint URL), `onFinish?: (object: T) => void`

Returns: `{ submit, stop, object: Partial<T>|null, isLoading, error }`

### useViewTransition() / ViewTransitionLink

Wrap navigation in the browser View Transitions API with a React fallback.

```typescript
import { useViewTransition, ViewTransitionLink } from '@fabrk/framework'

// Hook:
const { startViewTransition, isPending } = useViewTransition()
<button onClick={() => startViewTransition(() => navigate('/about'))}>Go</button>

// Component (same-origin links only; modifier-key clicks pass through):
<ViewTransitionLink href="/about">About</ViewTransitionLink>
```

## handleStreamObject (server-side)

Pairs with `useObject` on the client. Runs `streamObject` and returns an SSE `Response`.

```typescript
import { handleStreamObject } from '@fabrk/framework'

// app/api/generate/route.ts
export async function POST(req: Request) {
  const { messages } = await req.json()
  return handleStreamObject(messages, myJsonSchema, { provider: 'openai' })
}
```

Signature: `handleStreamObject<T>(messages: LLMMessage[], schema: JsonSchema, config?: Partial<LLMConfig>): Promise<Response>`

## Runtime Features

### ISR (Incremental Static Regeneration)

```typescript
import {
  InMemoryISRCache, FilesystemISRCache, serveFromISR,
  isrRevalidateTag, isrRevalidatePath,
} from '@fabrk/framework'
import type { ISRCacheHandler } from '@fabrk/framework'

const cache: ISRCacheHandler = new FilesystemISRCache('./.isr-cache')
```

`FilesystemISRCache.keyToFile()` validates the resolved file path against the cache directory using `path.resolve().startsWith(this.dir)`. Cache keys that escape the directory (e.g. `../../etc/passwd`) throw immediately.

### OG Image Generation

```typescript
import { defineOGTemplate, handleOGRequest, isOGRequest } from '@fabrk/framework'
import type { OGTemplate, OGFont } from '@fabrk/framework'

const template = defineOGTemplate({ width: 1200, height: 630, render: (params) => /* html */ `...` })
```

### JSON-LD

```typescript
import { buildJsonLdScript, JsonLdScript } from '@fabrk/framework'
import type { JsonLdOrganization, JsonLdProduct, JsonLdArticle, JsonLdBreadcrumb } from '@fabrk/framework'

const script = buildJsonLdScript({ '@type': 'Organization', name: 'Acme' })
```

### Fetch Cache

```typescript
import { createCachedFetch, patchFetch, revalidateTag, revalidatePath } from '@fabrk/framework'
import type { FetchCacheOptions } from '@fabrk/framework'
```

### Server Actions

```typescript
import { createActionRegistry, validateCsrf, handleServerAction } from '@fabrk/framework'
import type { ServerActionRegistry } from '@fabrk/framework'
```

### i18n

```typescript
import { extractLocale, detectLocale, localePath, createI18nMiddleware } from '@fabrk/framework'
import type { I18nConfig } from '@fabrk/framework'
```

## OpenTelemetry

```typescript
import { initTracer, startSpan, setSpanAttributes, getActiveSpan } from '@fabrk/framework'
import type { SpanAttributes } from '@fabrk/framework'

// In fabrk.config.ts:
export default defineFabrkConfig({
  tracing: {
    enabled: true,
    exporter: 'otlp',              // 'console' | 'otlp'
    endpoint: 'http://localhost:4318/v1/traces',
    serviceName: 'my-app',
    headers: { 'x-honeycomb-team': process.env.HONEYCOMB_KEY! },
  },
})
```

`TracingConfig` fields: `enabled`, `exporter`, `endpoint`, `headers`, `serviceName`.

## Tool Result Types (Multimodal)

`ToolResult.content` is an array of `ToolOutputPart` — allows tools to return text, images, or files.

```typescript
import type { TextPart, ImagePart, FilePart, ToolOutputPart, ToolResult } from '@fabrk/framework'

// Text (most common):
const result: ToolResult = { content: [{ type: 'text', text: 'hello' }] }

// Image:
const imgResult: ToolResult = {
  content: [{ type: 'image', data: base64String, mediaType: 'image/png' }]
}

// File:
const fileResult: ToolResult = {
  content: [{ type: 'file', name: 'report.pdf', data: base64String, mediaType: 'application/pdf' }]
}
```

## Computer Use Tools

```typescript
import { defineBashTool, defineTextEditorTool, defineComputerTool } from '@fabrk/framework'
import type { BashToolOptions, TextEditorToolOptions, ComputerToolOptions } from '@fabrk/framework'

const bash = defineBashTool({ allowedCommands: ['ls', 'cat'] })
const editor = defineTextEditorTool({ workdir: '/tmp/sandbox' })
const computer = defineComputerTool({ screenshotFn: async () => base64Screenshot })
```

These match the Anthropic `computer_use_20250124` API tool format.

## Config Reference

```typescript
// fabrk.config.ts
import { defineFabrkConfig } from '@fabrk/framework/fabrk'

export default defineFabrkConfig({
  siteUrl: 'https://myapp.com',
  ai: { defaultModel: 'claude-sonnet-4-6', fallback: ['gpt-4o'], budget: { daily: 50 } },
  agents: { maxIterations: 15, defaultStream: true },
  mcp: { expose: true, consume: ['https://remote-mcp.example.com'] },
  auth: { provider: 'nextauth', apiKeys: true, mfa: true },
  security: { csrf: true, csp: true, rateLimit: { windowMs: 60_000, max: 100 } },
  deploy: { target: 'workers' },   // 'workers' | 'node' | 'vercel'
  tracing: { enabled: true, exporter: 'otlp' },
  reactCompiler: true,
  voice: { /* VoiceConfig */ },
  i18n: { /* I18nConfig */ },
})
```

## Voice

```typescript
import { handleTTSRequest, handleSTTRequest, handleRealtimeUpgrade } from '@fabrk/framework'
import type { RealtimeHandlerConfig } from '@fabrk/framework'

// API routes:
export const POST = handleTTSRequest   // text-to-speech
export const PUT  = handleSTTRequest   // speech-to-text
// WebSocket upgrade for realtime voice:
export const GET  = (req, socket, head) => handleRealtimeUpgrade(req, socket, head, config)
```

Voice routes are served at `/__ai/tts`, `/__ai/stt`, `/__ai/realtime` when `voice: true` (default) in the Vite plugin.

## Testing Framework

All exports available from `@fabrk/framework`:

```typescript
import {
  mockLLM, MockLLM, createTestAgent,
  calledTool, calledToolWith, respondedWith,
  costUnder, iterationsUnder, getToolCalls,
} from '@fabrk/framework'
```

### mockLLM()

Creates a new `MockLLM` builder instance. Use the fluent API to configure expected message patterns and responses.

```typescript
const mock = mockLLM()
  .onMessage('search').callTool('web-search', { query: 'cats' })
  .onMessage(/\d+ items/).respondWith('Counted items')
  .setDefault('Mock response')
```

#### MockLLM methods

| Method | Description |
|--------|-------------|
| `.onMessage(pattern)` | Match last user message by string substring or RegExp. Returns `{ respondWith, callTool }`. |
| `.onMessage(p).respondWith(text, opts?)` | Respond with text content when pattern matches. Returns `MockLLM` for chaining. |
| `.onMessage(p).callTool(name, input?)` | Emit a tool call when pattern matches. Returns `MockLLM` for chaining. |
| `.onToolCall(toolName).returnResult(result)` | Configure the string result returned when a specific tool is called. Returns `MockLLM` for chaining. |
| `.setDefault(text, opts?)` | Set the fallback response for unmatched messages. Returns `MockLLM` for chaining. |
| `.getCalls()` | Returns `ReadonlyArray<{ messages, tools? }>` — all LLM calls made. |
| `.callCount` | Number of times the mock LLM was invoked. |
| `.reset()` | Clear the call log. |
| `.asGenerateWithTools()` | Returns a `generateWithTools` function for injection into `createAgentHandler`. |
| `.asStreamWithTools()` | Returns a `streamWithTools` async generator for injection. |
| `MockLLM.zeroCost()` | Static. Returns a cost calculator that always returns `{ costUSD: 0 }`. |

### createTestAgent(options)

Creates a test agent that runs the full agent loop with a mock LLM. Collects all events and returns structured results.

```typescript
import { createTestAgent, mockLLM, defineTool, textResult } from '@fabrk/framework'

const searchTool = defineTool({
  name: 'search',
  description: 'Search for information',
  schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  handler: async (input) => textResult(`Results for: ${input.query}`),
})

const mock = mockLLM()
  .onMessage('search').callTool('search', { query: 'cats' })
  .setDefault('Found cats!')

const agent = createTestAgent({ mock, tools: [searchTool], systemPrompt: 'You are helpful.' })
const result = await agent.send('search for cats')
```

`TestAgentOptions`:
- `mock` (required) — `MockLLM` instance
- `name` — agent name (default: `"test-agent"`)
- `systemPrompt` — injected as first system message
- `tools` — array of `ToolDefinition` instances
- `stream` — use streaming path (default: `false`)
- `maxIterations` — max tool-calling rounds (default: `10`)

`TestAgentResult`:
```typescript
interface TestAgentResult {
  content: string                                               // final text response
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>  // all tool calls made
  usage: { promptTokens: number; completionTokens: number; cost: number }
  events: AgentEvent[]                                         // raw event stream
}
```

### Assertion Helpers

All helpers return `boolean` and do not throw — use them with your test framework's `expect`.

```typescript
import {
  calledTool, calledToolWith, respondedWith,
  costUnder, iterationsUnder, getToolCalls,
} from '@fabrk/framework'

expect(calledTool(result, 'search')).toBe(true)
expect(calledToolWith(result, 'search', { query: 'cats' })).toBe(true)
expect(respondedWith(result, 'cats')).toBe(true)
expect(respondedWith(result, /\d+ cats/)).toBe(true)
expect(costUnder(result, 0.01)).toBe(true)
expect(iterationsUnder(result, 3)).toBe(true)

const calls = getToolCalls(result, 'search')
// calls: Array<{ name: string; input: Record<string, unknown> }>
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `calledTool` | `(result, toolName) => boolean` | True if agent called the named tool at least once. |
| `calledToolWith` | `(result, toolName, expectedInput) => boolean` | True if agent called the tool with input matching all keys in `expectedInput`. Partial match — extra keys on the actual input are ignored. |
| `respondedWith` | `(result, text | RegExp) => boolean` | True if `result.content` contains the string or matches the regex. |
| `costUnder` | `(result, maxCost) => boolean` | True if `result.usage.cost <= maxCost`. |
| `iterationsUnder` | `(result, maxIterations) => boolean` | True if the number of `tool-call` events is `<= maxIterations`. |
| `getToolCalls` | `(result, toolName) => Array<{ name, input }>` | Extract all tool calls for a specific tool name. |

## CLI Commands

| Command | What It Does |
|---------|-------------|
| `fabrk dev` | Vite dev server + MCP tools + agent scanning |
| `fabrk build` | Production build + AGENTS.md generation |
| `fabrk start` | Start production server |
| `fabrk info` | Show agents, tools, prompts |
| `fabrk agents` | List all discovered agents with model, tools, memory, auth details |
| `fabrk check` | Validate Node.js version, config, app directory, agents, tools, tsconfig |
| `fabrk test` | Run vitest with passthrough args |

### fabrk agents

Lists all agents discovered under `agents/` with their full configuration details: name, route pattern, file path, model, tools, memory enabled, auth setting.

```
fabrk agents

  Found 2 agent(s):

  chat
    Route:  /api/agents/chat
    File:   agents/chat.ts
    Model:  claude-sonnet-4-6
    Tools:  search-docs, sql_query
    Auth:   required

  analyst
    Route:  /api/agents/analyst
    File:   agents/analyst.ts
    Model:  gpt-4.1
```

### fabrk check

Runs health checks and reports `[OK]`, `[INFO]`, or `[WARN]` for each item:
- Node.js version (22+ required)
- `package.json` present
- `fabrk.config.ts` / `fabrk.config.js` (informational if missing)
- `app/` directory
- Vite config
- Agent definitions (validates `model` field)
- Tool count
- `tsconfig.json`

Exits non-zero if issues are found.

### fabrk test

Runs vitest via `execFileSync`. All extra args pass through to vitest:

```bash
fabrk test                    # run all tests
fabrk test --watch            # watch mode
fabrk test agents/chat.test.ts  # run specific file
```

## Dashboard

The `/__ai` dev dashboard is localhost-only. It shows real-time stats, cost trends, tool usage, and errors. Refreshes every 2 seconds.

### Dashboard API

| Endpoint | Response |
|----------|----------|
| `GET /__ai` | HTML dashboard |
| `GET /__ai/api` | JSON with agents, tools, costs, trends, tool stats, error stats |
| `GET /__ai/api/export` | JSON download (same data as `/__ai/api` with `exportedAt` timestamp) |

### recordError(record)

Record an error for dashboard tracking. Call this from agent error handlers or tool error paths.

```typescript
import { recordError } from '@fabrk/framework/fabrk'

recordError({
  timestamp: Date.now(),
  agent: 'chat',
  error: 'LLM request timed out',
})
```

`ErrorRecord` shape:
- `timestamp: number` — Unix milliseconds
- `agent: string` — agent name
- `error: string` — error message (safe — not leaked to clients)

Dashboard aggregates errors by agent (`errorStats.byAgent`) and surfaces the 20 most recent in reverse-chronological order (`errorStats.recent`).

### Dashboard Observability Functions (from `@fabrk/framework/fabrk`)

| Export | Signature | Description |
|--------|-----------|-------------|
| `recordError` | `(record: ErrorRecord) => void` | Record an error for the dashboard error table. Capped at 100 entries (ring buffer). |
| `recordCall` | `(record: CallRecord) => void` | Record an LLM call. Capped at 100. Non-finite cost values are ignored. |
| `recordToolCall` | `(record: ToolCallRecord) => void` | Record a tool call with duration. Capped at 200. |
| `setAgents` | `(count: number) => void` | Update agent count shown in dashboard. |
| `setTools` | `(count: number) => void` | Update tool count shown in dashboard. |
| `setSkills` | `(count: number) => void` | Update skill count shown in dashboard. |
| `setThreadCount` | `(count: number) => void` | Update thread count shown in dashboard. |
| `setMaxDelegationDepth` | `(depth: number) => void` | Update max delegation depth shown. |
| `setMCPExposed` | `(exposed: boolean) => void` | Toggle MCP indicator in dashboard. |

Cost trends are aggregated hourly with per-agent breakdown. Tool stats include call count, average duration in ms, and the list of agents that called each tool.

## Client Utilities

### readSSELines (src/client/sse-reader.ts)

```typescript
import { readSSELines } from '@fabrk/framework/client/use-agent'

const reader = response.body!.getReader()
for await (const line of readSSELines(reader)) {
  // line is a raw SSE line, e.g. "data: {...}"
}
// reader.releaseLock() is called automatically in the finally block
```

`readSSELines(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string>` — yields raw SSE lines from a `ReadableStream`, handling buffering across chunk boundaries. Releases the reader lock in `finally` on both completion and error. Use this instead of a manual `while (true) { reader.read() }` loop. `useAgent` and `useObject` both use this internally.

## Client Hook

```typescript
import { useAgent } from '@fabrk/framework/client/use-agent'

function Chat() {
  const { messages, send, isStreaming, cost, error } = useAgent('chat')
}
```

## Middleware

```typescript
import { createAuthGuard, buildSecurityHeaders } from '@fabrk/framework/fabrk'

const guard = createAuthGuard('required')
const headers = buildSecurityHeaders()
```

### compileMatcher / runMiddleware

`compileMatcher(pattern)` in `src/runtime/middleware.ts` escapes literal dots before pattern compilation, so `/api/v1.2/foo` matches only a literal dot, not any character.

`runMiddleware` validates `redirectUrl` via `validateRedirectUrl()` before issuing a 307. Returns a 400 JSON response if the URL uses a blocked scheme (`javascript:`, `data:`, `vbscript:`).

### validateRedirectUrl

```typescript
import { validateRedirectUrl } from '@fabrk/framework'

validateRedirectUrl('/safe/path')          // ok
validateRedirectUrl('javascript:alert(1)') // throws
```

Exported from `src/runtime/server-helpers.ts`. Blocks `javascript:`, `data:`, and `vbscript:` schemes. Allows relative paths and protocol-relative URLs.

## Config

```typescript
import { defineFabrkConfig } from '@fabrk/framework/fabrk'

export default defineFabrkConfig({
  ai: { defaultModel: 'claude-sonnet-4-6' },
  security: { csrf: true, csp: true },
})
```

## Typed Navigation

### useParams\<T\>() / buildHref(pattern, params?)

Type-safe route parameter access and URL construction. Use with the codegen'd `RoutePattern` type from `virtual:fabrk/route-types`.

```typescript
import { useParams, buildHref } from '@fabrk/framework'
import type { TypedLinkProps } from '@fabrk/framework'
// Generated by `generateRouteTypes`:
import type { RoutePattern, ExtractParams } from 'virtual:fabrk/route-types'

// Read current route params (client-side only):
const params = useParams<'/blog/[slug]'>()
// params: { slug: string }

// Build a typed href:
const href = buildHref('/blog/[slug]', { slug: 'hello-world' })
// '/blog/hello-world'

// Optional/catch-all segments:
buildHref('/docs/[...path]', { path: ['api', 'agents'] })
// '/docs/api/agents'
```

`TypedLinkProps<T>`: `{ href: string; params?: Record<string, string | string[]>; children?; className?; prefetch? }`

### generateRouteTypes(routes)

Generates TypeScript source for the `virtual:fabrk/route-types` module from the scanned route list. Called automatically by the build pipeline; call it manually in custom build scripts.

```typescript
import { generateRouteTypes, scanRoutes } from '@fabrk/framework'

const routes = await scanRoutes('./app')
const typeSource = generateRouteTypes(routes)
// writes to src/types/route-types.d.ts or similar
```

Output includes `RoutePattern` (union of all page patterns), `ExtractParams<T>` (infers param shape from a pattern literal), and `RouteMap` (full pattern → params map).

## Runtime Exports

```typescript
import { scanRoutes, matchRoute, handleRequest } from '@fabrk/framework'
import { nodeToWebRequest, writeWebResponse } from '@fabrk/framework'
import { createFetchHandler } from '@fabrk/framework/worker'
import { loadFabrkConfig } from '@fabrk/framework'
```

`loadFabrkConfig(root: string): Promise<FabrkConfig>` — loads `fabrk.config.ts` (or `.js`) from the given root directory. Returns `{}` if no config file exists. Used internally by the Vite plugin; call it in custom server setups that need to read the config at runtime.

## AI Model Pricing

The following models have pricing entries in `@fabrk/ai` (per 1K tokens, USD):

### Anthropic Claude

| Model | Input | Output |
|-------|-------|--------|
| `claude-haiku-4-5-20251001` | $0.0008 | $0.004 |
| `claude-sonnet-4-6` | $0.003 | $0.015 |
| `claude-opus-4-6` | $0.015 | $0.075 |
| `claude-3-5-sonnet-20241022` | $0.003 | $0.015 |
| `claude-3-5-haiku-20241022` | $0.0008 | $0.004 |

### OpenAI GPT-4.1 Series

| Model | Input | Output |
|-------|-------|--------|
| `gpt-4.1` | $0.002 | $0.008 |
| `gpt-4.1-mini` | $0.0004 | $0.0016 |
| `gpt-4.1-nano` | $0.0001 | $0.0004 |
| `gpt-4o` | $0.0025 | $0.01 |
| `gpt-4o-mini` | $0.00015 | $0.0006 |

### OpenAI Reasoning Models

| Model | Input | Output |
|-------|-------|--------|
| `o3` | $0.01 | $0.04 |
| `o3-mini` | $0.0011 | $0.0044 |
| `o4-mini` | $0.0011 | $0.0044 |
| `o1` | $0.015 | $0.06 |
| `o1-mini` | $0.003 | $0.012 |

### Embedding Models

| Model | Input |
|-------|-------|
| `text-embedding-3-small` | $0.00002 |
| `text-embedding-3-large` | $0.00013 |

## MCP Client Security

`assertNotSsrf(url)` in `src/tools/mcp/client.ts` is called automatically before every MCP HTTP connect and every OAuth2 token fetch. It blocks:

- `169.254.169.254` — AWS/GCP/Azure/DigitalOcean instance metadata
- `metadata.google.internal` — GCP metadata hostname
- `100.100.100.200` — Alibaba Cloud metadata
- Full `169.254.0.0/16` range — all link-local addresses

Localhost and RFC-1918 addresses are intentionally allowed (MCP servers legitimately run locally). Throws `MCPClientError` with a descriptive message on block. Invalid URLs also throw `MCPClientError`.

## Security

- Path traversal protection on prompt loading
- `FilesystemISRCache` containment guard — `keyToFile()` validates `path.resolve().startsWith(dir)` and throws on traversal attempts
- `compileMatcher` escapes literal dots in URL patterns before compiling to RegExp
- `runMiddleware` validates `redirectUrl` via `validateRedirectUrl()` before issuing 307; returns 400 on unsafe schemes
- `assertNotSsrf()` in the MCP client blocks cloud metadata endpoints before any HTTP connect or OAuth2 token fetch
- Error internals never leaked to HTTP clients (all error paths return generic messages; details logged server-side)
- Request body size capped at 1 MB on MCP endpoint and agent routes
- Session cost map capped at 10,000 entries
- `/__ai` dashboard is localhost-only (checks `req.socket.remoteAddress` against `127.0.0.1`, `::1`, `::ffff:127.0.0.1`)
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy) on all response paths including auth guard errors, SSE streams, dashboard, and agent route errors

## Bug Fixes (Phase 1)

These were corrected and are verified by tests:

- `SemanticMemoryStore.search()` returns full message content (was returning empty string)
- `llm-caller` passes full conversation history (multi-turn) to the LLM
- `route-handler` tracks `promptTokens` and `completionTokens` separately in response
- Streaming path persists memory (user + assistant messages saved after stream completes)
- Delegation depth correctly propagated via `X-Fabrk-Delegation-Depth` header; starts at 1, increments for each sub-delegation
- `defineSupervisor` enforces `maxDelegations` (default: 5, capped at 10)
- Tool executor uses `Object.hasOwn()` instead of `in` to prevent prototype pollution
- `useAgent` error handling sanitized (error internals not exposed to client)
- OpenAI streaming tool call fallback fixed
- Vite plugin correctly wires memory store
- Skills `applySkill` and `composeSkills` preserve tool definitions in `skillToolDefinitions`

## Performance

- `InMemoryMemoryStore` (and related stores) use O(1) ring buffer eviction for capped collections, replacing O(n) `Array.shift()` operations
