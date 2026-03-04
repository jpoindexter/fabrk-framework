'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function AgentsTutorialPage() {
  return (
    <DocLayout
      title="BUILD YOUR FIRST AI AGENT"
      description="Build a document Q&amp;A agent from scratch. You'll add a search tool, conversation memory, safety guardrails, a chat UI, and a test — all in about 15 minutes."
    >
      <InfoCard title="WHAT YOU WILL BUILD">
        By the end, you'll have a chat page where you can ask questions and watch the agent
        search your docs in real time. Type a question, see "[RUNNING] search_docs" flash
        on screen, then get an answer with a cited source URL. Ask a follow-up — the agent
        remembers what you said. Try something sketchy — the guardrail blocks it.
        And a test file proves it all works without spending a cent on API calls.
        15 minutes.
      </InfoCard>

      {/* STEP 1 — SETUP */}
      <Section id="setup" title="STEP 1 — SETUP">
        <p className="text-sm text-muted-foreground mb-4">
          Create a new project. The <code className="text-primary">ai-saas</code> template
          includes everything you need — the agent plugin is already on.
        </p>
        <CodeBlock title="terminal">{`npx create-fabrk-app my-agent --template ai-saas
cd my-agent
pnpm install`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-4">
          Check that agents are enabled in your Vite config. Without this, the agent
          endpoints don't exist:
        </p>
        <CodeBlock title="vite.config.ts">{`import { defineConfig } from 'vite'
import fabrk from 'fabrk'

export default defineConfig({
  plugins: [
    fabrk({
      agents: true,    // scans agents/ for agent definitions
      dashboard: true, // exposes /__ai dev dashboard
    }),
  ],
})`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-2">
          Here's the layout you're building toward:
        </p>
        <CodeBlock title="project structure">{`my-agent/
├── agents/
│   └── qa/
│       └── agent.ts       ← agent definition (Step 3)
├── tools/
│   └── search-docs.ts     ← tool definition (Step 2)
├── src/
│   └── app/
│       └── page.tsx       ← chat UI (Step 7)
└── vite.config.ts`}</CodeBlock>

        <InfoCard title="HOW AGENT ROUTING WORKS">
          When the dev server starts, fabrk reads the{' '}
          <code className="text-primary">agents/</code> folder. Every subfolder with an{' '}
          <code className="text-primary">agent.ts</code> becomes a live endpoint at{' '}
          <code className="text-primary">/api/agents/[name]</code>. The file you're
          creating in Step 3 — <code className="text-primary">agents/qa/agent.ts</code> —
          becomes <code className="text-primary">POST /api/agents/qa</code> automatically.
        </InfoCard>
      </Section>

      {/* STEP 2 — DEFINE A TOOL */}
      <Section id="tool" title="STEP 2 — DEFINE A TOOL">
        <p className="text-sm text-muted-foreground mb-4">
          You're building the search tool your agent will call when it needs information.
          Give <code className="text-primary">defineTool</code> a name, a description the
          LLM uses to decide when to call it, a JSON schema for the input, and a handler
          that runs when it does. The handler returns a result using{' '}
          <code className="text-primary">textResult</code>.
        </p>
        <CodeBlock title="tools/search-docs.ts">{`import { defineTool, textResult } from 'fabrk'

// Simulated knowledge base — replace with your real data source
const knowledgeBase = [
  {
    id: 'kb-1',
    title: 'Getting Started',
    content: 'Install FABRK with: npx create-fabrk-app my-app --template ai-saas',
    source: '/getting-started',
  },
  {
    id: 'kb-2',
    title: 'Agent Routing',
    content: 'Agents live in agents/<name>/agent.ts and are served at /api/agents/<name>',
    source: '/agents#routing',
  },
  {
    id: 'kb-3',
    title: 'Memory',
    content: 'Enable memory on defineAgent with memory: true to persist conversation history',
    source: '/agents#memory',
  },
]

export default defineTool({
  name: 'search_docs',
  description: 'Search the documentation knowledge base for relevant articles. Use this whenever the user asks a question.',
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query — use keywords from the user question',
      },
    },
    required: ['query'],
  },
  async handler(input) {
    const query = (input.query as string).toLowerCase()

    const results = knowledgeBase
      .filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.content.toLowerCase().includes(query)
      )
      .slice(0, 3)

    if (results.length === 0) {
      return textResult('No relevant documentation found for that query.')
    }

    const formatted = results
      .map((r) => \`[SOURCE: \${r.source}]\\n\${r.title}\\n\${r.content}\`)
      .join('\\n\\n')

    return textResult(formatted)
  },
})`}</CodeBlock>

        <InfoCard title="TOOL DISCOVERY">
          fabrk scans the <code className="text-primary">tools/</code> folder for you. The
          filename — without the extension — is the name you use in{' '}
          <code className="text-primary">defineAgent</code>. No imports needed. Drop a file
          in <code className="text-primary">tools/</code>, reference it by name, done.
        </InfoCard>
      </Section>

      {/* STEP 3 — DEFINE THE AGENT */}
      <Section id="agent" title="STEP 3 — DEFINE THE AGENT">
        <p className="text-sm text-muted-foreground mb-4">
          Now you're defining the agent itself — choosing a model, writing the system
          prompt, pointing at your tool, and setting a spend limit. The{' '}
          <code className="text-primary">tools</code> array uses the same filename you
          created in Step 2. No import paths needed.
        </p>
        <CodeBlock title="agents/qa/agent.ts">{`import { defineAgent } from 'fabrk'

export default defineAgent({
  model: 'claude-sonnet-4-5-20250514',
  systemPrompt: \`You are a helpful documentation assistant.
When answering questions, always call search_docs first to find relevant content.
Cite the source URL at the end of your answer like this: [SOURCE: /path].
Be concise — 2-3 sentences maximum per answer.\`,
  tools: ['search_docs'],
  stream: true,
  auth: 'none',
  budget: {
    daily: 5.00,       // $5/day maximum spend
    alertThreshold: 0.8, // warn at 80%
  },
})`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4">
          Your agent is working right now. Start the dev server and try it:
        </p>
        <CodeBlock title="terminal">{`pnpm dev
# Agent is now live at POST /api/agents/qa
# Dev dashboard at http://localhost:5173/__ai`}</CodeBlock>

        <CodeBlock title="test with curl">{`curl -X POST http://localhost:5173/api/agents/qa \\
  -H 'Content-Type: application/json' \\
  -d '{"messages":[{"role":"user","content":"How do I install FABRK?"}]}'`}</CodeBlock>
      </Section>

      {/* STEP 4 — WIRE THE ROUTE */}
      <Section id="route" title="STEP 4 — WIRE THE ROUTE">
        <p className="text-sm text-muted-foreground mb-4">
          You don't write a route handler — fabrk generates it from your agent definition.
          This step shows you exactly what the endpoint expects and what it sends back.
          That context is helpful when something isn't behaving the way you expect.
        </p>

        <p className="text-sm text-muted-foreground mb-2">
          Your agent endpoint accepts a JSON body like this:
        </p>
        <CodeBlock title="request contract">{`POST /api/agents/qa
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "How do I install FABRK?" }
  ]
}`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-2">
          With <code className="text-primary">stream: true</code> (the default), the response
          streams back to the browser as a series of JSON events — one per line:
        </p>
        <CodeBlock title="SSE response stream">{`data: {"type":"text-delta","content":"Based on "}
data: {"type":"text-delta","content":"the docs..."}
data: {"type":"tool-call","name":"search_docs","input":{"query":"install"},"iteration":1}
data: {"type":"tool-result","name":"search_docs","output":"Install FABRK with...","durationMs":12}
data: {"type":"text-delta","content":"Install FABRK with: npx create-fabrk-app"}
data: {"type":"usage","promptTokens":312,"completionTokens":48,"cost":0.00021}
data: {"type":"done"}`}</CodeBlock>

        <InfoCard title="NON-STREAMING MODE">
          Set <code className="text-primary">stream: false</code> on the agent definition to
          get a plain JSON response instead. Good for server-to-server calls or background
          jobs where you want the full answer at once before doing anything with it.
        </InfoCard>
      </Section>

      {/* STEP 5 — ADD MEMORY */}
      <Section id="memory" title="STEP 5 — ADD MEMORY">
        <p className="text-sm text-muted-foreground mb-4">
          Right now, every message you send starts fresh. The agent forgets everything the
          moment the response finishes. This step fixes that — so users can ask "what about
          routing?" after asking about installation, without repeating themselves.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          You're adding two things: <code className="text-primary">memory: true</code> on
          the agent, and one line in your app entry point that sets up the store.
        </p>
        <CodeBlock title="agents/qa/agent.ts (updated)">{`import { defineAgent } from 'fabrk'

export default defineAgent({
  model: 'claude-sonnet-4-5-20250514',
  systemPrompt: \`You are a helpful documentation assistant.
When answering questions, always call search_docs first to find relevant content.
Cite the source URL at the end of your answer like this: [SOURCE: /path].
Be concise — 2-3 sentences maximum per answer.\`,
  tools: ['search_docs'],
  stream: true,
  auth: 'none',
  memory: true,   // ← enable conversation memory
  budget: {
    daily: 5.00,
    alertThreshold: 0.8,
  },
})`}</CodeBlock>

        <CodeBlock title="src/main.ts (app entry point)">{`import { setMemoryStore, InMemoryMemoryStore } from 'fabrk'

// Wire the store once at startup — all agents share it
setMemoryStore(new InMemoryMemoryStore())`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4">
          With memory on, fabrk creates a thread for each session and loads the history
          into every new request automatically. Your client passes back a{' '}
          <code className="text-primary">threadId</code> to pick up where it left off:
        </p>
        <CodeBlock title="request with threadId">{`POST /api/agents/qa
{
  "messages": [{ "role": "user", "content": "What about routing?" }],
  "threadId": "thread_abc123"
}`}</CodeBlock>

        <InfoCard title="PRODUCTION MEMORY">
          <code className="text-primary">InMemoryMemoryStore</code> clears when the server
          restarts — that's fine for development. When you deploy, swap it for a database-
          backed store. The <code className="text-primary">MemoryStore</code> interface
          needs four methods: <code className="text-primary">createThread</code>,{' '}
          <code className="text-primary">getThread</code>,{' '}
          <code className="text-primary">appendMessage</code>, and{' '}
          <code className="text-primary">getMessages</code>. Implement those four and pass
          your instance to <code className="text-primary">setMemoryStore</code>.
        </InfoCard>
      </Section>

      {/* STEP 6 — ADD GUARDRAILS */}
      <Section id="guardrails" title="STEP 6 — ADD GUARDRAILS">
        <p className="text-sm text-muted-foreground mb-4">
          Guardrails are functions that inspect content before it goes in or comes out.
          Input guardrails run before the LLM sees the message. Output guardrails run
          before the response reaches the browser. This step adds two: one that blocks
          enormous inputs, and one that scrubs personal data from responses.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          <code className="text-primary">maxLength</code> rejects inputs over 2,000
          characters before the LLM even sees them.{' '}
          <code className="text-primary">piiRedactor</code> strips emails, phone numbers,
          and SSNs from every response before it leaves the server.
        </p>
        <CodeBlock title="agents/qa/agent.ts (with guardrails)">{`import { defineAgent, maxLength, piiRedactor } from 'fabrk'

export default defineAgent({
  model: 'claude-sonnet-4-5-20250514',
  systemPrompt: \`You are a helpful documentation assistant.
When answering questions, always call search_docs first to find relevant content.
Cite the source URL at the end of your answer like this: [SOURCE: /path].
Be concise — 2-3 sentences maximum per answer.\`,
  tools: ['search_docs'],
  stream: true,
  auth: 'none',
  memory: true,
  budget: {
    daily: 5.00,
    alertThreshold: 0.8,
  },

  // Block inputs over 2,000 characters — prevents prompt injection via long payloads
  inputGuardrails: [maxLength(2000)],

  // Redact PII from all responses before they leave the server
  outputGuardrails: [piiRedactor()],
})`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-2">
          Return <code className="text-primary">pass: false</code> to block the request and
          send a 400. Return a <code className="text-primary">replacement</code> to swap the
          content and keep going — that's how <code className="text-primary">piiRedactor</code>{' '}
          works. You can write your own guardrail as a plain function:
        </p>
        <CodeBlock title="custom guardrail example">{`import type { Guardrail } from 'fabrk'

// Block questions about competitors
const noCompetitorMentions: Guardrail = (content) => {
  const competitors = ['langchain', 'mastra', 'vercel ai']
  const lower = content.toLowerCase()
  for (const c of competitors) {
    if (lower.includes(c)) {
      return { pass: false, reason: 'Competitor mention blocked' }
    }
  }
  return { pass: true }
}`}</CodeBlock>
      </Section>

      {/* STEP 7 — CONNECT THE FRONTEND */}
      <Section id="frontend" title="STEP 7 — CONNECT THE FRONTEND">
        <p className="text-sm text-muted-foreground mb-4">
          Now you're building the chat page. The{' '}
          <code className="text-primary">useAgent</code> hook connects to your agent,
          reads the stream, and gives you messages, tool calls, and loading state — ready
          to render. You don't handle the streaming logic yourself.
        </p>
        <CodeBlock title="src/app/page.tsx">{`'use client'

import { useState } from 'react'
import { useAgent } from 'fabrk'
import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'

export default function ChatPage() {
  const { send, stop, messages, isStreaming, toolCalls, error } = useAgent('qa')
  const [input, setInput] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    const text = input
    setInput('')
    await send(text)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className={cn('text-xl font-bold uppercase', mode.font)}>
        {'>'} DOC Q&A
      </h1>

      {/* Tool call activity */}
      {toolCalls.length > 0 && (
        <div className={cn('border border-border bg-muted p-3 text-xs', mode.radius, mode.font)}>
          {toolCalls.map((tc, i) => (
            <div key={i} className="text-muted-foreground">
              [{tc.output ? 'DONE' : 'RUNNING'}] {tc.name}
              {tc.durationMs !== undefined && \` (\${tc.durationMs}ms)\`}
            </div>
          ))}
        </div>
      )}

      {/* Message thread */}
      <div className="space-y-3 min-h-[200px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'p-3 text-sm border border-border',
              mode.radius,
              msg.role === 'user'
                ? 'bg-primary/10 text-foreground ml-8'
                : 'bg-card text-foreground'
            )}
          >
            <div className={cn('text-xs text-muted-foreground mb-1 uppercase', mode.font)}>
              [{msg.role === 'user' ? 'YOU' : 'AGENT'}]
            </div>
            {typeof msg.content === 'string' ? msg.content : '[multipart content]'}
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className={cn('p-3 text-sm border border-border bg-card', mode.radius)}>
            <div className={cn('text-xs text-muted-foreground mb-1 uppercase', mode.font)}>
              [AGENT]
            </div>
            <span className="animate-pulse">...</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">[ERROR] {error}</p>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className={cn(
            'flex-1 px-3 py-2 text-sm bg-card border border-border text-foreground',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary',
            mode.radius, mode.font
          )}
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            className={cn('px-4 py-2 text-xs bg-destructive text-destructive-foreground', mode.radius, mode.font)}
          >
            {'>'} STOP
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn('px-4 py-2 text-xs bg-primary text-primary-foreground disabled:opacity-50', mode.radius, mode.font)}
          >
            {'>'} SEND
          </button>
        )}
      </form>
    </div>
  )
}`}</CodeBlock>

        <InfoCard title="EVENTS useAgent HANDLES FOR YOU">
          <ul className="space-y-1 mt-1">
            <li><code className="text-primary">text-delta</code> — adds a token chunk to the current assistant message as it arrives</li>
            <li><code className="text-primary">tool-call</code> — adds an entry to <code className="text-primary">toolCalls</code> so you can show "[RUNNING] search_docs"</li>
            <li><code className="text-primary">tool-result</code> — updates that entry with the output and how long it took</li>
            <li><code className="text-primary">usage</code> — tracks token counts and cost so far</li>
            <li><code className="text-primary">error</code> — sets the error string so you can display it</li>
          </ul>
        </InfoCard>
      </Section>

      {/* STEP 8 — TEST IT */}
      <Section id="testing" title="STEP 8 — TEST IT">
        <p className="text-sm text-muted-foreground mb-4">
          You're writing a test that proves your agent actually searches before it answers.
          <code className="text-primary">createTestAgent</code> runs the real agent loop
          with a fake LLM standing in for the provider — no API calls, no cost, same result
          every time.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          The test checks that when you ask "How do I install FABRK?", the agent calls{' '}
          <code className="text-primary">search_docs</code> first. That's how you verify
          your system prompt instruction ("always call search_docs first") is actually
          working.
        </p>
        <CodeBlock title="agents/qa/agent.test.ts">{`import { describe, it, expect } from 'vitest'
import {
  mockLLM,
  createTestAgent,
  calledTool,
  respondedWith,
} from 'fabrk'
import searchDocsTool from '../../tools/search-docs'

describe('qa agent', () => {
  it('calls search_docs when asked a question', async () => {
    const mock = mockLLM()

    // When the LLM sees "install", it should call search_docs
    mock
      .onMessage('install')
      .callTool('search_docs', { query: 'install FABRK' })

    // After the tool runs, the LLM responds with the answer
    mock
      .onToolCall('search_docs')
      .returnResult('Install FABRK with: npx create-fabrk-app')

    mock.setDefault('Install FABRK with: npx create-fabrk-app [SOURCE: /getting-started]')

    const agent = createTestAgent({
      tools: [searchDocsTool],
      systemPrompt: 'Always call search_docs before answering.',
      mock,
    })

    const result = await agent.send('How do I install FABRK?')

    // Verify the tool was called
    expect(calledTool(result, 'search_docs')).toBe(true)

    // Verify the response contains the answer
    expect(respondedWith(result, 'Install FABRK')).toBe(true)
  })

  it('does not call tools for simple greetings', async () => {
    const mock = mockLLM()
    mock.setDefault('Hello! How can I help you today?')

    const agent = createTestAgent({
      tools: [searchDocsTool],
      mock,
    })

    const result = await agent.send('Hello')

    expect(calledTool(result, 'search_docs')).toBe(false)
    expect(respondedWith(result, 'Hello')).toBe(true)
  })
})`}</CodeBlock>

        <CodeBlock title="terminal">{`pnpm test agents/qa/agent.test.ts`}</CodeBlock>

        <InfoCard title="TESTING UTILITIES">
          <ul className="space-y-1 mt-1">
            <li><code className="text-primary">mockLLM()</code> — fake LLM you control with chainable matchers</li>
            <li><code className="text-primary">mock.onMessage(pattern).callTool(name, input)</code> — when the message matches, the mock emits a tool call</li>
            <li><code className="text-primary">mock.onToolCall(name).returnResult(text)</code> — what the tool gives back to the agent</li>
            <li><code className="text-primary">createTestAgent(opts)</code> — runs your real agent loop against the mock</li>
            <li><code className="text-primary">calledTool(result, name)</code> — true if the named tool ran during this conversation</li>
            <li><code className="text-primary">respondedWith(result, text)</code> — true if the final response contains the given text</li>
          </ul>
        </InfoCard>
      </Section>

      {/* WHAT'S NEXT */}
      <Section id="next" title="WHAT'S NEXT">
        <p className="text-sm text-muted-foreground mb-4">
          Your agent searches docs, remembers conversations, guards against bad input,
          renders in a chat UI, and has tests to back it up. Here's where to go next.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className={cn('border border-border bg-card p-4', mode.radius)}>
            <div className={cn('text-xs font-bold text-primary uppercase mb-2', mode.font)}>
              [WORKFLOWS]
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Connect agents into multi-step sequences using{' '}
              <code className="text-primary">defineWorkflow</code>. Add branches, parallel
              steps, and pause-for-approval before continuing.
            </p>
            <a href="/agents#workflows" className={cn('text-xs text-primary', mode.font)}>
              {'>'} READ DOCS
            </a>
          </div>

          <div className={cn('border border-border bg-card p-4', mode.radius)}>
            <div className={cn('text-xs font-bold text-primary uppercase mb-2', mode.font)}>
              [MULTI-AGENT]
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Use <code className="text-primary">defineSupervisor</code> and{' '}
              <code className="text-primary">agentAsTool</code> to have one agent hand
              off subtasks to another — no extra network requests involved.
            </p>
            <a href="/agents#orchestration" className={cn('text-xs text-primary', mode.font)}>
              {'>'} READ DOCS
            </a>
          </div>

          <div className={cn('border border-border bg-card p-4', mode.radius)}>
            <div className={cn('text-xs font-bold text-primary uppercase mb-2', mode.font)}>
              [MCP TOOLS]
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Point your agent at any MCP server — GitHub, Slack, a database — using{' '}
              <code className="text-primary">connectMCPServer</code>. Your agent calls
              their tools the same way it calls yours.
            </p>
            <a href="/agents#mcp" className={cn('text-xs text-primary', mode.font)}>
              {'>'} READ DOCS
            </a>
          </div>

          <div className={cn('border border-border bg-card p-4', mode.radius)}>
            <div className={cn('text-xs font-bold text-primary uppercase mb-2', mode.font)}>
              [DURABLE AGENTS]
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Save agent state so a long-running job can pick up where it left off after
              a failure or redeploy. Use{' '}
              <code className="text-primary">InMemoryCheckpointStore</code> to start, or
              plug in your own.
            </p>
            <a href="/agents#durable" className={cn('text-xs text-primary', mode.font)}>
              {'>'} READ DOCS
            </a>
          </div>
        </div>

        <InfoCard title="FULL AGENT REFERENCE">
          The <a href="/agents" className="text-primary underline">/agents</a> reference
          covers every option on <code className="text-primary">defineAgent</code>, all
          built-in guardrail factories, evals and datasets, semantic memory, computer-use
          tools, and voice (TTS/STT/realtime).
        </InfoCard>
      </Section>
    </DocLayout>
  )
}
