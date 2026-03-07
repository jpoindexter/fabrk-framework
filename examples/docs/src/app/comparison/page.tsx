'use client'

import { cn } from '@fabrk/core'
import { mode } from '@fabrk/design-system'
import { DocLayout, Section, CodeBlock, InfoCard } from '@/components/doc-layout'

interface ComparisonRow {
  category: string
  feature: string
  fabrk: string
  nextai: string
  langgraph: string
  fabrkStatus: 'yes' | 'partial' | 'no'
  nextaiStatus: 'yes' | 'partial' | 'no'
  langgraphStatus: 'yes' | 'partial' | 'no'
}

const rows: ComparisonRow[] = [
  // Runtime & Routing
  {
    category: 'RUNTIME',
    feature: 'File-system routing',
    fabrk: 'Yes — own Vite 7 router',
    nextai: 'Yes — Next.js App Router',
    langgraph: 'No — bring your own framework',
    fabrkStatus: 'yes',
    nextaiStatus: 'yes',
    langgraphStatus: 'no',
  },
  {
    category: 'RUNTIME',
    feature: 'SSR / RSC streaming',
    fabrk: 'Yes — built in',
    nextai: 'Yes — Next.js RSC',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'yes',
    langgraphStatus: 'no',
  },
  {
    category: 'RUNTIME',
    feature: 'Edge runtime support',
    fabrk: 'Yes — Cloudflare Workers fetch handler',
    nextai: 'Yes — Vercel Edge Functions',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'yes',
    langgraphStatus: 'no',
  },
  {
    category: 'RUNTIME',
    feature: 'i18n routing',
    fabrk: 'No — not yet implemented',
    nextai: 'Yes — next-intl, next/i18n',
    langgraph: 'No',
    fabrkStatus: 'no',
    nextaiStatus: 'yes',
    langgraphStatus: 'no',
  },
  {
    category: 'RUNTIME',
    feature: 'OG image generation',
    fabrk: 'No — no next/og equivalent yet',
    nextai: 'Yes — next/og',
    langgraph: 'No',
    fabrkStatus: 'no',
    nextaiStatus: 'yes',
    langgraphStatus: 'no',
  },
  {
    category: 'RUNTIME',
    feature: 'Font optimization',
    fabrk: 'No — no next/font equivalent yet',
    nextai: 'Yes — next/font',
    langgraph: 'No',
    fabrkStatus: 'no',
    nextaiStatus: 'yes',
    langgraphStatus: 'no',
  },
  // AI Agents
  {
    category: 'AI AGENTS',
    feature: 'Agent definition API',
    fabrk: 'Yes — defineAgent()',
    nextai: 'Partial — manual wiring per endpoint',
    langgraph: 'Yes — graph nodes',
    fabrkStatus: 'yes',
    nextaiStatus: 'partial',
    langgraphStatus: 'yes',
  },
  {
    category: 'AI AGENTS',
    feature: 'Tool calling',
    fabrk: 'Yes — defineTool(), auto-executed loop',
    nextai: 'Partial — manual tool parsing required',
    langgraph: 'Yes — node functions',
    fabrkStatus: 'yes',
    nextaiStatus: 'partial',
    langgraphStatus: 'yes',
  },
  {
    category: 'AI AGENTS',
    feature: 'Agent orchestration / supervisor',
    fabrk: 'Yes — supervisor + agent-as-tool delegation',
    nextai: 'No — build it yourself',
    langgraph: 'Yes — graph-based state machines',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'yes',
  },
  {
    category: 'AI AGENTS',
    feature: 'Streaming SSE responses',
    fabrk: 'Yes — createSSEResponse(), useAgent() hook',
    nextai: 'Yes — useChat() from Vercel AI SDK',
    langgraph: 'Partial — framework-agnostic, manual wiring',
    fabrkStatus: 'yes',
    nextaiStatus: 'yes',
    langgraphStatus: 'partial',
  },
  {
    category: 'AI AGENTS',
    feature: 'Agent memory (threads)',
    fabrk: 'Yes — thread-per-session',
    nextai: 'No — build it yourself',
    langgraph: 'Yes — state persistence',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'yes',
  },
  {
    category: 'AI AGENTS',
    feature: 'Skills system',
    fabrk: 'Yes — composable prompt + tool bundles',
    nextai: 'No',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  {
    category: 'AI AGENTS',
    feature: 'RAG helper',
    fabrk: 'Yes — ragTool() with pluggable vector store',
    nextai: 'No — use LangChain or LlamaIndex separately',
    langgraph: 'Partial — manual integration',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'partial',
  },
  {
    category: 'AI AGENTS',
    feature: 'SQL query tool',
    fabrk: 'Yes — read-only by default, parameterized',
    nextai: 'No',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  {
    category: 'AI AGENTS',
    feature: 'Agent testing framework',
    fabrk: 'Yes — createTestAgent(), mockLLM(), assertion helpers',
    nextai: 'No — test manually',
    langgraph: 'Partial — some test utilities',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'partial',
  },
  // Cost & Budget
  {
    category: 'COST & BUDGET',
    feature: 'Per-call cost tracking',
    fabrk: 'Yes — AICostTracker, model pricing table',
    nextai: 'No — build it yourself',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  {
    category: 'COST & BUDGET',
    feature: 'Budget enforcement',
    fabrk: 'Yes — per-agent, per-session, daily limits',
    nextai: 'No',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  {
    category: 'COST & BUDGET',
    feature: 'Cost alerts',
    fabrk: 'Yes — configurable thresholds',
    nextai: 'No',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  // MCP
  {
    category: 'MCP',
    feature: 'MCP server (JSON-RPC)',
    fabrk: 'Yes — HTTP + stdio transports',
    nextai: 'No',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  {
    category: 'MCP',
    feature: 'MCP client',
    fabrk: 'Yes — built in',
    nextai: 'No',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  // Dev Experience
  {
    category: 'DEV EXPERIENCE',
    feature: 'Dev dashboard',
    fabrk: 'Yes — /__ai: cost trends, tool stats, errors',
    nextai: 'No',
    langgraph: 'Partial — LangSmith (separate product)',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'partial',
  },
  {
    category: 'DEV EXPERIENCE',
    feature: 'CLI scaffolding',
    fabrk: 'Yes — create-fabrk-app',
    nextai: 'Yes — create-next-app',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'yes',
    langgraphStatus: 'no',
  },
  {
    category: 'DEV EXPERIENCE',
    feature: 'TypeScript-first',
    fabrk: 'Yes — 24/24 type-check, 0 errors',
    nextai: 'Yes',
    langgraph: 'Partial — Python-first, TS port less mature',
    fabrkStatus: 'yes',
    nextaiStatus: 'yes',
    langgraphStatus: 'partial',
  },
  // UI & Design
  {
    category: 'UI & DESIGN',
    feature: 'Pre-built UI components',
    fabrk: 'Yes — 109+ components',
    nextai: 'No — use shadcn/ui, Radix, etc.',
    langgraph: 'No — framework-agnostic',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  {
    category: 'UI & DESIGN',
    feature: 'Design system / themes',
    fabrk: 'Yes — 18 themes, runtime switching',
    nextai: 'No — bring your own',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  {
    category: 'UI & DESIGN',
    feature: 'Charts (built in)',
    fabrk: 'Yes — 11 chart types',
    nextai: 'No',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  // Full-Stack
  {
    category: 'FULL-STACK',
    feature: 'Auth (NextAuth, API keys, MFA)',
    fabrk: 'Yes — @fabrk/auth',
    nextai: 'Partial — NextAuth separate install',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'partial',
    langgraphStatus: 'no',
  },
  {
    category: 'FULL-STACK',
    feature: 'Payments (Stripe, Polar)',
    fabrk: 'Yes — @fabrk/payments',
    nextai: 'No — manual integration',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  {
    category: 'FULL-STACK',
    feature: 'Email delivery',
    fabrk: 'Yes — @fabrk/email (Resend)',
    nextai: 'No — manual integration',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  {
    category: 'FULL-STACK',
    feature: 'File storage (S3, R2)',
    fabrk: 'Yes — @fabrk/storage',
    nextai: 'No — manual integration',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'no',
    langgraphStatus: 'no',
  },
  {
    category: 'FULL-STACK',
    feature: 'Security (CSRF, CSP, rate limiting)',
    fabrk: 'Yes — @fabrk/security',
    nextai: 'Partial — manual or third-party',
    langgraph: 'No',
    fabrkStatus: 'yes',
    nextaiStatus: 'partial',
    langgraphStatus: 'no',
  },
  // Ecosystem
  {
    category: 'ECOSYSTEM',
    feature: 'Production battle-testing at scale',
    fabrk: 'No — early stage',
    nextai: 'Yes — massive scale',
    langgraph: 'Yes — production use',
    fabrkStatus: 'no',
    nextaiStatus: 'yes',
    langgraphStatus: 'yes',
  },
  {
    category: 'ECOSYSTEM',
    feature: 'Community / third-party plugins',
    fabrk: 'No — early ecosystem',
    nextai: 'Yes — huge ecosystem',
    langgraph: 'Yes — Python ecosystem',
    fabrkStatus: 'no',
    nextaiStatus: 'yes',
    langgraphStatus: 'yes',
  },
  {
    category: 'ECOSYSTEM',
    feature: 'Test coverage',
    fabrk: 'Yes — 1,832 tests',
    nextai: 'Yes',
    langgraph: 'Yes',
    fabrkStatus: 'yes',
    nextaiStatus: 'yes',
    langgraphStatus: 'yes',
  },
]

const categories = Array.from(new Set(rows.map((r) => r.category)))

function StatusCell({ status, text }: { status: 'yes' | 'partial' | 'no'; text: string }) {
  const color =
    status === 'yes'
      ? 'text-success'
      : status === 'partial'
        ? 'text-primary'
        : 'text-muted-foreground'
  const label = status === 'yes' ? 'YES' : status === 'partial' ? 'PARTIAL' : 'NO'
  return (
    <td className="px-3 py-2.5 text-xs align-top border-b border-border">
      <span className={cn('font-bold block mb-0.5', color)}>{label}</span>
      <span className="text-muted-foreground leading-relaxed">{text}</span>
    </td>
  )
}

export default function ComparisonPage() {
  return (
    <DocLayout
      title="COMPARISON"
      description="How FABRK stacks up against Next.js + Vercel AI SDK and LangGraph. An honest look at what each tool does well and where each falls short."
    >
      <InfoCard title="SCOPE">
        These three tools solve different problems. Next.js + Vercel AI SDK is a web framework
        with AI bolted on. LangGraph is an agent orchestration library with no web layer. FABRK
        is a full-stack framework designed around AI agents as a first-class primitive. This
        comparison is honest about what FABRK does not have yet.
      </InfoCard>

      {/* Comparison Table */}
      <Section title="FEATURE MATRIX">
        <div className={cn('border border-border overflow-x-auto', mode.radius)}>
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th
                  className={cn(
                    'text-left px-3 py-2.5 text-muted-foreground uppercase w-[180px]',
                    mode.font
                  )}
                >
                  FEATURE
                </th>
                <th
                  className={cn(
                    'text-left px-3 py-2.5 text-foreground uppercase w-[220px]',
                    mode.font
                  )}
                >
                  FABRK
                </th>
                <th
                  className={cn(
                    'text-left px-3 py-2.5 text-muted-foreground uppercase w-[220px]',
                    mode.font
                  )}
                >
                  NEXT.JS + AI SDK
                </th>
                <th
                  className={cn(
                    'text-left px-3 py-2.5 text-muted-foreground uppercase w-[220px]',
                    mode.font
                  )}
                >
                  LANGGRAPH
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const catRows = rows.filter((r) => r.category === cat)
                return (
                  <>
                    <tr key={`cat-${cat}`} className="bg-secondary/30">
                      <td
                        colSpan={4}
                        className={cn(
                          'px-3 py-1.5 text-xs font-bold text-muted-foreground uppercase border-b border-border',
                          mode.font
                        )}
                      >
                        {cat}
                      </td>
                    </tr>
                    {catRows.map((row) => (
                      <tr key={row.feature} className="hover:bg-secondary/10 transition-colors">
                        <td className="px-3 py-2.5 text-xs text-foreground align-top border-b border-border font-medium">
                          {row.feature}
                        </td>
                        <StatusCell status={row.fabrkStatus} text={row.fabrk} />
                        <StatusCell status={row.nextaiStatus} text={row.nextai} />
                        <StatusCell status={row.langgraphStatus} text={row.langgraph} />
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className={cn('flex gap-4 mt-3 text-xs', mode.font)}>
          <span className="text-success font-bold">YES</span>
          <span className="text-muted-foreground">Built in</span>
          <span className="text-primary font-bold ml-4">PARTIAL</span>
          <span className="text-muted-foreground">Possible with extra work</span>
          <span className="text-muted-foreground font-bold ml-4">NO</span>
          <span className="text-muted-foreground">Not available</span>
        </div>
      </Section>

      {/* Code Comparison */}
      <Section title="SAME TASK IN THREE TOOLS">
        <p className="text-sm text-muted-foreground mb-4">
          Defining an AI agent that can search documents and answer questions. This shows the
          API surface each tool exposes and how much wiring you write yourself.
        </p>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-6 mb-3', mode.font)}>
          FABRK
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          One file. Agent loop, tool calling, budget, and SSE streaming handled by the framework.
        </p>
        <CodeBlock title="agents/docs-assistant/agent.ts">{`import { defineAgent, defineTool, textResult } from '@fabrk/framework'

// Define a tool
const searchDocs = defineTool({
  name: 'search-docs',
  description: 'Search the documentation for a query',
  parameters: { query: { type: 'string', description: 'Search query' } },
  async execute({ query }) {
    const results = await vectorStore.search(query, { limit: 5 })
    return textResult(results.map(r => r.content).join('\\n\\n'))
  },
})

// Define the agent — framework handles the loop, streaming, and budget
export default defineAgent({
  model: 'claude-sonnet-4-5-20250514',
  systemPrompt: 'You are a docs assistant. Use search-docs to find relevant information.',
  tools: [searchDocs],
  budget: { daily: 5.0, perSession: 0.25 },
})

// Agent is automatically mounted at /agents/docs-assistant
// Client: import { useAgent } from '@fabrk/framework/client/use-agent'`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-6 mb-3', mode.font)}>
          NEXT.JS + VERCEL AI SDK
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          More files. You wire the route handler, define tools with zod, parse the stream
          manually, and there is no built-in budget enforcement.
        </p>
        <CodeBlock title="app/api/chat/route.ts">{`import { streamText, tool } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

// You define the route handler yourself
export async function POST(req: Request) {
  const { messages } = await req.json()

  // No built-in budget enforcement — add your own tracking
  // No agent loop — stream ends after one turn unless you build multi-turn

  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250514'),
    system: 'You are a docs assistant. Use searchDocs to find relevant information.',
    messages,
    tools: {
      searchDocs: tool({
        description: 'Search the documentation for a query',
        parameters: z.object({ query: z.string().describe('Search query') }),
        execute: async ({ query }) => {
          const results = await vectorStore.search(query, { limit: 5 })
          return results.map(r => r.content).join('\\n\\n')
        },
      }),
    },
    maxSteps: 5, // Tool loop — must opt in manually
  })

  return result.toDataStreamResponse()
}

// Client: useChat() from 'ai/react'
// Cost tracking: build your own middleware or use separate service
// Budget enforcement: build your own`}</CodeBlock>

        <h3 className={cn('text-sm font-semibold text-foreground uppercase mt-6 mb-3', mode.font)}>
          LANGGRAPH (TYPESCRIPT)
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          Graph-based. Powerful orchestration primitives, but no web layer, no streaming HTTP
          handler, no UI. You build those yourself on top.
        </p>
        <CodeBlock title="agent/graph.ts">{`import { StateGraph, MessagesAnnotation } from '@langchain/langgraph'
import { ChatAnthropic } from '@langchain/anthropic'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { ToolNode } from '@langchain/langgraph/prebuilt'

// Define the tool
const searchDocs = tool(
  async ({ query }) => {
    const results = await vectorStore.search(query, { limit: 5 })
    return results.map(r => r.content).join('\\n\\n')
  },
  {
    name: 'search_docs',
    description: 'Search the documentation for a query',
    schema: z.object({ query: z.string().describe('Search query') }),
  }
)

const model = new ChatAnthropic({ model: 'claude-sonnet-4-5-20250514' })
  .bindTools([searchDocs])

// Build the graph — powerful but verbose for simple agents
function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const last = messages[messages.length - 1]
  return last.tool_calls?.length ? 'tools' : '__end__'
}

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages)
  return { messages: [response] }
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode('agent', callModel)
  .addNode('tools', new ToolNode([searchDocs]))
  .addEdge('__start__', 'agent')
  .addConditionalEdges('agent', shouldContinue)
  .addEdge('tools', 'agent')

export const graph = workflow.compile()

// Now you need to build: HTTP route, streaming, session management,
// budget enforcement, UI, and cost tracking — all separately`}</CodeBlock>
      </Section>

      {/* When to use FABRK */}
      <Section title="WHEN TO USE FABRK">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={cn('border border-success/30 bg-success/5 p-4', mode.radius)}>
            <div className={cn('text-xs font-bold text-success uppercase mb-3', mode.font)}>
              [FABRK IS THE RIGHT CHOICE WHEN]
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="text-foreground font-medium">AI agents are a core feature</span>
                {' '}— not an afterthought bolted on with a separate library
              </li>
              <li>
                <span className="text-foreground font-medium">You want cost control baked in</span>
                {' '}— budget limits, per-agent tracking, and alerts from day one
              </li>
              <li>
                <span className="text-foreground font-medium">You want one stack</span>
                {' '}— routing, SSR, AI agents, UI components, auth, payments, all from one config
              </li>
              <li>
                <span className="text-foreground font-medium">You are building for AI coding agents</span>
                {' '}— Claude Code, Cursor, Copilot can scaffold entire apps from AGENTS.md docs
              </li>
              <li>
                <span className="text-foreground font-medium">You need MCP</span>
                {' '}— Model Context Protocol server and client built in
              </li>
              <li>
                <span className="text-foreground font-medium">Fast iteration on a new product</span>
                {' '}— 109+ components, 18 themes, full-stack packages eliminate boilerplate
              </li>
            </ul>
          </div>

          <div className={cn('border border-border bg-card p-4', mode.radius)}>
            <div className={cn('text-xs font-bold text-muted-foreground uppercase mb-3', mode.font)}>
              [NEXT.JS + AI SDK IS BETTER WHEN]
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="text-foreground font-medium">You need i18n routing</span>
                {' '}— next-intl and next/i18n are mature, FABRK has none yet
              </li>
              <li>
                <span className="text-foreground font-medium">OG images matter</span>
                {' '}— next/og is excellent, FABRK has no equivalent
              </li>
              <li>
                <span className="text-foreground font-medium">Ecosystem breadth is critical</span>
                {' '}— thousands of community packages, large hiring pool, vast documentation
              </li>
              <li>
                <span className="text-foreground font-medium">You are already on Next.js</span>
                {' '}— migrating a large production app is high risk with minimal gain
              </li>
              <li>
                <span className="text-foreground font-medium">AI is a minor feature</span>
                {' '}— one chat box on a content site does not justify switching frameworks
              </li>
            </ul>
          </div>
        </div>

        <div className={cn('border border-border bg-card p-4', mode.radius)}>
          <div className={cn('text-xs font-bold text-muted-foreground uppercase mb-3', mode.font)}>
            [LANGGRAPH IS BETTER WHEN]
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>
              <span className="text-foreground font-medium">Complex multi-agent graphs</span>
              {' '}— LangGraph&apos;s state machine model handles branching orchestration better than a linear loop
            </li>
            <li>
              <span className="text-foreground font-medium">Python-first team</span>
              {' '}— the Python SDK is significantly more mature than the TypeScript port
            </li>
            <li>
              <span className="text-foreground font-medium">Framework-agnostic backend</span>
              {' '}— you have a separate frontend and only need agent orchestration logic
            </li>
            <li>
              <span className="text-foreground font-medium">LangSmith observability</span>
              {' '}— deep tracing and eval tooling in the LangChain ecosystem
            </li>
          </ul>
        </div>
      </Section>

      {/* Honest Limitations */}
      <Section title="HONEST LIMITATIONS">
        <InfoCard title="WHERE FABRK IS NOT READY">
          This is an honest list of gaps. These are not spin — they are real limitations you
          will hit if you choose FABRK for the wrong use case.
        </InfoCard>

        <div className={cn('border border-border overflow-x-auto mt-4', mode.radius)}>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className={cn('text-left px-3 py-2 text-muted-foreground uppercase', mode.font)}>
                  LIMITATION
                </th>
                <th className={cn('text-left px-3 py-2 text-muted-foreground uppercase', mode.font)}>
                  IMPACT
                </th>
                <th className={cn('text-left px-3 py-2 text-muted-foreground uppercase', mode.font)}>
                  WORKAROUND
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  limitation: 'No i18n routing',
                  impact: 'Cannot do locale-prefixed URLs (/en/about, /fr/about) out of the box',
                  workaround: 'Manual middleware or use Next.js instead',
                },
                {
                  limitation: 'No OG image generation',
                  impact: 'Dynamic Open Graph images require custom implementation',
                  workaround: 'Use a separate service (Cloudinary, Vercel OG) or build a handler',
                },
                {
                  limitation: 'No next/font equivalent',
                  impact: 'Font optimization and subsetting must be done manually',
                  workaround: 'Self-host fonts and configure Vite asset handling',
                },
                {
                  limitation: 'App Router only — no Pages Router',
                  impact: 'Cannot adopt FABRK routing on an existing Pages Router codebase',
                  workaround: 'Use FABRK component packages (@fabrk/components, etc.) without the framework runtime',
                },
                {
                  limitation: 'Early ecosystem',
                  impact: 'Fewer third-party plugins, smaller community, less Stack Overflow coverage',
                  workaround: 'The framework is open source — AGENTS.md docs help AI coding assistants fill gaps',
                },
                {
                  limitation: 'Not production battle-tested at scale',
                  impact: 'Unknown behavior under extreme load or edge cases not yet encountered',
                  workaround: 'Run load tests before production. Start with lower-risk workloads.',
                },
              ].map((row) => (
                <tr key={row.limitation} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2.5 text-foreground font-medium align-top">
                    {row.limitation}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground align-top">{row.impact}</td>
                  <td className="px-3 py-2.5 text-muted-foreground align-top">{row.workaround}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Architecture summary */}
      <Section title="ARCHITECTURE SUMMARY">
        <p className="text-sm text-muted-foreground mb-4">
          The fundamental difference is where AI lives in each stack.
        </p>
        <CodeBlock title="how each stack is assembled">{`# Next.js + Vercel AI SDK
next                 — routing, SSR, RSC
ai (vercel AI SDK)  — streaming text, useChat hook
langchain/llamaindex — RAG (separate install)
stripe / resend / …  — payments, email (separate installs, manual wiring)
shadcn/ui            — UI components (separate install, copy-paste)
[No built-in cost tracking, budget, MCP, or agent testing]

# LangGraph
@langchain/langgraph  — agent orchestration (state machines)
@langchain/core       — tools, messages
[No web layer, no UI, no routing — bring your own everything]

# FABRK
@fabrk/framework      — Vite 7 runtime, routing, SSR, RSC streaming
                         defineAgent(), defineTool(), MCP server + client
                         agent loop, budget enforcement, cost tracking
                         dev dashboard (/__ai), agent testing framework
@fabrk/components     — 109+ UI components, 11 chart types, 18 themes
@fabrk/auth           — NextAuth, API keys (SHA-256), MFA (TOTP)
@fabrk/payments       — Stripe, Polar, Lemon Squeezy adapters
@fabrk/email          — Resend + console adapter, 4 templates
@fabrk/storage        — S3, Cloudflare R2, local filesystem
@fabrk/security       — CSRF, CSP, rate limiting, audit logging, GDPR
@fabrk/store-prisma   — 7 Prisma store adapters for production persistence`}</CodeBlock>
      </Section>

      {/* AI Agent Layer comparison */}
      <Section title="AI AGENT LAYER">
        <p className="text-sm text-muted-foreground mb-4">
          How FABRK&apos;s agent primitives compare against the dedicated agent frameworks —
          LangChain JS, Mastra, and Vercel AI SDK — on a feature-by-feature basis.
        </p>

        <div className={cn('border border-border overflow-x-auto', mode.radius)}>
          <table className="w-full text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th
                  className={cn(
                    'text-left px-3 py-2.5 text-muted-foreground uppercase w-[200px]',
                    mode.font
                  )}
                >
                  FEATURE
                </th>
                <th
                  className={cn(
                    'text-left px-3 py-2.5 text-foreground uppercase w-[190px]',
                    mode.font
                  )}
                >
                  FABRK
                </th>
                <th
                  className={cn(
                    'text-left px-3 py-2.5 text-muted-foreground uppercase w-[190px]',
                    mode.font
                  )}
                >
                  LANGCHAIN JS
                </th>
                <th
                  className={cn(
                    'text-left px-3 py-2.5 text-muted-foreground uppercase w-[190px]',
                    mode.font
                  )}
                >
                  MASTRA
                </th>
                <th
                  className={cn(
                    'text-left px-3 py-2.5 text-muted-foreground uppercase w-[190px]',
                    mode.font
                  )}
                >
                  VERCEL AI SDK
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  feature: 'File-system routing + SSR',
                  fabrk: { status: 'yes' as const, text: 'Built-in Vite 7 router' },
                  langchain: { status: 'no' as const, text: 'No web layer' },
                  mastra: { status: 'no' as const, text: 'No web layer' },
                  vercel: { status: 'partial' as const, text: 'Next.js only' },
                },
                {
                  feature: 'Agent definition',
                  fabrk: { status: 'yes' as const, text: 'defineAgent()' },
                  langchain: { status: 'yes' as const, text: 'AgentExecutor' },
                  mastra: { status: 'yes' as const, text: 'Agent class' },
                  vercel: { status: 'no' as const, text: 'No agent primitive' },
                },
                {
                  feature: 'Built-in memory',
                  fabrk: { status: 'yes' as const, text: 'Thread + semantic + long-term' },
                  langchain: { status: 'yes' as const, text: 'Via LangChain memory' },
                  mastra: { status: 'yes' as const, text: 'Built-in memory layer' },
                  vercel: { status: 'no' as const, text: 'Build your own' },
                },
                {
                  feature: 'Workflows (linear)',
                  fabrk: { status: 'yes' as const, text: 'defineWorkflow()' },
                  langchain: { status: 'yes' as const, text: 'LCEL chains' },
                  mastra: { status: 'yes' as const, text: 'Workflow DSL' },
                  vercel: { status: 'no' as const, text: 'Not supported' },
                },
                {
                  feature: 'Cyclic workflows',
                  fabrk: { status: 'yes' as const, text: 'defineStateGraph()' },
                  langchain: { status: 'yes' as const, text: 'LangGraph state machines' },
                  mastra: { status: 'no' as const, text: 'Linear only' },
                  vercel: { status: 'no' as const, text: 'Not supported' },
                },
                {
                  feature: 'Multi-agent orchestration',
                  fabrk: { status: 'yes' as const, text: 'agentAsTool + supervisor + network' },
                  langchain: { status: 'yes' as const, text: 'Multi-agent graph' },
                  mastra: { status: 'yes' as const, text: 'Agent networks' },
                  vercel: { status: 'no' as const, text: 'Not supported' },
                },
                {
                  feature: 'MCP client/server',
                  fabrk: { status: 'yes' as const, text: 'Both — HTTP + stdio' },
                  langchain: { status: 'partial' as const, text: 'Client only' },
                  mastra: { status: 'yes' as const, text: 'Both' },
                  vercel: { status: 'partial' as const, text: 'Client only' },
                },
                {
                  feature: 'Built-in evals',
                  fabrk: { status: 'yes' as const, text: 'defineEval + scorers + MockLLM' },
                  langchain: { status: 'no' as const, text: 'LangSmith (separate product)' },
                  mastra: { status: 'yes' as const, text: 'Built-in eval framework' },
                  vercel: { status: 'no' as const, text: 'Not supported' },
                },
                {
                  feature: 'Guardrails',
                  fabrk: { status: 'yes' as const, text: 'Input + output + parallel async' },
                  langchain: { status: 'no' as const, text: 'Manual implementation' },
                  mastra: { status: 'yes' as const, text: 'Built-in guardrails' },
                  vercel: { status: 'no' as const, text: 'Not supported' },
                },
                {
                  feature: 'Durable agents (checkpoint)',
                  fabrk: { status: 'yes' as const, text: 'Checkpoint/resume/rollback' },
                  langchain: { status: 'no' as const, text: 'Not built in' },
                  mastra: { status: 'yes' as const, text: 'Durable execution' },
                  vercel: { status: 'no' as const, text: 'Not supported' },
                },
                {
                  feature: 'OTel tracing',
                  fabrk: { status: 'yes' as const, text: 'Auto-instrumented' },
                  langchain: { status: 'no' as const, text: 'LangSmith only' },
                  mastra: { status: 'yes' as const, text: 'Built-in OTel' },
                  vercel: { status: 'yes' as const, text: 'AI SDK telemetry' },
                },
                {
                  feature: 'UI components',
                  fabrk: { status: 'yes' as const, text: '109+ components, 18 themes' },
                  langchain: { status: 'no' as const, text: 'No UI layer' },
                  mastra: { status: 'no' as const, text: 'No UI layer' },
                  vercel: { status: 'no' as const, text: 'No UI layer' },
                },
                {
                  feature: 'Voice (TTS/STT/realtime)',
                  fabrk: { status: 'yes' as const, text: 'Built-in /__ai/tts, /__ai/stt, /__ai/realtime' },
                  langchain: { status: 'no' as const, text: 'Not supported' },
                  mastra: { status: 'no' as const, text: 'Not supported' },
                  vercel: { status: 'no' as const, text: 'Not supported' },
                },
                {
                  feature: 'A2A protocol',
                  fabrk: { status: 'yes' as const, text: 'Agent-to-agent via agentAsTool' },
                  langchain: { status: 'no' as const, text: 'Not supported' },
                  mastra: { status: 'yes' as const, text: 'Supported' },
                  vercel: { status: 'no' as const, text: 'Not supported' },
                },
              ].map((row) => (
                <tr key={row.feature} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-foreground align-top border-b border-border font-medium">
                    {row.feature}
                  </td>
                  {(
                    [
                      { key: 'fabrk', data: row.fabrk },
                      { key: 'langchain', data: row.langchain },
                      { key: 'mastra', data: row.mastra },
                      { key: 'vercel', data: row.vercel },
                    ] as const
                  ).map(({ key, data }) => {
                    const color =
                      data.status === 'yes'
                        ? 'text-success'
                        : data.status === 'partial'
                          ? 'text-primary'
                          : 'text-muted-foreground'
                    const label =
                      data.status === 'yes' ? 'YES' : data.status === 'partial' ? 'PARTIAL' : 'NO'
                    return (
                      <td
                        key={key}
                        className="px-3 py-2.5 text-xs align-top border-b border-border"
                      >
                        <span className={cn('font-bold block mb-0.5', color)}>{label}</span>
                        <span className="text-muted-foreground leading-relaxed">{data.text}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={cn('flex gap-4 mt-3 text-xs', mode.font)}>
          <span className="text-success font-bold">YES</span>
          <span className="text-muted-foreground">Built in</span>
          <span className="text-primary font-bold ml-4">PARTIAL</span>
          <span className="text-muted-foreground">Possible with extra work</span>
          <span className="text-muted-foreground font-bold ml-4">NO</span>
          <span className="text-muted-foreground">Not available</span>
        </div>

        <div className={cn('border border-primary/30 bg-primary/5 p-4 mt-6', mode.radius)}>
          <div className={cn('text-xs font-bold text-primary uppercase mb-2', mode.font)}>
            [THE KEY DIFFERENTIATOR]
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            FABRK is the only framework that combines a full-stack Vite 7 runtime — routing, SSR,
            file-system conventions — with a complete AI agent layer. LangChain JS and Mastra are
            powerful orchestration libraries, but they have no web layer: you still need to reach
            for Next.js or Express, wire up a UI library, and stitch cost tracking together
            yourself. Vercel AI SDK gives you great streaming primitives on top of Next.js, but
            has no agent primitive, no memory, no workflows, and no evals. With FABRK you do not
            glue three separate tools together — the runtime, the agent layer, and the UI
            components ship as one coherent stack.
          </p>
        </div>
      </Section>
    </DocLayout>
  )
}
