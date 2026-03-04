import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function AgentsPage() {
  return (
    <DocLayout
      title="AGENTS"
      description="Full reference for the fabrk agent layer — defining agents, tools, memory, guardrails, workflows, orchestration, MCP, durable execution, and testing."
    >

      {/* SECTION INDEX */}
      <Section title="SECTION INDEX">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
          {[
            ['#define', 'Defining an Agent'],
            ['#tools', 'Tools'],
            ['#memory', 'Memory'],
            ['#guardrails', 'Guardrails'],
            ['#stop-conditions', 'Stop Conditions'],
            ['#streaming', 'Streaming'],
            ['#workflows', 'Workflows'],
            ['#stategraph', 'Cyclic Workflows'],
            ['#orchestration', 'Orchestration'],
            ['#mcp', 'MCP Integration'],
            ['#durable', 'Durable Agents'],
            ['#testing', 'Testing & Evals'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="block border border-border bg-card p-3 text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
      </Section>

      {/* 1. DEFINING AN AGENT */}
      <Section id="define" title="DEFINING AN AGENT">
        <p className="text-sm text-muted-foreground mb-4">
          An agent is a file at <code>src/agents/my-agent.ts</code> that exports a default{' '}
          <code>AgentDefinition</code>. The framework file-scans this directory at startup and
          mounts a POST endpoint at <code>/api/agents/my-agent</code>.
        </p>

        <CodeBlock title="src/agents/researcher.ts">{`import { defineAgent } from 'fabrk'

export default defineAgent({
  model: 'claude-opus-4-5',     // any provider string — see @fabrk/ai registry
  fallback: ['gpt-4o'],         // tried in order if primary fails
  systemPrompt: 'You are a research assistant...',
  tools: ['web_search', 'read_file'],  // tool names registered in src/tools/
  stream: true,                 // default true — SSE response
  auth: 'required',             // 'none' | 'optional' | 'required'
  budget: {
    daily: 5.00,                // USD
    perSession: 0.50,
    alertThreshold: 0.8,        // warn at 80% spend
    perUser: 1.00,              // per userId in BudgetContext
  },
  memory: {
    maxMessages: 100,
    semantic: { topK: 5, threshold: 0.7 },
    compression: {
      enabled: true,
      triggerAt: 80,            // compress when thread exceeds 80 messages
      keepRecent: 20,
      summarize: async (msgs) => callLLM('Summarize this conversation: ' + JSON.stringify(msgs)),
    },
    workingMemory: {
      template: (msgs) => \`User has sent \${msgs.length} messages so far.\`,
      readOnly: true,           // computed once at session start
    },
    longTerm: {
      store: ltStore,           // LongTermStore instance
      namespace: 'researcher',
      autoInjectTool: true,     // adds memory_store + memory_recall tools automatically
    },
  },
  inputGuardrails: [maxLength(8000), denyList([/\\/etc\\/passwd/i])],
  outputGuardrails: [piiRedactor()],
  handoffs: ['billing-agent'], // emit handoff event when this tool is called
  outputSchema: {              // structured JSON output mode
    type: 'object',
    properties: { answer: { type: 'string' }, sources: { type: 'array' } },
    required: ['answer'],
  },
})`}</CodeBlock>

        <InfoCard title="HARD CAPS">
          The agent loop enforces a hard cap of 25 iterations regardless of{' '}
          <code>maxIterations</code>. Tool output is truncated at 50K characters.
          Both limits prevent runaway cost from malformed tool responses.
        </InfoCard>

        <p className="text-sm text-muted-foreground mt-4">
          <strong className="text-foreground">auth modes:</strong> <code>none</code> — open endpoint.{' '}
          <code>optional</code> — JWT decoded if present, userId/tenantId populated.{' '}
          <code>required</code> — 401 if no valid JWT. The decoded claims are passed as{' '}
          <code>BudgetContext</code> so per-user and per-tenant budgets work automatically.
        </p>
      </Section>

      {/* 2. TOOLS */}
      <Section id="tools" title="TOOLS">
        <p className="text-sm text-muted-foreground mb-4">
          Tools are defined in <code>src/tools/</code> and registered by name. The LLM decides
          when to call them; the framework executes the handler, serialises the result, and feeds
          it back in the next iteration.
        </p>

        <CodeBlock title="src/tools/web-search.ts">{`import { defineTool, textResult } from 'fabrk'

export const webSearchTool = defineTool({
  name: 'web_search',
  description: 'Search the web for current information.',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      numResults: { type: 'number', description: 'Max results, default 5' },
    },
    required: ['query'],
  },
  handler: async ({ query, numResults }) => {
    const results = await searchAPI(query, numResults ?? 5)
    return textResult(JSON.stringify(results))
  },
  requiresApproval: false,      // set true to pause for human review (HITL)
})`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-2">
          <strong className="text-foreground">Multi-part results</strong> — tools can return text,
          images, or files in the same response. The LLM receives all parts.
        </p>

        <CodeBlock title="image + text result">{`import type { ToolResult } from 'fabrk'

async function screenshotHandler({ url }): Promise<ToolResult> {
  const png = await takeScreenshot(url)   // returns Buffer
  return {
    content: [
      { type: 'text', text: \`Screenshot of \${url}\` },
      {
        type: 'image',
        data: png.toString('base64'),
        mediaType: 'image/png',
      },
    ],
  }
}`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-2">
          <strong className="text-foreground">Isomorphic tool split</strong> — strip server-side
          handlers before sending tool schemas to the browser. Use this when you expose tool
          metadata to a client component for display.
        </p>

        <CodeBlock title="client-safe descriptor">{`import { clientTools } from 'fabrk'
import { webSearchTool } from '@/tools/web-search'

// clientTools() returns { name, description, schema } with handler omitted
const descriptors = clientTools([webSearchTool])
// safe to serialise and send to the browser`}</CodeBlock>

        <InfoCard title="BUILT-IN TOOLS">
          <code>sqlQueryTool</code> — read-only SQL execution against a database adapter.{' '}
          <code>ragToolFromPipeline</code> — wraps a RAG pipeline as a tool the LLM can call.
          Both are imported from <code>fabrk</code> and passed into <code>tools:</code> like any
          custom tool.
        </InfoCard>

        <p className="text-sm text-muted-foreground mt-4 mb-2">
          <strong className="text-foreground">Human-in-the-loop approval</strong> — set{' '}
          <code>requiresApproval: true</code> on any tool. The loop pauses, emits an{' '}
          <code>approval-required</code> SSE event with an <code>approvalId</code>, and waits.
          Resume by posting to <code>POST /__ai/agents/:name/approve</code>.
        </p>

        <CodeBlock title="tool hooks (per-tool or per-executor)">{`import { defineTool } from 'fabrk'

export const deleteTool = defineTool({
  name: 'delete_record',
  // ...
  hooks: {
    onBefore: async (name, input) => {
      console.log(\`[audit] about to call \${name}\`, input)
    },
    onAfter: async (name, output, durationMs) => {
      metrics.record({ tool: name, durationMs })
    },
    onTimeout: async (name) => {
      alertSlack(\`\${name} timed out after 30s\`)
    },
    onError: async (name, err) => {
      logger.error({ tool: name, err })
    },
  },
})`}</CodeBlock>
      </Section>

      {/* 3. MEMORY */}
      <Section id="memory" title="MEMORY">
        <p className="text-sm text-muted-foreground mb-4">
          Memory in fabrk has three distinct layers with different purposes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <InfoCard title="IN-MEMORY STORE">
            Per-thread conversation history. The default. Fast, zero setup, bounded at 500
            messages/thread and 1,000 threads with LRU eviction.
          </InfoCard>
          <InfoCard title="SEMANTIC STORE">
            Vector search across all threads. Use when the LLM needs to recall what a user
            said weeks ago, not just in this session. Requires an embedding provider.
          </InfoCard>
          <InfoCard title="LONG-TERM STORE">
            Key-value facts that persist across sessions. The LLM writes and reads via auto-injected
            <code>memory_store</code> and <code>memory_recall</code> tools.
          </InfoCard>
        </div>

        <CodeBlock title="InMemoryMemoryStore — default, no config needed">{`import { InMemoryMemoryStore } from 'fabrk'

// Pass to the agent route handler (or configure via defineAgent memory: true)
const store = new InMemoryMemoryStore()

// The store handles createThread / appendMessage / getMessages / deleteThread
// Caps: 1,000 threads, 500 messages/thread — oldest evicted automatically`}</CodeBlock>

        <CodeBlock title="SemanticMemoryStore — recall across threads">{`import { SemanticMemoryStore, InMemoryMemoryStore } from 'fabrk'
import { OpenAIEmbeddingProvider } from '@fabrk/ai'

const base = new InMemoryMemoryStore()
const embedder = new OpenAIEmbeddingProvider({ apiKey: process.env.OPENAI_API_KEY! })

const semanticStore = new SemanticMemoryStore(base, {
  embeddingProvider: embedder,
  topK: 5,         // return top-5 most similar messages
  threshold: 0.7,  // cosine similarity cutoff
})

// Semantic search with surrounding context
const relevant = await semanticStore.search('billing question', {
  agentName: 'support',
  messageRange: { before: 2, after: 2 },  // expand each match with 2 messages either side
})`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-2 mb-4">
          Embeddings are computed asynchronously and non-blocking. If embedding fails (network
          issue, rate limit), the message is still stored — search just won't surface it.
        </p>

        <CodeBlock title="InMemoryLongTermStore — cross-session facts">{`import { InMemoryLongTermStore } from 'fabrk'

// Swap for a database-backed implementation in production
const ltStore = new InMemoryLongTermStore()

// The LLM calls memory_store and memory_recall tools automatically when
// autoInjectTool: true is set in defineAgent's memory.longTerm config.
// Direct API:
await ltStore.set('researcher', 'user:123:preference', 'prefers bullet points')
await ltStore.get('researcher', 'user:123:preference')
await ltStore.search('researcher', 'preference', 5)`}</CodeBlock>

        <CodeBlock title="Working memory — structured context injection">{`// Working memory is a string prepended to every system message.
// Use it to inject dynamic facts computed from the thread.
defineAgent({
  memory: {
    workingMemory: {
      template: (messages) => {
        const userMessages = messages.filter(m => m.role === 'user')
        return [
          \`[SESSION] \${userMessages.length} turns so far.\`,
          \`[TOPICS] detect topics from messages...\`,
        ].join('\\n')
      },
      readOnly: false,  // false = recomputed every iteration
    },
  },
})`}</CodeBlock>

        <CodeBlock title="Memory compression — prevent context bloat">{`defineAgent({
  memory: {
    compression: {
      enabled: true,
      triggerAt: 80,    // fire when thread has 80+ messages
      keepRecent: 20,   // always keep the last 20 messages verbatim
      summarize: async (oldMessages) => {
        return callLLM('Compress this into a 3-sentence summary: ...')
      },
    },
  },
})`}</CodeBlock>
      </Section>

      {/* 4. GUARDRAILS */}
      <Section id="guardrails" title="GUARDRAILS">
        <p className="text-sm text-muted-foreground mb-4">
          Guardrails run on the last user message (input) or on the final LLM response (output).
          A guardrail returns <code>pass: true</code> to allow, or <code>pass: false</code> to
          block (which emits an <code>error</code> SSE event). Returning a <code>replacement</code>{' '}
          silently rewrites the content instead of blocking.
        </p>

        <CodeBlock title="built-in guardrails">{`import {
  maxLength,
  denyList,
  piiRedactor,
  requireJsonSchema,
} from 'fabrk'

defineAgent({
  inputGuardrails: [
    maxLength(8000),                       // block inputs > 8K chars
    denyList([/\\/etc\\/passwd/i, /DROP TABLE/i]),  // block regex matches
  ],
  outputGuardrails: [
    piiRedactor(),                         // replace email, phone, SSN with [REDACTED]
    requireJsonSchema({                    // enforce output shape
      type: 'object',
      required: ['answer'],
      properties: { answer: { type: 'string' } },
    }),
  ],
})`}</CodeBlock>

        <CodeBlock title="custom guardrail">{`import type { Guardrail } from 'fabrk'

const toxicityGuard: Guardrail = (content, ctx) => {
  if (ctx.direction === 'input' && hasToxicContent(content)) {
    return { pass: false, reason: 'Toxic content detected' }
  }
  return { pass: true }
}

// Rewrite instead of block
const redactPasswords: Guardrail = (content) => {
  const cleaned = content.replace(/password:\\s*\\S+/gi, 'password: [REDACTED]')
  if (cleaned !== content) {
    return { pass: true, replacement: cleaned }
  }
  return { pass: true }
}`}</CodeBlock>

        <CodeBlock title="async guardrails in parallel">{`import { runGuardrailsParallel, type AsyncGuardrail } from 'fabrk'

const moderationGuard: AsyncGuardrail = async (content) => {
  const result = await callModerationAPI(content)
  return result.flagged
    ? { pass: false, reason: result.reason }
    : { pass: true }
}

// Run all async guardrails concurrently — first blocked result wins
const { blocked, reason, content } = await runGuardrailsParallel(
  [moderationGuard, toxicityGuard],
  userInput,
  { agentName: 'chat', sessionId: 'abc', direction: 'input' }
)`}</CodeBlock>
      </Section>

      {/* 5. STOP CONDITIONS */}
      <Section id="stop-conditions" title="STOP CONDITIONS">
        <p className="text-sm text-muted-foreground mb-4">
          Stop conditions let you halt the agent loop early without waiting for the hard cap.
          They fire after each tool-using iteration.
        </p>

        <CodeBlock title="composing stop conditions">{`import { stepCountIs, hasToolCall } from 'fabrk'

// Stop after exactly 3 tool-using iterations
defineAgent({ stopWhen: stepCountIs(3) })

// Stop once a specific tool has been called
defineAgent({ stopWhen: hasToolCall('send_email') })

// Stop when either condition is met (OR)
defineAgent({ stopWhen: [stepCountIs(5), hasToolCall('done')] })

// Custom stop condition
const noMoreTools = ({ lastToolCallNames }) => lastToolCallNames.length === 0
defineAgent({ stopWhen: noMoreTools })`}</CodeBlock>

        <InfoCard title="WHEN TO USE STOP CONDITIONS">
          Stop conditions are useful when an agent has a finite task (e.g., gather 3 sources
          then stop) or when you want a safety valve that's tighter than the 25-iteration hard
          cap. For open-ended chat, leave <code>stopWhen</code> unset.
        </InfoCard>
      </Section>

      {/* 6. STREAMING */}
      <Section id="streaming" title="STREAMING">
        <p className="text-sm text-muted-foreground mb-4">
          When <code>stream: true</code> (the default), the agent endpoint returns a{' '}
          <code>text/event-stream</code> response. Each event is a JSON object on a{' '}
          <code>data:</code> line.
        </p>

        <CodeBlock title="SSE event types">{`// Text token streaming
{ type: "text-delta", content: "Hello" }

// Final assembled text (after all tool calls complete)
{ type: "text", content: "Here is the full answer..." }

// LLM requested a tool call
{ type: "tool-call", name: "web_search", input: { query: "..." }, iteration: 0 }

// Tool finished executing
{ type: "tool-result", name: "web_search", output: "...", durationMs: 420, iteration: 0 }

// Token usage + cost for this iteration
{ type: "usage", promptTokens: 1240, completionTokens: 88, cost: 0.0031 }

// Loop complete — structuredOutput present when outputSchema was set
{ type: "done", structuredOutput: { answer: "...", sources: [...] } }

// Structured JSON parsed from final text (when outputSchema is set)
{ type: "structured-output", data: { answer: "..." }, iteration: 2 }

// Agent hands off to a sub-agent
{ type: "handoff", targetAgent: "billing-agent", input: "...", iteration: 1 }

// Tool paused for human approval
{ type: "approval-required", toolName: "delete_record", input: {...}, approvalId: "uuid" }

// Guardrail blocked, budget exceeded, or loop error
{ type: "error", message: "Input guardrail blocked: ..." }`}</CodeBlock>

        <CodeBlock title="useAgent hook (React client)">{`'use client'
import { useAgent } from 'fabrk/client'

export function Chat() {
  const { messages, send, isStreaming, error } = useAgent('researcher')

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}</strong>: {m.content}
          {m.toolCalls?.map((tc) => (
            <div key={tc.name} className="text-xs text-muted-foreground">
              [TOOL] {tc.name} — {tc.durationMs}ms
            </div>
          ))}
        </div>
      ))}
      {isStreaming && <div>[THINKING...]</div>}
      <input
        onKeyDown={(e) => e.key === 'Enter' && send(e.currentTarget.value)}
        placeholder="Ask anything..."
      />
    </div>
  )
}`}</CodeBlock>
      </Section>

      {/* 7. WORKFLOWS */}
      <Section id="workflows" title="WORKFLOWS">
        <p className="text-sm text-muted-foreground mb-4">
          Workflows chain agent calls and tool executions into a linear or branching pipeline.
          Use them when the task has clearly defined steps with defined inputs and outputs —
          instead of letting a single agent loop figure out the sequence.
        </p>

        <CodeBlock title="defineWorkflow — linear pipeline">{`import { defineWorkflow, agentStep, toolStep, conditionStep, parallelStep } from 'fabrk'

const research = defineWorkflow('research-pipeline', [
  agentStep('gather', async (ctx) => {
    return await callAgent('web-searcher', ctx.input)
  }),
  toolStep('store', async (ctx) => {
    await saveToVectorDB(ctx.history.find(h => h.stepId === 'gather')!.output)
    return ctx.input
  }),
  conditionStep(
    'route',
    (ctx) => ctx.input.length > 500,  // is the content long enough?
    [agentStep('summarize', async (ctx) => callAgent('summarizer', ctx.input))],
    [agentStep('expand',   async (ctx) => callAgent('expander',  ctx.input))],
  ),
  parallelStep('enrich', [
    toolStep('translate-fr', async (ctx) => translate(ctx.input, 'fr')),
    toolStep('translate-es', async (ctx) => translate(ctx.input, 'es')),
  ]),
])

const result = await research.run('quantum computing')
if (result.status === 'completed') {
  console.log(result.output)     // final step output
  console.log(result.stepResults) // per-step results
}`}</CodeBlock>

        <InfoCard title="WORKFLOW LIMITS">
          Max 50 steps (hard cap, matches <code>MAX_STEPS_HARD_CAP</code>). Parallel steps
          run with <code>Promise.allSettled</code> — one failing branch doesn't abort the others;
          its output becomes <code>[error: ...]</code> in the joined string.
        </InfoCard>

        <CodeBlock title="streaming workflow progress">{`import { createWorkflowStream, runWorkflow } from 'fabrk'

// In an HTTP handler (Vite plugin route, Next.js route, etc.)
const { stream, writer } = createWorkflowStream()

// Run in background — don't await here
void runWorkflow(research.steps[0] ? research : { name: 'r', steps: [] }, input, {}, { writer })

return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' },
})`}</CodeBlock>

        <CodeBlock title="suspendableStep — human-in-the-loop">{`import { defineWorkflow, agentStep, suspendableStep, resumeWorkflow } from 'fabrk'

const approval = defineWorkflow('approval-pipeline', [
  agentStep('draft', async (ctx) => callAgent('writer', ctx.input)),

  suspendableStep('review', async (ctx, control) => {
    // Pause here — send draft to a human reviewer
    control.suspend({
      draft: ctx.input,
      reviewUrl: \`https://app.example.com/review/\${generateId()}\`,
    })
    // Code after suspend() never runs in this execution
  }),

  agentStep('finalize', async (ctx) => {
    // ctx.metadata.resumeData contains what was passed to resumeWorkflow
    return callAgent('publisher', ctx.input)
  }),
])

// First run — suspends at 'review'
const partial = await approval.run(userRequest)
// partial.status === 'suspended', partial.suspendData has the review URL

// After human approves — resume from where it left off
const final = await resumeWorkflow(approval, partial, { approved: true, notes: '...' })
// final.status === 'completed'`}</CodeBlock>
      </Section>

      {/* 8. CYCLIC WORKFLOWS (STATEGRAPH) */}
      <Section id="stategraph" title="CYCLIC WORKFLOWS (STATEGRAPH)">
        <p className="text-sm text-muted-foreground mb-4">
          <code>defineStateGraph</code> is for workflows that loop back on themselves — think
          a self-correcting code generator that retries on test failure, or a multi-step
          reasoning loop. Unlike linear workflows, graphs can cycle. The default cap is 50
          node executions.
        </p>

        <CodeBlock title="createStateGraph builder API">{`import { createStateGraph, interrupt } from 'fabrk'

type State = { code: string; attempts: number; passed: boolean }

const graph = createStateGraph<State>({
  code: '',
  attempts: 0,
  passed: false,
})
  .addNode('generate', async (input, state) => {
    const code = await callAgent('coder', String(input))
    return { nextNode: 'test', state: { ...state, code, attempts: state.attempts + 1 } }
  })
  .addNode('test', async (_input, state) => {
    const passed = await runTests(state.code)
    return {
      nextNode: passed ? 'END' : state.attempts >= 3 ? 'END' : 'generate',
      state: { ...state, passed },
      output: passed ? state.code : 'retry',
    }
  })
  .addConditionalEdges('test', (output) => output === 'retry' ? 'generate' : 'END')
  .setInitial('generate')
  .setMaxCycles(10)
  .compile()

for await (const event of graph.run('write a fibonacci function')) {
  if (event.type === 'node-exit') console.log(event.node, event.output)
  if (event.type === 'done')     console.log('Final code:', event.output)
  if (event.type === 'error')    console.error(event.error)
}`}</CodeBlock>

        <CodeBlock title="interrupt — pause a graph node for human input">{`import { interrupt } from 'fabrk'

.addNode('deploy', async (_input, state) => {
  // Pause execution and surface a value to the caller
  interrupt({ question: 'Deploy to production?', sha: state.code.slice(0, 8) })
  // This line never runs in the interrupted execution
})

// The graph.run() yields an interrupt event, then stops:
// { type: 'interrupt', node: 'deploy', interruptType: 'node', value: { question: '...' } }

// Resume by re-running with resumeFrom:
for await (const event of graph.run(input, {
  resumeFrom: { node: 'deploy', command: { goto: 'notify', update: { approved: true } } },
})) { /* ... */ }`}</CodeBlock>

        <InfoCard title="INTERRUPTBEFORE / INTERRUPTAFTER">
          Pass <code>interruptBefore: ['deploy']</code> to <code>compile()</code> to pause before
          a node runs (useful for approval gates). <code>interruptAfter</code> pauses after it
          exits, giving you the output before the graph continues.
        </InfoCard>
      </Section>

      {/* 9. ORCHESTRATION */}
      <Section id="orchestration" title="ORCHESTRATION">
        <p className="text-sm text-muted-foreground mb-4">
          Orchestration coordinates multiple agents. Three primitives cover most patterns.
        </p>

        <CodeBlock title="agentAsTool — delegate without HTTP round-trip">{`import { agentAsTool } from 'fabrk'

// Wrap any agent as a tool the parent agent can call.
// The handler invokes the child agent's route handler directly in-process
// (no network hop) and collects the streamed text response.
const billingTool = agentAsTool(
  { name: 'billing-agent', description: 'Handle billing enquiries' },
  handlerFactory,   // (name: string) => Promise<(req: Request) => Promise<Response>>
)

// Max delegation depth is 5 — enforced via X-Fabrk-Delegation-Depth header.
// The header is only trusted from localhost; external callers can't forge it.`}</CodeBlock>

        <CodeBlock title="defineSupervisor — router and planner patterns">{`import { defineSupervisor } from 'fabrk'

// Router: picks one sub-agent per request
const router = defineSupervisor({
  name: 'supervisor',
  model: 'claude-opus-4-5',
  strategy: 'router',       // 'router' | 'planner'
  agents: [
    { name: 'billing-agent',  description: 'Handles billing and payment questions' },
    { name: 'support-agent',  description: 'Handles product support and bugs' },
    { name: 'sales-agent',    description: 'Handles pricing and upgrade questions' },
  ],
  maxDelegations: 3,        // cap: 10
  handlerFactory,
})

// Planner: breaks request into steps, delegates each in order
const planner = defineSupervisor({
  name: 'planner',
  model: 'claude-opus-4-5',
  strategy: 'planner',
  agents: [
    { name: 'researcher', description: 'Searches and retrieves information' },
    { name: 'writer',     description: 'Writes and formats content' },
    { name: 'reviewer',   description: 'Reviews and critiques content' },
  ],
  handlerFactory,
})`}</CodeBlock>

        <CodeBlock title="defineAgentNetwork — dynamic multi-agent routing">{`import { defineAgentNetwork } from 'fabrk'

// A network is a graph of agents that can route to each other.
// Each agent sees the full network and can call any peer.
const network = defineAgentNetwork({
  agents: [routerAgent, billingAgent, supportAgent],
  entrypoint: 'router',
  handlerFactory,
})

await network.run('I was charged twice for my subscription')`}</CodeBlock>

        <InfoCard title="CIRCULAR DEPENDENCY DETECTION">
          At startup, fabrk calls <code>detectCircularDeps()</code> across all registered agents
          and logs warnings for any cycles. Delegation still works but cycles can burn your budget
          fast — add <code>budget.perSession</code> as a safety net.
        </InfoCard>
      </Section>

      {/* 10. MCP INTEGRATION */}
      <Section id="mcp" title="MCP INTEGRATION">
        <p className="text-sm text-muted-foreground mb-4">
          MCP (Model Context Protocol) lets agents expose their tools to any MCP-compatible client,
          and consume tools from external MCP servers. Both sides use JSON-RPC 2.0.
        </p>

        <CodeBlock title="createMCPServer — expose tools as an MCP server">{`import { createMCPServer } from 'fabrk'
import { webSearchTool, readFileTool } from '@/tools'

const mcpServer = createMCPServer({
  name: 'research-tools',
  version: '1.0.0',
  tools: [webSearchTool, readFileTool],
  rateLimit: 60,          // requests per window (default 60)
  rateLimitWindowMs: 60_000,
  resources: [            // optional: expose readable resources
    {
      uri: 'file:///docs/api.md',
      name: 'API Docs',
      mimeType: 'text/markdown',
      read: async () => readFile('/docs/api.md', 'utf8'),
    },
  ],
  prompts: [              // optional: expose reusable prompts
    {
      name: 'summarize',
      description: 'Summarize a document',
      arguments: [{ name: 'format', description: 'bullet | prose', required: false }],
      handler: ({ format }) => \`Summarize in \${format ?? 'prose'} format.\`,
    },
  ],
})

// Mount as an HTTP handler — add to your Vite plugin routes
export const POST = mcpServer.httpHandler`}</CodeBlock>

        <CodeBlock title="connectMCPServer — consume an external MCP server">{`import { connectMCPServer } from 'fabrk'

// HTTP transport with OAuth2 client credentials
const connection = await connectMCPServer({
  transport: 'http',
  url: 'https://mcp.partner.example.com/tools',
  auth: {
    type: 'oauth2',
    clientId: process.env.MCP_CLIENT_ID!,
    clientSecret: process.env.MCP_CLIENT_SECRET!,
    tokenUrl: 'https://auth.partner.example.com/token',
    scopes: ['tools:read', 'tools:call'],
  },
})

// Stdio transport for local tools (filesystem, git, etc.)
const localConnection = await connectMCPServer({
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/workspace'],
})

// The discovered tools work like any other tool
const { tools } = connection
defineAgent({ tools: tools.map(t => t.name) })

// OAuth2 tokens are cached and auto-refreshed 60 seconds before expiry`}</CodeBlock>
      </Section>

      {/* 11. DURABLE AGENTS */}
      <Section id="durable" title="DURABLE AGENTS">
        <p className="text-sm text-muted-foreground mb-4">
          Durable agents checkpoint their state after every tool result. If the process restarts
          or a request times out, execution can resume from the last checkpoint rather than
          starting over. Essential for long-running agents in serverless environments.
        </p>

        <CodeBlock title="handleStartAgent + handleResumeAgent">{`import {
  handleStartAgent,
  handleResumeAgent,
  handleAgentStatus,
} from 'fabrk'
import { InMemoryCheckpointStore } from 'fabrk'

const checkpointStore = new InMemoryCheckpointStore()
// Swap InMemoryCheckpointStore for a database-backed impl in production.

// Start a new durable execution
const { checkpointId, events } = await handleStartAgent(
  [{ role: 'user', content: 'Analyze all 500 repositories' }],
  {
    agentName: 'analyzer',
    sessionId: crypto.randomUUID(),
    model: 'claude-opus-4-5',
    toolExecutor,
    toolSchemas,
    checkpointStore,
    generateWithTools,
    calculateCost,
  },
)
// Store checkpointId — you need it to resume

// Resume after crash or timeout
const { events: resumed } = await handleResumeAgent(checkpointId, options)

// Check status — localhost only
const response = await handleAgentStatus('analyzer', checkpointId, checkpointStore)`}</CodeBlock>

        <CodeBlock title="checkpoint history and rollback">{`// The store keeps per-iteration snapshots (capped at 100/session)
const history = await checkpointStore.listHistory('analyzer', sessionId)
// Returns CheckpointState[] sorted by iteration ascending

// Roll back to an earlier iteration — useful for debugging or correcting a bad tool call
const restored = await checkpointStore.rollback('analyzer', sessionId, 3)
// Restores iteration 3 as the current state; resume from there`}</CodeBlock>

        <InfoCard title="CHECKPOINT LIMITS">
          <code>InMemoryCheckpointStore</code> caps at 1,000 checkpoints and 100 history
          entries per session with LRU eviction. Rollback and status endpoints are
          localhost-only — <code>403</code> if called from an external IP.
        </InfoCard>
      </Section>

      {/* 12. TESTING & EVALS */}
      <Section id="testing" title="TESTING & EVALS">
        <p className="text-sm text-muted-foreground mb-4">
          The testing module gives you a fluent mock LLM, a test agent harness, assertion helpers,
          and a structured eval framework. No API keys, no network calls in tests.
        </p>

        <CodeBlock title="MockLLM — define deterministic responses">{`import { mockLLM } from 'fabrk/testing'

const mock = mockLLM()
  .onMessage('search for').callTool('web_search', { query: 'fabrk' })
  .onMessage(/summarize/i).respondWith('Here is the summary...')
  .setDefault('I can help with that.')

// After message matching, tool response:
mock.onToolCall('web_search').returnResult(JSON.stringify([
  { title: 'FABRK docs', url: 'https://fabrk.dev' },
]))`}</CodeBlock>

        <CodeBlock title="createTestAgent — run agent loop without HTTP">{`import { createTestAgent, mockLLM } from 'fabrk/testing'
import { calledTool, calledToolWith, respondedWith } from 'fabrk/testing'
import { webSearchTool } from '@/tools/web-search'

const mock = mockLLM()
  .onMessage('latest news').callTool('web_search', { query: 'latest news' })

const agent = createTestAgent({
  systemPrompt: 'You are a news assistant.',
  tools: [webSearchTool],
  mock,
  maxIterations: 5,
})

const result = await agent.send('What is the latest news?')

// Assertion helpers
expect(calledTool(result, 'web_search')).toBe(true)
expect(calledToolWith(result, 'web_search', { query: 'latest news' })).toBe(true)
expect(respondedWith(result, /news/i)).toBe(true)

// Raw event inspection
const toolCallEvents = result.events.filter(e => e.type === 'tool-call')
expect(toolCallEvents).toHaveLength(1)`}</CodeBlock>

        <CodeBlock title="defineEval + runEvals — structured quality evaluation">{`import { defineEval, runEvals } from 'fabrk/testing'
import { includes, exactMatch, llmAsJudge, toolCallSequence } from 'fabrk/testing'
import { mockLLM } from 'fabrk/testing'

const suite = defineEval({
  name: 'news-agent-v1',
  agent: {
    systemPrompt: 'You are a news assistant.',
    tools: [webSearchTool],
    mock: mockLLM()
      .onMessage('news').callTool('web_search', { query: 'news' })
      .setDefault('No results found.'),
    maxIterations: 5,
  },
  cases: [
    { input: 'latest news',    expected: 'results' },
    { input: 'tech headlines', expected: 'tech' },
  ],
  scorers: [
    includes('results'),            // output contains substring
    toolCallSequence(['web_search']), // called exactly these tools in order
    llmAsJudge({                    // LLM grades output quality
      judge: async (sys, msg) => callLLM(sys, msg),
    }),
  ],
  threshold: 0.8,   // 80% of cases must pass
})

const result = await runEvals(suite, {
  concurrency: 4,   // run cases in parallel (max 20)
})
console.log(result.passRate, result.pass)`}</CodeBlock>

        <CodeBlock title="versioned datasets + regression detection">{`import { defineDataset, FileEvalRunStore } from 'fabrk/testing'

const dataset = defineDataset({
  name: 'news-cases',
  version: '2024-01',
  cases: [
    { input: 'latest news', expected: 'results found' },
  ],
})

const store = new FileEvalRunStore('./eval-runs')
const prevRun = await store.load('news-cases', '2024-01', -1)  // last run

const result = await runEvals(suite, {
  dataset,
  store,
  compareWith: prevRun ?? undefined,  // logs regressions: cases that passed before but fail now
})
// eval-runs/ now has a JSON record for this run
// Future runs compare against it and warn on regressions`}</CodeBlock>

        <InfoCard title="BUILT-IN SCORERS">
          <code>exactMatch()</code> — strict equality.{' '}
          <code>includes(substring)</code> — output contains string.{' '}
          <code>toolCallSequence(names)</code> — exact ordered sequence of tool calls.{' '}
          <code>jsonSchema(schema)</code> — output is valid JSON matching schema.{' '}
          <code>llmAsJudge(opts)</code> — LLM rates output on 0-1 scale, pass threshold 0.5.
        </InfoCard>
      </Section>

    </DocLayout>
  )
}
