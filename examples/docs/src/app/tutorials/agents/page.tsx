'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

export default function AgentsTutorialPage() {
  return (
    <DocLayout
      title="BUILD YOUR FIRST AI AGENT"
      description="Go from zero to a production-ready document Q&amp;A agent with tools, memory, guardrails, and tests. Every code block is copy-paste ready."
    >
      <InfoCard title="WHAT YOU WILL BUILD">
        A document Q&amp;A agent that searches a knowledge base, answers questions with cited
        sources, and remembers the conversation across turns. By the end you will have a
        working agent with a custom tool, memory, input/output guardrails, a React chat
        UI, and a test that verifies the agent calls the right tool.
        Estimated time: 15 minutes.
      </InfoCard>

      {/* STEP 1 — SETUP */}
      <Section id="setup" title="STEP 1 — SETUP">
        <p className="text-sm text-muted-foreground mb-4">
          Scaffold a new project with the <code className="text-primary">ai-saas</code> template.
          This wires up the <code className="text-primary">fabrk</code> runtime with the agent
          plugin already enabled.
        </p>
        <CodeBlock title="terminal">{`npx create-fabrk-app my-agent --template ai-saas
cd my-agent
pnpm install`}</CodeBlock>

        <p className="text-sm text-muted-foreground mt-4 mb-4">
          The Vite plugin is what activates agent routing, the dev dashboard, and the SSE
          streaming infrastructure. Verify it is present in your config:
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
          Your project structure for this tutorial:
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
          The <code className="text-primary">fabrk</code> Vite plugin scans the{' '}
          <code className="text-primary">agents/</code> directory at startup. Each subfolder
          containing an <code className="text-primary">agent.ts</code> becomes a route at{' '}
          <code className="text-primary">/api/agents/[name]</code>. The{' '}
          <code className="text-primary">agents/qa/agent.ts</code> file you create in Step 3
          will be available at <code className="text-primary">POST /api/agents/qa</code>.
        </InfoCard>
      </Section>

      {/* STEP 2 — DEFINE A TOOL */}
      <Section id="tool" title="STEP 2 — DEFINE A TOOL">
        <p className="text-sm text-muted-foreground mb-4">
          Tools are the actions your agent can take. The{' '}
          <code className="text-primary">defineTool</code> function takes a name, description,
          JSON schema for the input, and an async handler that runs when the LLM decides to
          call it. The handler returns a <code className="text-primary">ToolResult</code> via
          the <code className="text-primary">textResult</code> helper.
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
          The fabrk Vite plugin scans the <code className="text-primary">tools/</code>{' '}
          directory automatically. The filename (without extension) becomes the tool name
          you reference in <code className="text-primary">defineAgent</code>. No import
          needed — just drop the file in <code className="text-primary">tools/</code> and
          reference it by name in your agent definition.
        </InfoCard>
      </Section>

      {/* STEP 3 — DEFINE THE AGENT */}
      <Section id="agent" title="STEP 3 — DEFINE THE AGENT">
        <p className="text-sm text-muted-foreground mb-4">
          The agent definition wires together the model, tools, system prompt, and budget.
          The <code className="text-primary">tools</code> array references the tool file
          names from <code className="text-primary">tools/</code> — no import paths needed.
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
          At this point you already have a working agent. Start the dev server and test it:
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
          You do not write a route handler manually — the Vite plugin generates it from
          your agent definition. Understanding the contract helps when debugging.
        </p>

        <p className="text-sm text-muted-foreground mb-2">
          Every agent route accepts:
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
          is a <code className="text-primary">text/event-stream</code> SSE feed. Each line is
          a JSON event:
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
          get a plain JSON response instead. Useful for server-to-server calls or background
          tasks that process the full response at once.
        </InfoCard>
      </Section>

      {/* STEP 5 — ADD MEMORY */}
      <Section id="memory" title="STEP 5 — ADD MEMORY">
        <p className="text-sm text-muted-foreground mb-4">
          Without memory, every request starts from scratch — the agent has no idea what
          you asked a moment ago. Adding memory lets users ask follow-up questions like
          "Can you expand on that?" without repeating context.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Wire <code className="text-primary">InMemoryMemoryStore</code> once at startup
          and pass it to <code className="text-primary">setMemoryStore</code>. Enable memory
          on the agent with <code className="text-primary">memory: true</code>.
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
          Once memory is enabled, the agent route handler automatically creates a thread per
          session, persists messages, and injects history into each new request. The client
          passes a <code className="text-primary">threadId</code> to resume an existing thread:
        </p>
        <CodeBlock title="request with threadId">{`POST /api/agents/qa
{
  "messages": [{ "role": "user", "content": "What about routing?" }],
  "threadId": "thread_abc123"
}`}</CodeBlock>

        <InfoCard title="PRODUCTION MEMORY">
          <code className="text-primary">InMemoryMemoryStore</code> resets when the server
          restarts — fine for development. In production, swap it for a database-backed
          store. The <code className="text-primary">MemoryStore</code> interface has four
          methods: <code className="text-primary">createThread</code>,{' '}
          <code className="text-primary">getThread</code>,{' '}
          <code className="text-primary">appendMessage</code>, and{' '}
          <code className="text-primary">getMessages</code>. Implement those four and
          pass your instance to <code className="text-primary">setMemoryStore</code>.
        </InfoCard>
      </Section>

      {/* STEP 6 — ADD GUARDRAILS */}
      <Section id="guardrails" title="STEP 6 — ADD GUARDRAILS">
        <p className="text-sm text-muted-foreground mb-4">
          Guardrails are validation functions that run before input reaches the LLM
          (input guardrails) or before the response reaches the client (output guardrails).
          They are the last line of defense against runaway inputs and sensitive data leaks.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Add <code className="text-primary">maxLength</code> on the input to prevent
          compute amplification from enormous prompts, and{' '}
          <code className="text-primary">piiRedactor</code> on the output to strip email
          addresses, phone numbers, and SSNs before they reach the client.
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
          A guardrail that returns <code className="text-primary">pass: false</code> without
          a <code className="text-primary">replacement</code> blocks the request entirely and
          returns a 400. A guardrail that returns a{' '}
          <code className="text-primary">replacement</code> mutates the content and lets
          processing continue — that is how <code className="text-primary">piiRedactor</code>{' '}
          works. You can write custom guardrails as plain functions:
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
          The <code className="text-primary">useAgent</code> hook manages the SSE stream,
          message state, and tool call tracking. It handles text-delta accumulation, tool
          visibility, and error states out of the box.
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

        <InfoCard title="SSE EVENTS HANDLED BY useAgent">
          <ul className="space-y-1 mt-1">
            <li><code className="text-primary">text-delta</code> — appends a token chunk to the current assistant message</li>
            <li><code className="text-primary">tool-call</code> — adds an entry to <code className="text-primary">toolCalls</code> state</li>
            <li><code className="text-primary">tool-result</code> — updates the matching tool call with its output and duration</li>
            <li><code className="text-primary">usage</code> — accumulates token counts and USD cost</li>
            <li><code className="text-primary">error</code> — sets the error string</li>
          </ul>
        </InfoCard>
      </Section>

      {/* STEP 8 — TEST IT */}
      <Section id="testing" title="STEP 8 — TEST IT">
        <p className="text-sm text-muted-foreground mb-4">
          Testing agents means verifying behavior, not mocking HTTP. The{' '}
          <code className="text-primary">createTestAgent</code> function runs the real agent
          loop with a <code className="text-primary">MockLLM</code> standing in for the
          provider — no API calls, no cost, deterministic.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          The test below asserts that when a user asks a question, the agent calls the{' '}
          <code className="text-primary">search_docs</code> tool before responding. This
          verifies the system prompt instruction ("always call search_docs first") is working.
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
            <li><code className="text-primary">mockLLM()</code> — creates a mock LLM with chainable matchers</li>
            <li><code className="text-primary">mock.onMessage(pattern).callTool(name, input)</code> — when input matches, emit a tool call</li>
            <li><code className="text-primary">mock.onToolCall(name).returnResult(text)</code> — tool handler return value</li>
            <li><code className="text-primary">createTestAgent(opts)</code> — runs the full agent loop with the mock</li>
            <li><code className="text-primary">calledTool(result, name)</code> — asserts a tool was invoked</li>
            <li><code className="text-primary">respondedWith(result, text)</code> — asserts final content contains text</li>
          </ul>
        </InfoCard>
      </Section>

      {/* WHAT'S NEXT */}
      <Section id="next" title="WHAT'S NEXT">
        <p className="text-sm text-muted-foreground mb-4">
          You now have a production-ready agent with a tool, memory, guardrails, a chat
          UI, and passing tests. Here is what to explore next.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className={cn('border border-border bg-card p-4', mode.radius)}>
            <div className={cn('text-xs font-bold text-primary uppercase mb-2', mode.font)}>
              [WORKFLOWS]
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Chain agents into multi-step pipelines with{' '}
              <code className="text-primary">defineWorkflow</code>. Add conditional branches,
              parallel steps, and suspend/resume for human-in-the-loop approval.
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
              Build supervisor/worker patterns with{' '}
              <code className="text-primary">defineSupervisor</code> and{' '}
              <code className="text-primary">agentAsTool</code>. Delegate subtasks to
              specialized agents without HTTP round-trips.
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
              Connect external tools via the Model Context Protocol. Your agent can call
              any MCP server — GitHub, Slack, databases — using{' '}
              <code className="text-primary">connectMCPServer</code>.
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
              Persist agent execution state across restarts with{' '}
              <code className="text-primary">InMemoryCheckpointStore</code> or a custom
              store. Resume long-running agents after failures or server redeploys.
            </p>
            <a href="/agents#durable" className={cn('text-xs text-primary', mode.font)}>
              {'>'} READ DOCS
            </a>
          </div>
        </div>

        <InfoCard title="FULL AGENT REFERENCE">
          The <a href="/agents" className="text-primary underline">/agents</a> reference
          page covers every option on <code className="text-primary">defineAgent</code>,
          all guardrail factories, the full StateGraph API, evals and datasets, semantic
          memory, computer-use tools, and voice (TTS/STT/realtime).
        </InfoCard>
      </Section>
    </DocLayout>
  )
}
