import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export default function AgentsPage() {
  return (
    <DocLayout
      title="AGENTS"
      description="Everything you need to build agents that think, remember, and know when to stop."
    >

      {/* SECTION INDEX */}
      <Section title="SECTION INDEX">
        <div className={cn('grid grid-cols-2 md:grid-cols-3 gap-2 text-xs', mode.font)}>
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
              className={cn('block border border-border bg-card p-3 text-muted-foreground hover:text-foreground hover:border-primary transition-colors', mode.radius)}
            >
              {label}
            </a>
          ))}
        </div>
      </Section>

      {/* 1. DEFINING AN AGENT */}
      <Section id="define" title="DEFINING AN AGENT">
        <p className="text-sm text-muted-foreground mb-4">
          An agent is a TypeScript file with a brain. You define what it knows, what it can do, and how much it can spend.
          Drop it in <code>src/agents/my-agent.ts</code> and the framework wires up the HTTP endpoint automatically.
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
          The loop stops at 25 iterations no matter what <code>maxIterations</code> says. Tool output cuts off at 50K characters. Both limits guard against runaway cost from bad tool responses.
        </InfoCard>

        <p className="text-sm text-muted-foreground mt-4">
          <strong className="text-foreground">auth modes:</strong> <code>none</code> — open to anyone.{' '}
          <code>optional</code> — decodes the JWT when present and populates userId and tenantId.{' '}
          <code>required</code> — returns 401 without a valid JWT. Decoded claims flow into{' '}
          <code>BudgetContext</code>, so per-user and per-tenant budget caps work automatically.
        </p>
      </Section>

      {/* 2. TOOLS */}
      <Section id="tools" title="TOOLS">
        <p className="text-sm text-muted-foreground mb-4">
          A tool is like giving your agent hands — it can DO things, not just say things. You define a tool in <code>src/tools/</code> and register it by name.
          The LLM decides when to call it. Your handler runs, and the result comes back in the next iteration.
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
          <strong className="text-foreground">Multi-part results</strong> — a tool can return text, images, or files together. The LLM sees all parts.
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
          <strong className="text-foreground">Isomorphic tool split</strong> — your handler code must never reach the browser. <code>clientTools()</code> strips the server handler and returns only the name, description, and schema. Use this when a client component needs to display tool metadata.
        </p>

        <CodeBlock title="client-safe descriptor">{`import { clientTools } from 'fabrk'
import { webSearchTool } from '@/tools/web-search'

// clientTools() returns { name, description, schema } with handler omitted
const descriptors = clientTools([webSearchTool])
// safe to serialise and send to the browser`}</CodeBlock>

        <InfoCard title="BUILT-IN TOOLS">
          <code>sqlQueryTool</code> runs read-only SQL against a database adapter.{' '}
          <code>ragToolFromPipeline</code> wraps a RAG pipeline so the LLM can query it directly.
          Import both from <code>fabrk</code> and pass them into <code>tools:</code> like any custom tool.
        </InfoCard>

        <p className="text-sm text-muted-foreground mt-4 mb-2">
          <strong className="text-foreground">Human-in-the-loop approval</strong> — some tool calls are too risky to run automatically. Set <code>requiresApproval: true</code> and the loop pauses.
          It emits an <code>approval-required</code> SSE event with an <code>approvalId</code>. You approve or reject by posting to <code>POST /__ai/agents/:name/approve</code>.
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
          Agents forget everything between requests by default. Memory fixes that. There are three layers — pick the one that matches how long you need data to live.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <InfoCard title="IN-MEMORY STORE">
            Keeps conversation history for the current thread. Zero setup, zero config. Capped at 500 messages per thread and 1,000 threads with LRU eviction.
          </InfoCard>
          <InfoCard title="SEMANTIC STORE">
            Searches across all threads by meaning, not just the current session. Use this when a user expects the agent to remember something from weeks ago. Requires an embedding provider.
          </InfoCard>
          <InfoCard title="LONG-TERM STORE">
            Persists key-value facts across sessions. The LLM reads and writes via auto-injected <code>memory_store</code> and <code>memory_recall</code> tools.
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
          Embeddings compute in the background and never block writes. If embedding fails — network error, rate limit — the message still saves. It just won't appear in search results.
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
          Guardrails are filters you put between the world and your agent. Input guardrails screen the user message before it reaches the LLM. Output guardrails screen the LLM response before it reaches the user.
          Return <code>pass: false</code> to block and emit an <code>error</code> event. Return a <code>replacement</code> to silently rewrite the content instead.
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
          Sometimes an agent's job is done before it hits the hard cap. Stop conditions let you declare that moment. They evaluate after each tool-using iteration.
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
          Use them for finite tasks — "gather 3 sources then stop", "stop once the email is sent". They also work as a tighter safety valve than the 25-iteration hard cap. Leave <code>stopWhen</code> unset for open-ended chat.
        </InfoCard>
      </Section>

      {/* 6. STREAMING */}
      <Section id="streaming" title="STREAMING">
        <p className="text-sm text-muted-foreground mb-4">
          Streaming lets your UI respond the moment the agent starts thinking, not after it finishes. With <code>stream: true</code> (the default), the endpoint returns a <code>text/event-stream</code> response. Each event is a JSON object on a <code>data:</code> line.
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
          A workflow is for tasks where you already know the steps. Instead of letting one agent loop figure out the sequence, you declare it. Each step gets the previous step's output as its input.
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
          Max 50 steps, hard cap. Parallel steps run with <code>Promise.allSettled</code> — a failing branch doesn't kill the others. Its output becomes <code>[error: ...]</code> in the joined result.
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
          Some tasks need to loop — a code generator that retries on test failure, a reasoner that checks its own work. <code>defineStateGraph</code> handles that. Unlike a linear workflow, a graph can cycle back to any earlier node. The default cap is 50 node executions.
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
          Pass <code>interruptBefore: ['deploy']</code> to <code>compile()</code> to pause before a node runs — useful for approval gates. <code>interruptAfter</code> pauses after the node exits, so you can inspect its output before the graph moves on.
        </InfoCard>
      </Section>

      {/* 9. ORCHESTRATION */}
      <Section id="orchestration" title="ORCHESTRATION">
        <p className="text-sm text-muted-foreground mb-4">
          One agent can only do so much. Orchestration lets agents delegate to other agents. Three primitives cover almost every pattern.
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
          At startup, fabrk calls <code>detectCircularDeps()</code> and logs warnings for any cycles. Delegation still works, but cycles burn budget fast. Set <code>budget.perSession</code> as a safety net.
        </InfoCard>
      </Section>

      {/* 10. MCP INTEGRATION */}
      <Section id="mcp" title="MCP INTEGRATION">
        <p className="text-sm text-muted-foreground mb-4">
          MCP (Model Context Protocol) is a standard way for agents to share tools. Your agent can publish its tools to any MCP-compatible client, and consume tools from external MCP servers. Both sides speak JSON-RPC 2.0.
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
          Long-running agents die when the server does. Durable agents save their state after every tool result. When the process restarts or a request times out, you resume from the last checkpoint instead of starting over.
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
          <code>InMemoryCheckpointStore</code> caps at 1,000 checkpoints and 100 history entries per session, with LRU eviction. Rollback and status endpoints only respond to localhost — external IPs get a <code>403</code>.
        </InfoCard>
      </Section>

      {/* 12. TESTING & EVALS */}
      <Section id="testing" title="TESTING & EVALS">
        <p className="text-sm text-muted-foreground mb-4">
          Agent tests that call real LLMs are slow, flaky, and expensive. The testing module gives you a mock LLM, a test harness, assertion helpers, and an eval framework. No API keys, no network calls.
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
          <code>includes(str)</code> — output contains a substring.{' '}
          <code>toolCallSequence(names)</code> — exact ordered tool call sequence.{' '}
          <code>jsonSchema(schema)</code> — output is valid JSON matching the schema.{' '}
          <code>llmAsJudge(opts)</code> — an LLM rates output on a 0–1 scale, passing at 0.5.
        </InfoCard>
      </Section>

    </DocLayout>
  )
}
