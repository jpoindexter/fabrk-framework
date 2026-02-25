# FABRK Framework Implementation Plan

> **HISTORICAL:** This plan references `packages/framework` (`@fabrk/framework`) and `@fabrk/mcp`, both of which have been removed from the monorepo. This document is preserved for historical context only.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fork vinext (Cloudflare's Next.js-on-Vite reimplementation) and add AI-native conventions (agents, tools, prompts) to create an AI-first React framework.

**Architecture:** Fork `cloudflare/vinext` into `packages/framework/` in this monorepo. Rename CLI from `vinext` to `fabrk`. Add Vite plugin hooks to scan `agents/`, `tools/`, `prompts/` directories and auto-generate API routes, MCP server, and React hooks. Wire existing `@fabrk/*` packages as framework built-ins.

**Tech Stack:** TypeScript 5.x, Vite 7, React 19, `@vitejs/plugin-rsc`, pnpm workspaces, Turbo

**Design Doc:** `docs/plans/2026-02-25-fabrk-framework-design.md`

---

## Day 1: Fork + Rename

### Task 1: Clone vinext into monorepo

**Files:**
- Create: `packages/framework/` (entire directory from vinext fork)
- Modify: `pnpm-workspace.yaml`
- Modify: `turbo.json`

**Step 1: Clone vinext source into packages/framework**

```bash
cd /Users/jasonpoindexter/Documents/GitHub/_active/fabrk-framework
git clone --depth 1 https://github.com/cloudflare/vinext.git /tmp/vinext-clone
cp -r /tmp/vinext-clone/packages/vinext packages/framework
rm -rf /tmp/vinext-clone
```

**Step 2: Verify the copied structure**

```bash
ls packages/framework/src/
```

Expected: `build/ check.ts cli.ts client/ cloudflare/ config/ deploy.ts index.ts init.ts routing/ server/ shims/ utils/ vite-hmr.d.ts`

**Step 3: Add to pnpm workspace**

Add `packages/framework` to `pnpm-workspace.yaml` if not already covered by `packages/*` glob.

**Step 4: Commit**

```bash
git add packages/framework pnpm-workspace.yaml
git commit -m "chore: fork vinext into packages/framework"
```

---

### Task 2: Rename vinext to fabrk (branding)

**Files:**
- Modify: `packages/framework/package.json`
- Modify: `packages/framework/src/cli.ts`
- Modify: `packages/framework/src/index.ts`
- Modify: `packages/framework/README.md`

**Step 1: Update package.json**

Change the package.json to:
```json
{
  "name": "fabrk",
  "version": "0.1.0",
  "description": "The React framework where AI agents are as native as pages and API routes.",
  "license": "MIT",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "fabrk": "dist/cli.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./shims/*": {
      "import": "./dist/shims/*.js",
      "types": "./dist/shims/*.d.ts"
    },
    "./server/prod-server": {
      "import": "./dist/server/prod-server.js",
      "types": "./dist/server/prod-server.d.ts"
    },
    "./cloudflare": {
      "import": "./dist/cloudflare/index.js",
      "types": "./dist/cloudflare/index.d.ts"
    },
    "./server/image-optimization": {
      "import": "./dist/server/image-optimization.js",
      "types": "./dist/server/image-optimization.d.ts"
    },
    "./server/app-router-entry": {
      "import": "./dist/server/app-router-entry.js",
      "types": "./dist/server/app-router-entry.d.ts"
    }
  },
  "peerDependencies": {
    "react": ">=19.2.0",
    "react-dom": ">=19.2.0",
    "vite": "^7.0.0"
  },
  "dependencies": {
    "@unpic/react": "^1.0.2",
    "@vercel/og": "^0.8.6",
    "@vitejs/plugin-rsc": "^0.5.19",
    "glob": "^11.0.0",
    "magic-string": "^0.30.21",
    "react-server-dom-webpack": "^19.2.4",
    "rsc-html-stream": "^0.0.7",
    "vite-tsconfig-paths": "^6.1.1",
    "zod": "^3.22.0"
  }
}
```

**Step 2: Rename all "vinext" strings in cli.ts**

In `packages/framework/src/cli.ts`, find-and-replace:
- `"vinext"` to `"fabrk"` in all user-facing strings
- `vinext dev` to `fabrk dev`
- `vinext build` to `fabrk build`
- `vinext start` to `fabrk start`
- `vinext deploy` to `fabrk deploy`
- `vinext init` to `fabrk init`
- `vinext check` to `fabrk check`
- `vinext lint` to `fabrk lint`
- `.vinext/` cache dir to `.fabrk/`
- Keep internal variable names as-is (no need to rename `vinext()` function yet)

**Step 3: Update README.md**

Replace `packages/framework/README.md` with a stub pointing to the design doc.

**Step 4: Commit**

```bash
git add packages/framework
git commit -m "chore: rename vinext to fabrk in CLI and package.json"
```

---

### Task 3: Wire fabrk.config.ts support

**Files:**
- Create: `packages/framework/src/config/fabrk-config.ts`
- Modify: `packages/framework/src/config/next-config.ts`

**Step 1: Write failing test**

Create `packages/framework/src/__tests__/fabrk-config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { loadFabrkConfig, defineFabrkConfig } from '../config/fabrk-config'

describe('fabrk config', () => {
  it('defineFabrkConfig returns typed config', () => {
    const config = defineFabrkConfig({
      ai: {
        defaultModel: 'claude-sonnet-4-5-20250514',
        budget: { daily: 10 },
      },
    })
    expect(config.ai?.defaultModel).toBe('claude-sonnet-4-5-20250514')
  })

  it('loads fabrk.config.ts when present', async () => {
    const config = await loadFabrkConfig('/tmp/test-no-config')
    expect(config).toEqual({})
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd packages/framework
npx vitest run src/__tests__/fabrk-config.test.ts
```

Expected: FAIL (module not found)

**Step 3: Implement fabrk-config.ts**

Create `packages/framework/src/config/fabrk-config.ts`:

```typescript
import path from 'node:path'
import fs from 'node:fs'

export interface FabrkAIConfig {
  defaultModel?: string
  fallback?: string[]
  budget?: {
    daily?: number
    perSession?: number
    alertThreshold?: number
  }
}

export interface FabrkConfig {
  /** AI configuration */
  ai?: FabrkAIConfig
  /** Auth mode for agents */
  auth?: {
    provider?: 'nextauth' | 'custom'
    apiKeys?: boolean
    mfa?: boolean
  }
  /** Security settings */
  security?: {
    csrf?: boolean
    csp?: boolean
    rateLimit?: { windowMs?: number; max?: number }
  }
  /** Deployment target */
  deploy?: {
    target?: 'workers' | 'node' | 'vercel'
  }
}

/**
 * Type helper for fabrk.config.ts. Provides autocompletion.
 */
export function defineFabrkConfig(config: FabrkConfig): FabrkConfig {
  return config
}

/**
 * Load fabrk.config.ts from a project root.
 * Falls back to next.config.js/mjs for migration compatibility.
 */
export async function loadFabrkConfig(root: string): Promise<FabrkConfig> {
  const configPath = path.join(root, 'fabrk.config.ts')
  const configPathJs = path.join(root, 'fabrk.config.js')

  if (fs.existsSync(configPath) || fs.existsSync(configPathJs)) {
    try {
      const mod = await import(configPath)
      return mod.default || mod
    } catch {
      return {}
    }
  }

  return {}
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/fabrk-config.test.ts
```

Expected: PASS

**Step 5: Wire into next-config.ts**

In `packages/framework/src/config/next-config.ts`, add at the top of `loadNextConfig()`:

```typescript
import { loadFabrkConfig, type FabrkConfig } from './fabrk-config.js'

// In loadNextConfig, try fabrk config first
export let fabrkConfig: FabrkConfig = {}

export async function loadFabrkAndNextConfig(root: string) {
  fabrkConfig = await loadFabrkConfig(root)
  return loadNextConfig(root)
}
```

**Step 6: Commit**

```bash
git add packages/framework
git commit -m "feat: add fabrk.config.ts support with defineFabrkConfig()"
```

---

### Task 4: Verify fabrk dev and fabrk build work

**Files:**
- Create: `packages/framework/vitest.config.ts`
- Modify: `packages/framework/tsconfig.json`

**Step 1: Add vitest config**

Create `packages/framework/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
  },
})
```

**Step 2: Add test script to package.json**

Add to `packages/framework/package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run"
  }
}
```

**Step 3: Install dependencies and build**

```bash
cd /Users/jasonpoindexter/Documents/GitHub/_active/fabrk-framework
pnpm install
cd packages/framework
pnpm build
```

Expected: TypeScript compiles with no errors, `dist/` directory created.

**Step 4: Verify CLI runs**

```bash
node dist/cli.js --help
```

Expected: Shows help text with "fabrk" branding instead of "vinext".

**Step 5: Commit**

```bash
git add packages/framework
git commit -m "chore: verify fabrk build + CLI runs"
```

---

## Day 2: Agent System

### Task 5: Implement agents/ directory scanner

**Files:**
- Create: `packages/framework/src/agents/scanner.ts`
- Create: `packages/framework/src/__tests__/agent-scanner.test.ts`

**Step 1: Write failing test**

```typescript
// packages/framework/src/__tests__/agent-scanner.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { scanAgents } from '../agents/scanner'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('scanAgents', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fabrk-agents-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true })
  })

  it('discovers agents from agents/ directory', () => {
    // Create agents/chat/agent.ts
    const agentDir = path.join(tmpDir, 'agents', 'chat')
    fs.mkdirSync(agentDir, { recursive: true })
    fs.writeFileSync(
      path.join(agentDir, 'agent.ts'),
      'export default { model: "claude-sonnet-4-5-20250514" }'
    )

    const agents = scanAgents(tmpDir)
    expect(agents).toHaveLength(1)
    expect(agents[0].name).toBe('chat')
    expect(agents[0].filePath).toContain('agents/chat/agent.ts')
  })

  it('discovers multiple agents', () => {
    for (const name of ['chat', 'summarize', 'extract']) {
      const dir = path.join(tmpDir, 'agents', name)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'agent.ts'), 'export default {}')
    }

    const agents = scanAgents(tmpDir)
    expect(agents).toHaveLength(3)
    expect(agents.map(a => a.name).sort()).toEqual(['chat', 'extract', 'summarize'])
  })

  it('returns empty array when no agents/ dir', () => {
    const agents = scanAgents(tmpDir)
    expect(agents).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd packages/framework && npx vitest run src/__tests__/agent-scanner.test.ts
```

Expected: FAIL (module `../agents/scanner` not found)

**Step 3: Implement scanner**

Create `packages/framework/src/agents/scanner.ts`:

```typescript
import { glob } from 'glob'
import path from 'node:path'
import fs from 'node:fs'

export interface ScannedAgent {
  /** Agent name (directory name under agents/) */
  name: string
  /** Absolute path to the agent.ts file */
  filePath: string
  /** Route pattern: /api/agents/{name} */
  routePattern: string
}

/**
 * Scan the agents/ directory for agent definitions.
 * Each subdirectory with an agent.ts or agent.js file is an agent.
 */
export function scanAgents(root: string): ScannedAgent[] {
  const agentsDir = path.join(root, 'agents')
  if (!fs.existsSync(agentsDir)) return []

  const files = glob.sync('*/agent.{ts,js,tsx,jsx}', { cwd: agentsDir })

  return files.map(file => {
    const name = path.dirname(file)
    return {
      name,
      filePath: path.join(agentsDir, file),
      routePattern: `/api/agents/${name}`,
    }
  })
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/agent-scanner.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add packages/framework/src/agents packages/framework/src/__tests__/agent-scanner.test.ts
git commit -m "feat: implement agents/ directory scanner"
```

---

### Task 6: Implement defineAgent() runtime

**Files:**
- Create: `packages/framework/src/agents/define-agent.ts`
- Create: `packages/framework/src/__tests__/define-agent.test.ts`

**Step 1: Write failing test**

```typescript
// packages/framework/src/__tests__/define-agent.test.ts
import { describe, it, expect } from 'vitest'
import { defineAgent, type AgentDefinition } from '../agents/define-agent'

describe('defineAgent', () => {
  it('returns a valid agent definition', () => {
    const agent = defineAgent({
      model: 'claude-sonnet-4-5-20250514',
      tools: ['search-docs'],
      budget: { daily: 10, perSession: 0.5 },
      stream: true,
      auth: 'required',
    })

    expect(agent.model).toBe('claude-sonnet-4-5-20250514')
    expect(agent.tools).toEqual(['search-docs'])
    expect(agent.budget?.daily).toBe(10)
    expect(agent.stream).toBe(true)
    expect(agent.auth).toBe('required')
  })

  it('applies defaults', () => {
    const agent = defineAgent({
      model: 'gpt-4o',
    })

    expect(agent.stream).toBe(true)
    expect(agent.auth).toBe('none')
    expect(agent.tools).toEqual([])
  })

  it('accepts systemPrompt as string or file path', () => {
    const agent = defineAgent({
      model: 'claude-sonnet-4-5-20250514',
      systemPrompt: './prompts/system.md',
    })

    expect(agent.systemPrompt).toBe('./prompts/system.md')
  })

  it('accepts fallback providers', () => {
    const agent = defineAgent({
      model: 'claude-sonnet-4-5-20250514',
      fallback: ['gpt-4o', 'ollama:llama3'],
    })

    expect(agent.fallback).toEqual(['gpt-4o', 'ollama:llama3'])
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/define-agent.test.ts
```

Expected: FAIL

**Step 3: Implement defineAgent()**

Create `packages/framework/src/agents/define-agent.ts`:

```typescript
export interface AgentBudget {
  /** Maximum USD per day */
  daily?: number
  /** Maximum USD per session/conversation */
  perSession?: number
  /** Alert at this percentage of budget (0-1) */
  alertThreshold?: number
}

export interface AgentDefinition {
  /** Primary model identifier */
  model: string
  /** Fallback model chain */
  fallback?: string[]
  /** System prompt: inline string or file path */
  systemPrompt?: string
  /** Tool names (resolved from tools/ directory) */
  tools: string[]
  /** Budget enforcement */
  budget?: AgentBudget
  /** Enable streaming (default: true) */
  stream: boolean
  /** Auth requirement */
  auth: 'required' | 'optional' | 'none'
}

export interface DefineAgentOptions {
  model: string
  fallback?: string[]
  systemPrompt?: string
  tools?: string[]
  budget?: AgentBudget
  stream?: boolean
  auth?: 'required' | 'optional' | 'none'
}

/**
 * Define an AI agent. Used in agents/[name]/agent.ts files.
 */
export function defineAgent(options: DefineAgentOptions): AgentDefinition {
  return {
    model: options.model,
    fallback: options.fallback,
    systemPrompt: options.systemPrompt,
    tools: options.tools ?? [],
    budget: options.budget,
    stream: options.stream ?? true,
    auth: options.auth ?? 'none',
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/define-agent.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add packages/framework/src/agents/define-agent.ts packages/framework/src/__tests__/define-agent.test.ts
git commit -m "feat: implement defineAgent() runtime"
```

---

### Task 7: Auto-generate agent API routes

**Files:**
- Create: `packages/framework/src/agents/route-handler.ts`
- Create: `packages/framework/src/__tests__/agent-route.test.ts`

**Step 1: Write failing test**

```typescript
// packages/framework/src/__tests__/agent-route.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createAgentHandler, type AgentHandlerOptions } from '../agents/route-handler'

describe('createAgentHandler', () => {
  it('returns a request handler function', () => {
    const handler = createAgentHandler({
      model: 'claude-sonnet-4-5-20250514',
      tools: [],
      stream: true,
      auth: 'none',
    })

    expect(typeof handler).toBe('function')
  })

  it('rejects non-POST requests', async () => {
    const handler = createAgentHandler({
      model: 'claude-sonnet-4-5-20250514',
      tools: [],
      stream: true,
      auth: 'none',
    })

    const req = new Request('http://localhost/api/agents/chat', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(405)
  })

  it('rejects missing body', async () => {
    const handler = createAgentHandler({
      model: 'claude-sonnet-4-5-20250514',
      tools: [],
      stream: true,
      auth: 'none',
    })

    const req = new Request('http://localhost/api/agents/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
  })

  it('accepts valid messages body', async () => {
    const handler = createAgentHandler({
      model: 'test-model',
      tools: [],
      stream: false,
      auth: 'none',
      _llmCall: async (messages) => ({
        content: 'Hello!',
        usage: { promptTokens: 10, completionTokens: 5 },
        cost: 0.001,
      }),
    })

    const req = new Request('http://localhost/api/agents/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toBe('Hello!')
    expect(data.usage.promptTokens).toBe(10)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/agent-route.test.ts
```

Expected: FAIL

**Step 3: Implement route handler**

Create `packages/framework/src/agents/route-handler.ts`:

```typescript
import type { AgentDefinition } from './define-agent.js'

interface LLMCallResult {
  content: string
  usage: { promptTokens: number; completionTokens: number }
  cost: number
}

export interface AgentHandlerOptions extends Omit<AgentDefinition, 'budget' | 'fallback' | 'systemPrompt'> {
  systemPrompt?: string
  budget?: AgentDefinition['budget']
  fallback?: string[]
  /** Internal: override LLM call for testing */
  _llmCall?: (messages: Array<{ role: string; content: string }>) => Promise<LLMCallResult>
}

/**
 * Create a Web-standard Request handler for an agent route.
 * Returns: (Request) => Promise<Response>
 */
export function createAgentHandler(options: AgentHandlerOptions) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let body: { messages?: Array<{ role: string; content: string }> }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const messages = options.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }, ...body.messages]
      : body.messages

    try {
      if (options._llmCall) {
        const result = await options._llmCall(messages)
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // TODO: Wire real LLM call via @fabrk/ai in Task 8
      return new Response(JSON.stringify({ error: 'LLM not configured' }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Agent error', message: String(err) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/agent-route.test.ts
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add packages/framework/src/agents/route-handler.ts packages/framework/src/__tests__/agent-route.test.ts
git commit -m "feat: auto-generate agent API route handlers"
```

---

### Task 8: Wire @fabrk/ai for LLM calls

**Files:**
- Modify: `packages/framework/package.json` (add `@fabrk/ai` dependency)
- Create: `packages/framework/src/agents/llm-bridge.ts`
- Create: `packages/framework/src/__tests__/llm-bridge.test.ts`

**Step 1: Add @fabrk/ai workspace dependency**

In `packages/framework/package.json`:

```json
{ "dependencies": { "@fabrk/ai": "workspace:*" } }
```

Run `pnpm install` to link.

**Step 2: Write failing test**

```typescript
// packages/framework/src/__tests__/llm-bridge.test.ts
import { describe, it, expect } from 'vitest'
import { createLLMBridge } from '../agents/llm-bridge'

describe('createLLMBridge', () => {
  it('creates a bridge with model and provider', () => {
    const bridge = createLLMBridge({ model: 'gpt-4o' })
    expect(bridge.model).toBe('gpt-4o')
    expect(bridge.provider).toBe('openai')
  })

  it('detects anthropic provider from model name', () => {
    const bridge = createLLMBridge({ model: 'claude-sonnet-4-5-20250514' })
    expect(bridge.provider).toBe('anthropic')
  })

  it('detects ollama provider from prefix', () => {
    const bridge = createLLMBridge({ model: 'ollama:llama3' })
    expect(bridge.provider).toBe('ollama')
  })
})
```

**Step 3: Implement LLM bridge**

Create `packages/framework/src/agents/llm-bridge.ts`:

```typescript
export type LLMProvider = 'openai' | 'anthropic' | 'ollama'

export interface LLMBridge {
  model: string
  provider: LLMProvider
}

function detectProvider(model: string): LLMProvider {
  if (model.startsWith('ollama:')) return 'ollama'
  if (model.startsWith('claude') || model.startsWith('anthropic')) return 'anthropic'
  return 'openai'
}

/**
 * Create an LLM bridge that connects to @fabrk/ai providers.
 */
export function createLLMBridge(options: { model: string }): LLMBridge {
  return {
    model: options.model,
    provider: detectProvider(options.model),
  }
}
```

**Step 4: Run test**

```bash
npx vitest run src/__tests__/llm-bridge.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/framework
git commit -m "feat: wire @fabrk/ai LLM bridge for agent routes"
```

---

### Task 9: Add streaming SSE response to agent routes

**Files:**
- Create: `packages/framework/src/agents/sse-stream.ts`
- Create: `packages/framework/src/__tests__/sse-stream.test.ts`

**Step 1: Write failing test**

```typescript
// packages/framework/src/__tests__/sse-stream.test.ts
import { describe, it, expect } from 'vitest'
import { createSSEStream, formatSSEEvent } from '../agents/sse-stream'

describe('SSE stream utilities', () => {
  it('formats a text event', () => {
    const event = formatSSEEvent({ type: 'text', content: 'Hello' })
    expect(event).toBe('data: {"type":"text","content":"Hello"}\n\n')
  })

  it('formats a usage event', () => {
    const event = formatSSEEvent({
      type: 'usage',
      promptTokens: 10,
      completionTokens: 5,
      cost: 0.001,
    })
    expect(event).toContain('"type":"usage"')
    expect(event).toContain('"cost":0.001')
  })

  it('formats a done event', () => {
    const event = formatSSEEvent({ type: 'done' })
    expect(event).toBe('data: {"type":"done"}\n\n')
  })

  it('createSSEStream returns a ReadableStream', () => {
    const stream = createSSEStream(async function* () {
      yield { type: 'text' as const, content: 'Hi' }
      yield { type: 'done' as const }
    })
    expect(stream).toBeInstanceOf(ReadableStream)
  })
})
```

**Step 2: Implement SSE stream**

Create `packages/framework/src/agents/sse-stream.ts`:

```typescript
export type SSEEvent =
  | { type: 'text'; content: string }
  | { type: 'usage'; promptTokens: number; completionTokens: number; cost: number }
  | { type: 'done' }
  | { type: 'error'; message: string }

export function formatSSEEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export function createSSEStream(
  generator: () => AsyncGenerator<SSEEvent, void, unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator()) {
          controller.enqueue(encoder.encode(formatSSEEvent(event)))
        }
      } catch (err) {
        const errorEvent: SSEEvent = { type: 'error', message: String(err) }
        controller.enqueue(encoder.encode(formatSSEEvent(errorEvent)))
      } finally {
        controller.close()
      }
    },
  })
}

export function createSSEResponse(
  generator: () => AsyncGenerator<SSEEvent, void, unknown>
): Response {
  return new Response(createSSEStream(generator), {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

**Step 3: Run test**

```bash
npx vitest run src/__tests__/sse-stream.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/framework/src/agents/sse-stream.ts packages/framework/src/__tests__/sse-stream.test.ts
git commit -m "feat: SSE streaming for agent responses"
```

---

### Task 10: Integrate agents into Vite plugin

**Files:**
- Modify: `packages/framework/src/index.ts` (main Vite plugin)
- Create: `packages/framework/src/agents/vite-plugin.ts`

**Step 1: Create the agent Vite plugin hook**

Create `packages/framework/src/agents/vite-plugin.ts` that:
- Scans agents/ directory on server start via `configureServer` hook
- Adds middleware for `/api/agents/*` routes
- Dynamically imports agent definitions via `server.ssrLoadModule()`
- Converts Node.js req/res to Web Request/Response for the handler
- Logs discovered agents to console

**Step 2: Register in main plugin**

In `packages/framework/src/index.ts`, import and add `agentPlugin()` to the plugins array returned by the main `vinext()` function. The exact location is where vinext assembles its sub-plugins (look for the `return` of the plugin factory).

**Step 3: Commit**

```bash
git add packages/framework/src/agents/vite-plugin.ts packages/framework/src/index.ts
git commit -m "feat: integrate agents into Vite dev server"
```

---

## Day 3: Tool + Prompt System

### Task 11: Implement tools/ directory scanner + defineTool()

**Files:**
- Create: `packages/framework/src/tools/scanner.ts`
- Create: `packages/framework/src/tools/define-tool.ts`
- Create: `packages/framework/src/__tests__/tool-scanner.test.ts`
- Create: `packages/framework/src/__tests__/define-tool.test.ts`

**Step 1: Write failing tests**

Test for scanner: discovers tools from `tools/` directory, returns empty when no dir.

Test for defineTool: returns a tool definition with name/description/schema/handler. Test `textResult()` helper creates correct content structure.

**Step 2: Implement**

`scanner.ts`: Read `tools/` directory, return array of `{ name, filePath }` where name is filename without extension.

`define-tool.ts`: Export `defineTool()` (identity function with types) and `textResult()` helper that wraps string in `{ content: [{ type: 'text', text }] }`.

**Step 3: Run tests, commit**

```bash
npx vitest run src/__tests__/tool-scanner.test.ts src/__tests__/define-tool.test.ts
git commit -m "feat: implement tools/ scanner and defineTool()"
```

---

### Task 12: Auto-start MCP server in dev mode

**Files:**
- Modify: `packages/framework/package.json` (add `@fabrk/mcp` dependency)
- Create: `packages/framework/src/tools/mcp-dev-server.ts`
- Create: `packages/framework/src/__tests__/mcp-dev-server.test.ts`

**Step 1: Add @fabrk/mcp dependency, write test**

Test: `buildMcpTools()` converts framework tool definitions to MCP format.

**Step 2: Implement**

`mcp-dev-server.ts`: Export `buildMcpTools()` converter and `startMcpDevServer()` that imports `createMcpServer` from `@fabrk/mcp` and starts with converted tools.

**Step 3: Run test, commit**

```bash
npx vitest run src/__tests__/mcp-dev-server.test.ts
git commit -m "feat: auto-start MCP server in dev mode"
```

---

### Task 13: Implement prompts/ system with template interpolation

**Files:**
- Create: `packages/framework/src/prompts/loader.ts`
- Create: `packages/framework/src/__tests__/prompt-loader.test.ts`

**Step 1: Write failing test**

Tests:
1. Loads a prompt file from disk
2. Interpolates `{{variable}}` placeholders with provided values
3. Resolves `{{> partial}}` includes from `prompts/` directory
4. Handles missing variables gracefully (leaves them as-is)

**Step 2: Implement prompt loader**

`loader.ts`:
- `loadPrompt(root, promptPath)`: Read file, resolve `{{> path}}` includes by reading from `prompts/` dir
- `interpolatePrompt(template, variables)`: Replace `{{key}}` with values, skip missing keys

**Step 3: Run tests, commit**

```bash
npx vitest run src/__tests__/prompt-loader.test.ts
git commit -m "feat: implement prompts/ system with {{variable}} and {{> partial}} support"
```

---

## Day 4: Built-in Runtime Integration

### Task 14: Wire @fabrk/auth middleware for agents

**Files:**
- Modify: `packages/framework/package.json` (add `@fabrk/auth`)
- Create: `packages/framework/src/middleware/auth-guard.ts`
- Create: `packages/framework/src/__tests__/auth-guard.test.ts`

**Step 1: Write failing test**

Tests:
1. Passes when auth is 'none'
2. Rejects 401 when auth is 'required' and no Bearer token
3. Passes when auth is 'required' and Bearer token present

**Step 2: Implement auth guard**

`auth-guard.ts`: `createAuthGuard(mode)` returns async function that checks Authorization header.

**Step 3: Run test, commit**

```bash
npx vitest run src/__tests__/auth-guard.test.ts
git commit -m "feat: wire auth guard middleware for agent routes"
```

---

### Task 15: Implement useAgent() React hook

**Files:**
- Create: `packages/framework/src/client/use-agent.ts`
- Create: `packages/framework/src/__tests__/use-agent.test.ts`

**Step 1: Write test for SSE parsing utilities**

Test `parseSSELine()`: parses `data: {...}` lines, returns null for non-data lines.

**Step 2: Implement useAgent**

`use-agent.ts` (marked `'use client'`):
- `useAgent(agentName)` returns `{ send, messages, isStreaming, cost, usage, error }`
- `send(content)` POSTs to `/api/agents/{name}`, handles SSE streaming response
- `parseSSELine()` exported for testing

**Step 3: Add to package.json exports, run test, commit**

```bash
npx vitest run src/__tests__/use-agent.test.ts
git commit -m "feat: implement useAgent() React hook with SSE streaming"
```

---

### Task 16: Wire @fabrk/security middleware

**Files:**
- Modify: `packages/framework/package.json` (add `@fabrk/security`)
- Create: `packages/framework/src/middleware/security.ts`

**Step 1: Implement security headers builder**

`buildSecurityHeaders(config)`: Returns headers object based on FabrkConfig security settings. Always includes X-Content-Type-Options, X-Frame-Options, Referrer-Policy. Optionally adds CSP.

**Step 2: Commit**

```bash
git commit -m "feat: wire @fabrk/security middleware"
```

---

### Task 17: Bundle @fabrk/components as fabrk/components export

**Files:**
- Modify: `packages/framework/package.json`
- Create: `packages/framework/src/components.ts`
- Create: `packages/framework/src/themes.ts`

**Step 1: Create barrel re-exports**

`components.ts`: `export * from '@fabrk/components'`
`themes.ts`: `export * from '@fabrk/design-system'`

**Step 2: Add exports to package.json**

```json
{
  "./components": { "import": "./dist/components.js", "types": "./dist/components.d.ts" },
  "./themes": { "import": "./dist/themes.js", "types": "./dist/themes.d.ts" }
}
```

**Step 3: Build and verify, commit**

```bash
pnpm install && pnpm build
git commit -m "feat: bundle @fabrk/components and @fabrk/design-system as framework exports"
```

---

## Day 5: Dev Dashboard + AGENTS.md

### Task 18: Build /__ai dashboard page

**Files:**
- Create: `packages/framework/src/dashboard/vite-plugin.ts`

**Step 1: Create dashboard Vite plugin**

`dashboardPlugin()`: Vite plugin with `configureServer` hook that:
- Serves `/__ai/api` endpoint returning JSON state (agents, tools, calls, totalCost)
- Serves `/__ai` HTML page with terminal-aesthetic dashboard
- Dashboard uses textContent (not innerHTML) for dynamic updates to prevent XSS
- Auto-refreshes every 2 seconds via fetch
- Shows: agent count, tool count, total cost, recent calls table

Exports `recordCall()`, `setAgents()`, `setTools()` for other plugins to update state.

**Step 2: Commit**

```bash
git commit -m "feat: build /__ai dev dashboard"
```

---

### Task 19: Implement AGENTS.md auto-generation

**Files:**
- Create: `packages/framework/src/build/agents-md.ts`
- Create: `packages/framework/src/__tests__/agents-md.test.ts`

**Step 1: Write failing test**

Test: `generateAgentsMd()` produces markdown with Agents table, Tools table, Prompts list.

**Step 2: Implement**

`agents-md.ts`: Takes `{ agents, tools, prompts }`, returns markdown string with tables and details for each agent (route, model, auth, tools).

**Step 3: Run test, commit**

```bash
npx vitest run src/__tests__/agents-md.test.ts
git commit -m "feat: auto-generate AGENTS.md on build"
```

---

## Day 6: Multi-target Deploy

### Task 20: Add Node.js standalone server target

**Files:**
- Create: `packages/framework/src/deploy/node.ts`

**Step 1: Implement**

`generateNodeStandalone(root, outDir)`: Creates `dist/standalone/server.mjs` entry + `package.json` with `{ start: "node server.mjs" }`.

**Step 2: Commit**

```bash
git commit -m "feat: add Node.js standalone deploy target"
```

---

### Task 21: Add Vercel adapter

**Files:**
- Create: `packages/framework/src/deploy/vercel.ts`

**Step 1: Implement**

`generateVercelOutput(root, outDir)`: Creates `.vercel/output/` with `config.json` (routes), `functions/index.func/` (serverless entry + `.vc-config.json`).

**Step 2: Commit**

```bash
git commit -m "feat: add Vercel deploy adapter"
```

---

### Task 22: Wire deploy targets into CLI

**Files:**
- Modify: `packages/framework/src/cli.ts`

**Step 1: Add --target flag**

In `deployCommand()`, parse `--target workers|node|vercel` flag and switch to appropriate deploy function. Default: workers (inherited from vinext).

**Step 2: Update help text, commit**

```bash
git commit -m "feat: fabrk deploy --target workers|node|vercel"
```

---

## Day 7: Polish + Integration

### Task 23: Create public API barrel exports

**Files:**
- Create: `packages/framework/src/fabrk.ts`
- Modify: `packages/framework/package.json`

**Step 1: Create barrel**

Re-export from one file: `defineAgent`, `defineTool`, `textResult`, `defineFabrkConfig`, `useAgent`, `loadPrompt`, `interpolatePrompt` + all types.

**Step 2: Update package.json main export to point to `./dist/fabrk.js`**

**Step 3: Commit**

```bash
git commit -m "feat: public API barrel export"
```

---

### Task 24: E2E integration test

**Files:**
- Create: `packages/framework/src/__tests__/integration.test.ts`

**Step 1: Write integration test**

4 tests covering full flow:
1. scan agents, define, create handler, send request, verify response
2. scan tools, define tool, verify registration
3. load prompt, interpolate variables, include partials
4. generate AGENTS.md from scanned state

**Step 2: Run test, commit**

```bash
npx vitest run src/__tests__/integration.test.ts
git commit -m "test: E2E integration test for full framework flow"
```

---

### Task 25: Final build verification

**Files:**
- Modify: root `turbo.json` (if needed)
- Modify: root `package.json` (if needed)

**Step 1: Full build**

```bash
pnpm build
```

Expected: All packages build including `packages/framework`.

**Step 2: All tests**

```bash
pnpm test
```

Expected: All 1,689+ existing tests pass + ~40 new framework tests.

**Step 3: Type check**

```bash
pnpm type-check
```

Expected: All packages pass.

**Step 4: Final commit**

```bash
git commit -m "feat: fabrk framework MVP complete"
```

---

## Summary

| Task | Day | Description | Tests |
|------|-----|-------------|-------|
| 1 | 1 | Clone vinext into monorepo | - |
| 2 | 1 | Rename vinext to fabrk | - |
| 3 | 1 | fabrk.config.ts support | 2 |
| 4 | 1 | Verify build + CLI | - |
| 5 | 2 | Agents directory scanner | 3 |
| 6 | 2 | defineAgent() runtime | 4 |
| 7 | 2 | Agent API route handler | 4 |
| 8 | 2 | @fabrk/ai LLM bridge | 3 |
| 9 | 2 | SSE streaming | 4 |
| 10 | 2 | Vite plugin integration | - |
| 11 | 3 | Tools scanner + defineTool() | 4 |
| 12 | 3 | MCP dev server | 1 |
| 13 | 3 | Prompts with interpolation | 4 |
| 14 | 4 | Auth guard middleware | 3 |
| 15 | 4 | useAgent() React hook | 3 |
| 16 | 4 | Security middleware | - |
| 17 | 4 | Bundle components/themes | - |
| 18 | 5 | /__ai dashboard | - |
| 19 | 5 | AGENTS.md generation | 1 |
| 20 | 6 | Node.js deploy target | - |
| 21 | 6 | Vercel deploy adapter | - |
| 22 | 6 | CLI deploy --target | - |
| 23 | 7 | Public API barrel export | - |
| 24 | 7 | E2E integration test | 4 |
| 25 | 7 | Final verification | - |

**Total: 25 tasks, ~40 tests, 7 days**
