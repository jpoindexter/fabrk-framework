'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

// ─── data ────────────────────────────────────────────────────────────────────

const runtimeEntries = [
  {
    name: 'fabrk(options)',
    kind: 'function',
    description: 'Create the Vite plugin that wires file-system routing, SSR, agent runtime, and dev dashboard. Pass to Vite\'s plugins array.',
    example: `// vite.config.ts
import { fabrk } from 'fabrk'
export default { plugins: [fabrk({ appDir: 'src/app', port: 3000 })] }`,
  },
  {
    name: 'FabrkRuntimeOptions',
    kind: 'interface',
    description: 'Options accepted by fabrk(). Key fields: appDir (default "src/app"), port (default 3000), agents (agent config map), mcp (MCP client configs), voice (TTS/STT/realtime config).',
    example: null,
  },
  {
    name: 'fabrkPlugin()',
    kind: 'function',
    description: 'Lower-level Vite plugin factory. Used internally by fabrk(). Prefer fabrk() unless you need to compose plugins manually.',
    example: null,
  },
  {
    name: 'handleAgentRequest(req, name, def)',
    kind: 'function',
    description: 'Handle a POST request for an agent route. Validates messages, resolves tools, runs the agent loop, and returns a streaming SSE Response with security headers.',
    example: `// app/api/assistant/route.ts
import { handleAgentRequest } from 'fabrk'
import { assistantAgent } from '@/agents/assistant'
export async function POST(req: Request) {
  return handleAgentRequest(req, 'assistant', assistantAgent)
}`,
  },
  {
    name: 'registerTool(tool)',
    kind: 'function',
    description: 'Register a ToolDefinition in the global tool registry so agent loops can resolve it by name. Call once at module load time.',
    example: `import { registerTool } from 'fabrk'
import { searchDocs } from '@/tools/search'
registerTool(searchDocs)`,
  },
]

const agentEntries = [
  {
    name: 'defineAgent(options): AgentDefinition',
    kind: 'function',
    description: 'Declare an agent. Returns an AgentDefinition record consumed by handleAgentRequest or createTestAgent.',
    example: `import { defineAgent } from 'fabrk'
export const agent = defineAgent({
  model: 'claude-sonnet-4-5-20250929',
  systemPrompt: 'You are a helpful assistant.',
  tools: ['search_docs'],
  stream: true,
  auth: 'optional',
  budget: { daily: 10, perSession: 0.50 },
  memory: true,
})`,
  },
  {
    name: 'AgentDefinition',
    kind: 'interface',
    description: 'model: string; fallback?: string[]; systemPrompt?: string; tools: string[]; budget?: AgentBudget; stream: boolean; auth: "required"|"optional"|"none"; memory?: boolean|AgentMemoryConfig; inputGuardrails?: Guardrail[]; outputGuardrails?: Guardrail[]; handoffs?: string[]; outputSchema?: Record<string,unknown>',
    example: null,
  },
  {
    name: 'AgentBudget',
    kind: 'interface',
    description: 'daily?: number; perSession?: number; alertThreshold?: number (0–1); perUser?: number; perTenant?: number — all values in USD.',
    example: null,
  },
  {
    name: 'defineTool(options): ToolDefinition',
    kind: 'function',
    description: 'Declare a tool. name, description, schema (JSON Schema object), handler(input) => Promise<ToolResult>, optional hooks and requiresApproval flag.',
    example: `import { defineTool, textResult } from 'fabrk'
export const myTool = defineTool({
  name: 'my_tool',
  description: 'Does something useful',
  schema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
  handler: async ({ q }) => textResult(\`Result for \${q}\`),
})`,
  },
  {
    name: 'textResult(text): ToolResult',
    kind: 'function',
    description: 'Convenience wrapper — returns { content: [{ type: "text", text }] }. Use for most tool handlers.',
    example: null,
  },
  {
    name: 'runAgentLoop(options): AsyncGenerator<AgentLoopEvent>',
    kind: 'function',
    description: 'Core ReAct loop. Yields AgentLoopEvents, handles tool execution, budget checks, guardrail runs, stop conditions, and handoffs. Hard cap: 25 iterations.',
    example: `for await (const event of runAgentLoop(opts)) {
  if (event.type === 'text-delta') process.stdout.write(event.content)
  if (event.type === 'done') break
}`,
  },
  {
    name: 'AgentLoopEvent',
    kind: 'type',
    description: 'Union: { type:"text-delta"; content:string } | { type:"text"; content:string } | { type:"tool-call"; name; input; iteration } | { type:"tool-result"; name; output; durationMs; iteration } | { type:"usage"; promptTokens; completionTokens; cost } | { type:"done"; structuredOutput? } | { type:"error"; message } | { type:"approval-required"; toolName; input; approvalId; iteration } | { type:"handoff"; targetAgent; input; iteration }',
    example: null,
  },
  {
    name: 'AgentLoopOptions',
    kind: 'interface',
    description: 'messages, toolExecutor, toolSchemas, agentName, sessionId, model, budget?, budgetContext?, maxIterations?, stream, generateWithTools, streamWithTools?, calculateCost, inputGuardrails?, outputGuardrails?, stopWhen?, handoffs?, outputSchema?',
    example: null,
  },
  {
    name: 'createToolExecutor(tools, hooks?): ToolExecutor',
    kind: 'function',
    description: 'Build a ToolExecutor from an array of ToolDefinitions. Validates required fields, enforces 30s timeout, truncates output at 50K chars, calls lifecycle hooks.',
    example: `const executor = createToolExecutor([searchTool, calcTool], {
  onBefore: (name, input) => console.log('[tool]', name, input),
  onError:  (name, input, err) => logger.error(err),
})`,
  },
  {
    name: 'ToolExecutorHooks',
    kind: 'interface',
    description: 'onBefore?(name, input) | onAfter?(name, input, output, durationMs) | onTimeout?(name, input, timeoutMs) | onError?(name, input, error) | onApprovalRequired?(name, input, approvalId) => Promise<{ approved; modifiedInput? }>',
    example: null,
  },
]

const memoryEntries = [
  {
    name: 'MemoryStore',
    kind: 'interface',
    description: 'createThread(agentName): Promise<Thread>; getThread(id): Promise<Thread|null>; appendMessage(threadId, msg): Promise<ThreadMessage>; getMessages(threadId, opts?): Promise<ThreadMessage[]>; deleteThread(id): Promise<void>; replaceMessages?(threadId, messages): Promise<void> — optional, used by memory compression.',
    example: null,
  },
  {
    name: 'InMemoryMemoryStore',
    kind: 'class',
    description: 'Default in-memory store. Caps at 1,000 threads (LRU eviction) and 500 messages per thread. Implements replaceMessages for compression support.',
    example: `import { InMemoryMemoryStore } from 'fabrk'
const store = new InMemoryMemoryStore()
const thread = await store.createThread('assistant')
await store.appendMessage(thread.id, { threadId: thread.id, role: 'user', content: 'Hello' })`,
  },
  {
    name: 'SemanticMemoryStore',
    kind: 'class',
    description: 'Wraps any MemoryStore and adds vector search. Embeds user/assistant messages asynchronously. search(query, opts?) returns semantically similar ThreadMessages.',
    example: `import { SemanticMemoryStore, InMemoryMemoryStore } from 'fabrk'
import { OpenAIEmbeddingProvider } from '@fabrk/ai'
const store = new SemanticMemoryStore(new InMemoryMemoryStore(), {
  embeddingProvider: new OpenAIEmbeddingProvider({ model: 'text-embedding-3-small' }),
  topK: 5,
  threshold: 0.7,
})
const hits = await store.search('user preference for dark mode', {
  agentName: 'assistant',
  messageRange: { before: 2, after: 2 },  // expand each match with context
})`,
  },
  {
    name: 'InMemoryLongTermStore',
    kind: 'class',
    description: 'Key-value long-term store for persistent agent facts. set/get/delete/list per namespace. search() does exact + substring matching. Inject via AgentMemoryConfig.longTerm.',
    example: `import { InMemoryLongTermStore } from 'fabrk'
const store = new InMemoryLongTermStore()
await store.set('user:123', 'theme', 'dark')
const val = await store.get('user:123', 'theme')  // 'dark'`,
  },
  {
    name: 'buildWorkingMemory(messages, config): string',
    kind: 'function',
    description: 'Render a working memory string from recent thread messages using the config template function. The result is injected as a system message prefix before each LLM call.',
    example: null,
  },
  {
    name: 'WorkingMemoryConfig',
    kind: 'interface',
    description: 'template: (messages: ThreadMessage[]) => string; readOnly?: boolean — if true, WM is computed once at session start and not updated mid-session.',
    example: `const wm: WorkingMemoryConfig = {
  template: (msgs) => {
    const facts = msgs.filter(m => m.metadata?.isFact)
    return facts.map(m => m.content).join('\\n')
  },
}`,
  },
  {
    name: 'AgentMemoryConfig',
    kind: 'interface',
    description: 'maxMessages?: number; semantic?: boolean | { topK?, threshold? }; compression?: { enabled?, triggerAt?, keepRecent?, summarize(messages) }; workingMemory?: WorkingMemoryConfig; longTerm?: { store, namespace?, autoInjectTool? }',
    example: null,
  },
]

const workflowEntries = [
  {
    name: 'WorkflowDefinition',
    kind: 'interface',
    description: 'name: string; steps: WorkflowStep[]; maxSteps?: number (hard cap 50) — the top-level workflow descriptor passed to runWorkflow.',
    example: null,
  },
  {
    name: 'WorkflowStep',
    kind: 'type',
    description: 'Union of AgentStep | ToolStep | ConditionStep | ParallelStep | SuspendableAgentStep | SuspendableToolStep. Each has an id: string and a type discriminant.',
    example: `const steps: WorkflowStep[] = [
  { type: 'agent', id: 'draft', run: async (ctx) => await draftContent(ctx.input) },
  { type: 'condition', id: 'check', condition: (ctx) => ctx.input.length > 100,
    then: [{ type: 'tool', id: 'shorten', run: shortenFn }],
    else: [] },
  { type: 'parallel', id: 'enrich', steps: [translateStep, tagsStep] },
]`,
  },
  {
    name: 'WorkflowResult',
    kind: 'type',
    description: '{ status:"completed"; output:string; stepResults:StepResult[]; durationMs:number } | { status:"suspended"; suspendedAtStepId:string; suspendData:unknown; completedSteps:StepResult[]; durationMs:number }',
    example: null,
  },
  {
    name: 'runWorkflow(def, input, metadata?, opts?): Promise<WorkflowResult>',
    kind: 'function',
    description: 'Execute a WorkflowDefinition sequentially (with parallelStep running branches concurrently). Handles suspension via SuspendError sentinel. opts.onProgress emits step lifecycle events.',
    example: `const result = await runWorkflow(myWorkflow, userInput, { userId })
if (result.status === 'suspended') {
  // persist result, wait for human approval, then:
  const final = await resumeWorkflow(myWorkflow, result, approvalPayload)
}`,
  },
  {
    name: 'resumeWorkflow(def, partialResult, resumeData, opts?): Promise<WorkflowResult>',
    kind: 'function',
    description: 'Continue a suspended workflow from the step that called suspend(). Skips already-completed steps and injects resumeData into WorkflowContext.metadata.',
    example: null,
  },
  {
    name: 'createWorkflowStream(): { stream, writer }',
    kind: 'function',
    description: 'Creates a ReadableStream + WritableStreamDefaultWriter pair. Pass writer to runWorkflow opts.writer; return stream in your HTTP response for real-time step output.',
    example: `const { stream, writer } = createWorkflowStream()
const promise = runWorkflow(def, input, {}, { writer })
return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })`,
  },
  {
    name: 'SuspendableStepContext',
    kind: 'interface',
    description: 'suspend(data: unknown): never — call inside a suspendable-agent or suspendable-tool step to pause execution and surface data to the caller. Execution resumes via resumeWorkflow.',
    example: null,
  },
]

const stateGraphEntries = [
  {
    name: 'defineStateGraph<S>(config): CompiledStateGraph<S>',
    kind: 'function',
    description: 'Build a compiled state graph from a StateGraphConfig. Returns an object with a run() async generator. Prefer createStateGraph() for the fluent builder API.',
    example: null,
  },
  {
    name: 'createStateGraph<S>(initialState, reducers?): StateGraphBuilder<S>',
    kind: 'function',
    description: 'Fluent builder. Chain addNode / addEdge / addConditionalEdges / addSubgraph / setInitial / setMaxCycles then call compile().',
    example: `const graph = createStateGraph({ count: 0 })
  .addNode('inc', async (input, state) => ({
    nextNode: state.count < 3 ? 'inc' : 'END',
    state: { count: state.count + 1 },
    output: state.count + 1,
  }))
  .setInitial('inc')
  .compile()

for await (const event of graph.run(null)) {
  if (event.type === 'done') console.log('final count:', event.output)
}`,
  },
  {
    name: 'StateGraphConfig<S>',
    kind: 'interface',
    description: 'nodes: GraphNode<S>[]; edges: GraphEdge[]; initial: string; initialState: S; maxCycles?: number (default 50); reducers?: StateReducers<S>; interruptBefore?: string[]; interruptAfter?: string[]',
    example: null,
  },
  {
    name: 'GraphNode<S>',
    kind: 'interface',
    description: 'name: string; run(input: unknown, state: S): Promise<NodeResult<S>> where NodeResult = { nextNode: string|"END"; state: S; output?: unknown }',
    example: null,
  },
  {
    name: 'GraphEdge',
    kind: 'interface',
    description: 'from: string; to: string | ((output: unknown, state: unknown) => string) — static or conditional (router function). One edge per source node; router return value is the next node name.',
    example: null,
  },
  {
    name: 'StateGraphEvent<S>',
    kind: 'type',
    description: 'type: "node-enter"|"node-exit"|"edge"|"done"|"error"|"interrupt"; node?; nextNode?; state; output?; error?; cycles; interruptType?: "before"|"after"|"node"; value?',
    example: null,
  },
  {
    name: 'interrupt(value): never',
    kind: 'function',
    description: 'Call inside any graph node to pause execution. The graph yields { type:"interrupt", value } and stops. Resume with graph.run(input, { resumeFrom: { node, command } }).',
    example: `import { interrupt } from 'fabrk'
// Inside a node:
interrupt({ question: 'Approve this action?', pendingTool: state.tool })
// Resuming:
graph.run(input, { resumeFrom: { node: 'review', command: { goto: 'execute', update: { approved: true } } } })`,
  },
]

const mcpEntries = [
  {
    name: 'createMCPServer(options): MCPServer',
    kind: 'function',
    description: 'Create a JSON-RPC 2.0 MCP server exposing ToolDefinitions, MCPResources, and MCPPromptDefs. Built-in rate limiting (60 req/min/IP), 1MB request cap, security headers on all responses.',
    example: `import { createMCPServer } from 'fabrk'
const server = createMCPServer({
  name: 'my-mcp',
  version: '1.0.0',
  tools: [searchTool, calcTool],
  rateLimit: 30,  // req/min
})
// In your HTTP handler:
return server.httpHandler(req)`,
  },
  {
    name: 'MCPServer',
    kind: 'interface',
    description: 'name: string; version: string; handleRequest(jsonRpc): Promise<unknown>; httpHandler(req: Request): Promise<Response>',
    example: null,
  },
  {
    name: 'connectMCPServer(options): Promise<MCPConnection>',
    kind: 'function',
    description: 'Connect to an external MCP server over HTTP or stdio. Initializes the protocol, discovers tools, and returns an MCPConnection with the tools as ToolDefinitions ready for an agent.',
    example: `import { connectMCPServer } from 'fabrk'
// HTTP transport with bearer auth:
const conn = await connectMCPServer({
  transport: 'http',
  url: 'https://mcp.example.com/rpc',
  auth: { type: 'bearer', token: process.env.MCP_TOKEN! },
  timeout: 30_000,
})
// stdio transport for local subprocess:
const local = await connectMCPServer({
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
})`,
  },
  {
    name: 'MCPClientOptions',
    kind: 'interface',
    description: 'url?: string; command?: string; args?: string[]; transport: "http"|"stdio"; timeout?: number; auth?: { type:"bearer"; token } | { type:"oauth2"; clientId; clientSecret?; tokenUrl; scopes? }; elicitation?: (prompt, schema) => Promise<unknown>',
    example: null,
  },
  {
    name: 'MCPConnection',
    kind: 'interface',
    description: 'tools: ToolDefinition[]; disconnect(): Promise<void>; listResources(): Promise<MCPResource[]>; readResource(uri): Promise<string>; listPrompts(): Promise<MCPPrompt[]>; getPrompt(name, args?): Promise<string>',
    example: null,
  },
]

const guardrailEntries = [
  {
    name: 'Guardrail',
    kind: 'type',
    description: '(content: string, ctx: GuardrailContext) => GuardrailResult — synchronous gate function. pass:false blocks; pass:true with replacement mutates content in place.',
    example: null,
  },
  {
    name: 'AsyncGuardrail',
    kind: 'type',
    description: '(content: string, ctx: GuardrailContext) => GuardrailResult | Promise<GuardrailResult> — async variant for external validation calls.',
    example: null,
  },
  {
    name: 'GuardrailResult',
    kind: 'interface',
    description: 'pass: boolean; reason?: string; replacement?: string — if replacement is set, content is mutated even when pass:true (used by piiRedactor).',
    example: null,
  },
  {
    name: 'GuardrailContext',
    kind: 'interface',
    description: 'agentName: string; sessionId: string; direction: "input"|"output"',
    example: null,
  },
  {
    name: 'maxLength(n): Guardrail',
    kind: 'function',
    description: 'Block content longer than n characters.',
    example: `maxLength(10_000)`,
  },
  {
    name: 'denyList(patterns: RegExp[]): Guardrail',
    kind: 'function',
    description: 'Block content matching any of the provided regular expressions.',
    example: `denyList([/\\bpassword\\b/i, /\\bsecret key\\b/i])`,
  },
  {
    name: 'piiRedactor(): Guardrail',
    kind: 'function',
    description: 'Redact emails, US phone numbers, and SSNs in place with [REDACTED]. Returns pass:true so the request is not blocked — the redacted content continues to the LLM.',
    example: null,
  },
  {
    name: 'requireJsonSchema(schema): Guardrail',
    kind: 'function',
    description: 'Fail if content is not valid JSON or does not match the required fields / property types in the schema.',
    example: `requireJsonSchema({ required: ['action', 'payload'], properties: { action: { type: 'string' } } })`,
  },
  {
    name: 'runGuardrails(guardrails, content, ctx)',
    kind: 'function',
    description: 'Run guardrails in series. Returns { content, blocked, reason? }. Used internally by the agent loop.',
    example: null,
  },
  {
    name: 'runGuardrailsParallel(guardrails, content, ctx)',
    kind: 'function',
    description: 'Run all guardrails concurrently via Promise.all. Returns first blocked result by array order, or pass if all pass.',
    example: null,
  },
]

const testingEntries = [
  {
    name: 'mockLLM(): MockLLM',
    kind: 'function',
    description: 'Create a MockLLM instance. Chain .onMessage(pattern).respondWith(text) or .callTool(name, input) to set pattern-matched responses.',
    example: `const mock = mockLLM()
  .onMessage(/weather/).callTool('get_weather', { city: 'SF' })
  .setDefault('I can help with that.')`,
  },
  {
    name: 'MockLLM',
    kind: 'class',
    description: 'onMessage(pattern) — set response for messages matching string or RegExp. onToolCall(name).returnResult(str) — set tool execution return value. setDefault(content) — fallback response. getCalls() — read call log. callCount — number of LLM invocations. reset() — clear call log.',
    example: null,
  },
  {
    name: 'createTestAgent(options)',
    kind: 'function',
    description: 'Wire a full agent loop (real runAgentLoop, real tool executor) around a MockLLM. Returns { send(message): Promise<TestAgentResult> }.',
    example: `const agent = createTestAgent({ tools: [myTool], mock, stream: false })
const result = await agent.send('search for docs on memory')
expect(result.toolCalls[0].name).toBe('search_docs')`,
  },
  {
    name: 'TestAgentOptions',
    kind: 'interface',
    description: 'name?: string; systemPrompt?: string; tools?: ToolDefinition[]; mock: MockLLM; stream?: boolean; maxIterations?: number',
    example: null,
  },
  {
    name: 'TestAgentResult',
    kind: 'interface',
    description: 'content: string; toolCalls: Array<{ name, input }>; usage: { promptTokens, completionTokens, cost }; events: AgentLoopEvent[]',
    example: null,
  },
  {
    name: 'defineEval(suite): EvalSuite',
    kind: 'function',
    description: 'Declare an eval suite with named cases, scorers, and a pass threshold. Identity function — used for type checking.',
    example: null,
  },
  {
    name: 'runEvals(suite, opts?): Promise<EvalSuiteResult>',
    kind: 'function',
    description: 'Run all cases against a test agent, score each output, return passRate. opts: dataset, store, compareWith (regression detection), concurrency (max 20).',
    example: `const result = await runEvals(mySuite, { store: fileStore, dataset: myDataset })
console.log(\`Pass rate: \${(result.passRate * 100).toFixed(0)}%\`)`,
  },
  {
    name: 'EvalSuite',
    kind: 'interface',
    description: 'name: string; agent: { systemPrompt?, tools?, mock, maxIterations? }; cases: EvalCase[]; scorers: Scorer[]; threshold?: number (default 1.0)',
    example: null,
  },
  {
    name: 'EvalCase',
    kind: 'interface',
    description: 'input: string; expected?: string',
    example: null,
  },
  {
    name: 'Scorer / ScorerResult',
    kind: 'type',
    description: 'Scorer = (ctx: { input, output, expected?, toolCalls }) => Promise<ScorerResult>. ScorerResult = { pass: boolean; score: number; reason?: string }. Built-in scorers: exactMatch, containsAll, toolCalled.',
    example: `import { exactMatch, containsAll, toolCalled } from 'fabrk'
scorers: [
  exactMatch(),
  containsAll(['San Francisco', '°F']),
  toolCalled('get_weather'),
]`,
  },
]

const routingEntries = [
  {
    name: 'Route',
    kind: 'interface',
    description: 'pattern: string; regex: RegExp; paramNames: string[]; filePath: string; layoutPaths: string[]; type: "page"|"api"; errorPath?; loadingPath?; notFoundPath?; catchAll?; optionalCatchAll?; slots?; islands?; ppr?; runtime?: "node"|"edge"',
    example: null,
  },
  {
    name: 'RouteMatch',
    kind: 'interface',
    description: 'route: Route; params: Record<string, string>',
    example: null,
  },
  {
    name: 'scanRoutes(appDir): Route[]',
    kind: 'function',
    description: 'Walk the app directory and produce a sorted Route[] from file-system conventions. Handles dynamic segments, catch-alls, parallel slots, intercepting routes, server islands.',
    example: `import { scanRoutes, matchRoute } from 'fabrk'
const routes = scanRoutes('./src/app')
const match = matchRoute(routes, '/dashboard/settings')
console.log(match?.params)  // {}`,
  },
  {
    name: 'matchRoute(routes, pathname, softNavigation?): RouteMatch|null',
    kind: 'function',
    description: 'Find the first route matching pathname. softNavigation=true prefers intercepting routes.',
    example: null,
  },
  {
    name: 'handleRequest(req, routes, modules): Promise<Response>',
    kind: 'function',
    description: 'Match incoming request against routes, load the handler module, run middleware, and return a Response. Entry point for the production server and Vite dev middleware.',
    example: null,
  },
  {
    name: 'buildPageTree(routes): PageTree',
    kind: 'function',
    description: 'Build a nested layout tree from a Route array for SSR page rendering with nested layouts, loading boundaries, and error boundaries.',
    example: null,
  },
  {
    name: 'export const ppr = true',
    kind: 'convention',
    description: 'Export from a route file to enable Partial Pre-Rendering. The static shell renders synchronously; dynamic holes are streamed via React 19 Suspense.',
    example: `// app/dashboard/page.tsx
export const ppr = true
export default function DashboardPage() { return <Suspense fallback={<Shell />}><DynamicData /></Suspense> }`,
  },
  {
    name: 'export const runtime = "edge"',
    kind: 'convention',
    description: 'Export from a route file to run it in the Edge runtime (fetch API only, no Node.js built-ins). In production, the route is compiled to a Request/Response fetch handler.',
    example: null,
  },
]

const clientEntries = [
  {
    name: 'useAgent(agentName)',
    kind: 'hook',
    description: 'Connect a React component to an agent SSE stream. Manages message history, streaming state, cost tracking, tool call state, and abort control.',
    example: `import { useAgent } from 'fabrk/client'
const { send, stop, messages, isStreaming, cost, usage, error, toolCalls } = useAgent('assistant')
// messages: AgentMessage[] (max 50 history entries sent per request)
// cost: cumulative USD this session
// toolCalls: AgentToolCall[] — name, input, output?, durationMs?, iteration`,
  },
  {
    name: 'AgentMessage',
    kind: 'interface',
    description: 'role: "user"|"assistant"; content: string | AgentContentPart[]',
    example: null,
  },
  {
    name: 'AgentContentPart',
    kind: 'type',
    description: '{ type:"text"; text:string } | { type:"image"; url?:string; base64?:string; mimeType?:string }',
    example: null,
  },
  {
    name: 'AgentToolCall',
    kind: 'interface',
    description: 'name: string; input: Record<string,unknown>; output?: string; durationMs?: number; iteration: number',
    example: null,
  },
  {
    name: 'InferChatMessages<T>',
    kind: 'type',
    description: 'Extract the messages array type from a useAgent return value. T extends { messages: AgentMessage[] }.',
    example: `type MyMessages = InferChatMessages<ReturnType<typeof useAgent>>
// = AgentMessage[]`,
  },
  {
    name: 'useObject<T>(options)',
    kind: 'hook',
    description: 'Stream a structured JSON object from an API endpoint. Progressively updates as JSON accumulates. Returns { submit, stop, object, isLoading, error }.',
    example: `import { useObject } from 'fabrk/client'
const { submit, object, isLoading } = useObject<{ name: string; tags: string[] }>({
  api: '/api/generate-profile',
  onFinish: (obj) => console.log('done', obj),
})`,
  },
  {
    name: 'UseObjectOptions<T>',
    kind: 'interface',
    description: 'api: string; onFinish?: (object: T) => void',
    example: null,
  },
  {
    name: 'useViewTransition()',
    kind: 'hook',
    description: 'Wrap state updates in document.startViewTransition() when available. Returns { startTransition } — a drop-in for React\'s useTransition that adds smooth page transitions.',
    example: null,
  },
]

// ─── sub-components ───────────────────────────────────────────────────────────

interface EntryRow {
  name: string
  kind: string
  description: string
  example: string | null
}

function EntryTable({ entries }: { entries: EntryRow[] }) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.name} className={cn('border border-border', mode.radius)}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
            <code className={cn('text-xs font-bold text-primary', mode.font)}>{entry.name}</code>
            <span className={cn('text-xs text-muted-foreground border border-border px-1', mode.radius)}>
              {entry.kind}
            </span>
          </div>
          <div className="px-3 py-2 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">{entry.description}</p>
            {entry.example && (
              <pre className={cn('text-xs bg-muted p-2 overflow-x-auto', mode.radius, mode.font)}>
                <code>{entry.example}</code>
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ApiReferencePage() {
  return (
    <DocLayout
      title="API REFERENCE"
      description="Type signatures, descriptions, and examples for the most important exports across all FABRK packages. Grouped by category — not exhaustive, but covers what you actually need to look up."
    >

      {/* ── FABRK RUNTIME ─────────────────────────────────────────────── */}
      <Section title="FABRK RUNTIME">
        <p className="text-sm text-muted-foreground mb-4">
          The <code>fabrk</code> package is the framework runtime — it owns Vite 7
          configuration, file-system routing, SSR, and the agent infrastructure.
          Import from <code>&apos;fabrk&apos;</code> for server-side code,{' '}
          <code>&apos;fabrk/client&apos;</code> for React hooks.
        </p>
        <EntryTable entries={runtimeEntries} />
      </Section>

      {/* ── AGENTS ────────────────────────────────────────────────────── */}
      <Section title="AGENTS">
        <p className="text-sm text-muted-foreground mb-4">
          The agent system implements a ReAct loop with tool use, budget enforcement,
          guardrails, memory, and streaming SSE output. <code>defineAgent</code> declares
          an agent; <code>handleAgentRequest</code> serves it; <code>runAgentLoop</code>{' '}
          is the core primitive if you need lower-level control.
        </p>
        <EntryTable entries={agentEntries} />
      </Section>

      {/* ── MEMORY ────────────────────────────────────────────────────── */}
      <Section title="MEMORY">
        <p className="text-sm text-muted-foreground mb-4">
          All stores implement the <code>MemoryStore</code> interface so they are
          interchangeable. Use <code>InMemoryMemoryStore</code> for dev and tests;
          swap in a Prisma-backed store in production without changing agent code.
        </p>
        <EntryTable entries={memoryEntries} />
      </Section>

      {/* ── WORKFLOWS ─────────────────────────────────────────────────── */}
      <Section title="WORKFLOWS">
        <p className="text-sm text-muted-foreground mb-4">
          Sequential multi-step pipelines with branching, parallelism, and suspension.
          Steps can pause mid-workflow (for human approval or async events) and resume
          exactly where they left off via <code>resumeWorkflow</code>.
        </p>
        <EntryTable entries={workflowEntries} />
        <CodeBlock title="full workflow example">{`import { runWorkflow } from 'fabrk'
import type { WorkflowDefinition } from 'fabrk'

const pipeline: WorkflowDefinition = {
  name: 'content-pipeline',
  steps: [
    { type: 'agent',    id: 'draft',    run: async (ctx) => await draftAgent(ctx.input) },
    { type: 'condition', id: 'review',
      condition: (ctx) => ctx.input.length > 500,
      then: [{ type: 'tool', id: 'summarize', run: summarizeFn }],
    },
    { type: 'parallel', id: 'enrich', steps: [
      { type: 'tool', id: 'translate', run: translateFn },
      { type: 'tool', id: 'tag',       run: tagFn },
    ]},
  ],
}

const result = await runWorkflow(pipeline, 'Write about climate change')
if (result.status === 'completed') {
  console.log(result.output)
}`}</CodeBlock>
      </Section>

      {/* ── STATEGRAPH ────────────────────────────────────────────────── */}
      <Section title="STATEGRAPH">
        <p className="text-sm text-muted-foreground mb-4">
          LangGraph-style stateful graph execution. Nodes are async functions that
          return <code>{`{ nextNode, state, output? }`}</code>. Edges are static or
          conditional (router function). Supports interrupt/resume, subgraphs, and
          state reducers.
        </p>
        <EntryTable entries={stateGraphEntries} />
      </Section>

      {/* ── MCP ───────────────────────────────────────────────────────── */}
      <Section title="MCP">
        <p className="text-sm text-muted-foreground mb-4">
          Model Context Protocol — JSON-RPC 2.0 tool server and client.{' '}
          <code>createMCPServer</code> exposes your tools to external LLM clients.{' '}
          <code>connectMCPServer</code> lets your agents consume tools from any MCP
          server over HTTP or stdio.
        </p>
        <EntryTable entries={mcpEntries} />
      </Section>

      {/* ── GUARDRAILS ────────────────────────────────────────────────── */}
      <Section title="GUARDRAILS">
        <p className="text-sm text-muted-foreground mb-4">
          Input and output validation gates that run before/after every LLM call.
          Compose built-in guardrails or write your own functions. The loop
          runs them in series; a <code>pass:false</code> result without a replacement
          halts the loop and emits an error event.
        </p>
        <EntryTable entries={guardrailEntries} />
        <CodeBlock title="custom guardrail example">{`import type { Guardrail } from 'fabrk'

const noSQLInjection: Guardrail = (content) => {
  const patterns = [/drop\\s+table/i, /union\\s+select/i, /--;?$/m]
  for (const p of patterns) {
    if (p.test(content)) return { pass: false, reason: 'SQL injection pattern detected' }
  }
  return { pass: true }
}`}</CodeBlock>
      </Section>

      {/* ── TESTING ───────────────────────────────────────────────────── */}
      <Section title="TESTING">
        <p className="text-sm text-muted-foreground mb-4">
          Test agents deterministically with <code>MockLLM</code> — no API keys,
          no network. <code>createTestAgent</code> runs a real agent loop so your
          tool handlers, guardrails, and stop conditions are exercised exactly as
          they would be in production. <code>runEvals</code> adds dataset-driven
          regression testing.
        </p>
        <EntryTable entries={testingEntries} />
      </Section>

      {/* ── ROUTING & SSR ─────────────────────────────────────────────── */}
      <Section title="ROUTING & SSR">
        <p className="text-sm text-muted-foreground mb-4">
          File-system routing built on top of Vite. The scanner reads your{' '}
          <code>app/</code> directory at startup and builds a Route array. The
          matcher resolves incoming URLs to route + params. Both are pure
          functions — testable without starting a server.
        </p>
        <EntryTable entries={routingEntries} />
        <InfoCard title="ROUTE FILE CONVENTIONS">
          <ul className="space-y-1 mt-1">
            <li><code>app/dashboard/page.tsx</code> — page component, renders in layout</li>
            <li><code>app/dashboard/layout.tsx</code> — wraps all child pages</li>
            <li><code>app/dashboard/loading.tsx</code> — Suspense fallback for this segment</li>
            <li><code>app/dashboard/error.tsx</code> — error boundary for this segment</li>
            <li><code>app/api/users/route.ts</code> — API route, exports GET/POST/PUT/DELETE</li>
            <li><code>app/blog/[slug]/page.tsx</code> — dynamic segment</li>
            <li><code>app/[...rest]/page.tsx</code> — catch-all segment</li>
            <li><code>app/@modal/page.tsx</code> — parallel route slot</li>
            <li><code>island.sidebar.tsx</code> — server island (independent Suspense boundary)</li>
          </ul>
        </InfoCard>
      </Section>

      {/* ── CLIENT HOOKS ──────────────────────────────────────────────── */}
      <Section title="CLIENT HOOKS">
        <p className="text-sm text-muted-foreground mb-4">
          React hooks for the client side. Import from <code>&apos;fabrk/client&apos;</code>.
          All hooks are marked <code>&apos;use client&apos;</code> internally.
        </p>
        <EntryTable entries={clientEntries} />
      </Section>

    </DocLayout>
  )
}
