import { describe, it, expect, vi, afterEach } from "vitest";
import { createA2AServer } from "../agents/a2a/server.js";
import { A2AClient, A2AClientError } from "../agents/a2a/client.js";
import type { A2AAgentCard, A2ATask, A2ATaskResult } from "../agents/a2a/types.js";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeServer(overrides: Partial<Parameters<typeof createA2AServer>[0]> = {}) {
  return createA2AServer({
    baseUrl: 'http://localhost:3000',
    agents: {
      echo: {
        name: 'echo',
        description: 'Echoes input',
        execute: async (input) => `echo: ${input}`,
      },
      fail: {
        name: 'fail',
        description: 'Always fails',
        execute: async () => { throw new Error('agent failure'); },
      },
    },
    ...overrides,
  });
}

function makeRequest(path: string, options: RequestInit = {}) {
  return new Request(`http://localhost:3000${path}`, options);
}

// ---------------------------------------------------------------------------
// A2A Server tests
// ---------------------------------------------------------------------------

describe("A2A Server", () => {
  it("GET /.well-known/agent.json returns 200 with a valid agent card", async () => {
    const handler = makeServer({ name: 'TestNet', description: 'Test agent network', version: '2.0' });
    const resp = await handler(makeRequest('/.well-known/agent.json'));

    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(200);
    expect(resp!.headers.get('Content-Type')).toBe('application/json');

    const card: A2AAgentCard = await resp!.json();
    expect(card.name).toBe('TestNet');
    expect(card.description).toBe('Test agent network');
    expect(card.version).toBe('2.0');
    expect(card.url).toBe('http://localhost:3000');
    expect(card).toHaveProperty('capabilities');
  });

  it("agent card capabilities.streaming is true", async () => {
    const handler = makeServer();
    const resp = await handler(makeRequest('/.well-known/agent.json'));
    const card: A2AAgentCard = await resp!.json();
    expect(card.capabilities.streaming).toBe(true);
  });

  it("agent card capabilities.tools lists all registered agent names", async () => {
    const handler = makeServer();
    const resp = await handler(makeRequest('/.well-known/agent.json'));
    const card: A2AAgentCard = await resp!.json();
    expect(card.capabilities.tools).toEqual(expect.arrayContaining(['echo', 'fail']));
    expect(card.capabilities.tools).toHaveLength(2);
  });

  it("POST / with valid task returns completed status and artifacts", async () => {
    const handler = makeServer();
    const task: A2ATask = {
      id: 'task-001',
      message: { role: 'user', parts: [{ text: '@echo hello world' }] },
    };
    const resp = await handler(makeRequest('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    }));

    expect(resp).not.toBeNull();
    expect(resp!.status).toBe(200);

    const result: A2ATaskResult = await resp!.json();
    expect(result.id).toBe('task-001');
    expect(result.status).toBe('completed');
    expect(result.artifacts).toBeDefined();
    expect(result.artifacts![0].parts[0].text).toBe('echo: hello world');
  });

  it("POST / falls back to first agent when no @mention is provided", async () => {
    const handler = makeServer();
    const task: A2ATask = {
      id: 'task-002',
      message: { role: 'user', parts: [{ text: 'just a plain message' }] },
    };
    const resp = await handler(makeRequest('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    }));

    const result: A2ATaskResult = await resp!.json();
    expect(result.status).toBe('completed');
    expect(result.artifacts![0].parts[0].text).toBe('echo: just a plain message');
  });

  it("POST / with unknown agent name returns 404 with failed status", async () => {
    const handler = makeServer();
    const task: A2ATask = {
      id: 'task-003',
      message: { role: 'user', parts: [{ text: '@nonexistent do something' }] },
    };
    const resp = await handler(makeRequest('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    }));

    expect(resp!.status).toBe(404);
    const result: A2ATaskResult = await resp!.json();
    expect(result.status).toBe('failed');
    expect(result.error?.message).toContain('nonexistent');
  });

  it("POST / when agent.execute throws returns 500 with failed status", async () => {
    const handler = makeServer();
    const task: A2ATask = {
      id: 'task-004',
      message: { role: 'user', parts: [{ text: '@fail do it' }] },
    };
    const resp = await handler(makeRequest('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    }));

    expect(resp!.status).toBe(500);
    const result: A2ATaskResult = await resp!.json();
    expect(result.status).toBe('failed');
    expect(result.error?.message).toBe('Task execution failed');
  });

  it("POST / with invalid JSON returns 400", async () => {
    const handler = makeServer();
    const resp = await handler(makeRequest('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    }));

    expect(resp!.status).toBe(400);
  });

  it("POST / with missing task.id returns 400", async () => {
    const handler = makeServer();
    const resp = await handler(makeRequest('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { role: 'user', parts: [{ text: 'hi' }] } }),
    }));

    expect(resp!.status).toBe(400);
  });

  it("returns null for unrecognized routes", async () => {
    const handler = makeServer();
    const resp = await handler(makeRequest('/some/other/path'));
    expect(resp).toBeNull();
  });

  it("uses default name/description/version when not specified", async () => {
    const handler = makeServer({ name: undefined, description: undefined, version: undefined });
    const resp = await handler(makeRequest('/.well-known/agent.json'));
    const card: A2AAgentCard = await resp!.json();
    expect(typeof card.name).toBe('string');
    expect(typeof card.description).toBe('string');
    expect(card.version).toBe('1.0');
  });

  it("sessionId is forwarded to agent.execute", async () => {
    const executeSpy = vi.fn(async () => 'ok');
    const handler = createA2AServer({
      baseUrl: 'http://localhost:3000',
      agents: { spy: { name: 'spy', execute: executeSpy } },
    });
    const task: A2ATask = {
      id: 'task-session',
      message: { role: 'user', parts: [{ text: '@spy test' }] },
      sessionId: 'sess-abc',
    };
    await handler(makeRequest('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    }));
    expect(executeSpy).toHaveBeenCalledWith('test', 'sess-abc');
  });
});

// ---------------------------------------------------------------------------
// A2A Client tests
// ---------------------------------------------------------------------------

describe("A2AClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("discover() fetches GET /.well-known/agent.json and parses the card", async () => {
    const card: A2AAgentCard = {
      name: 'Remote Agent',
      description: 'Handles tasks',
      version: '1.0',
      capabilities: { streaming: true, tools: ['echo'] },
      url: 'https://remote.example.com',
    };

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(card), { status: 200 })));

    const client = new A2AClient('https://remote.example.com');
    const result = await client.discover();

    expect(fetch).toHaveBeenCalledWith('https://remote.example.com/.well-known/agent.json');
    expect(result.name).toBe('Remote Agent');
    expect(result.capabilities.streaming).toBe(true);
  });

  it("discover() throws A2AClientError when server returns non-200", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));

    const client = new A2AClient('https://remote.example.com');
    await expect(client.discover()).rejects.toThrow(A2AClientError);
    await expect(client.discover()).rejects.toMatchObject({ status: 404 });
  });

  it("sendTask() sends POST with a generated id and returns the result", async () => {
    const resultPayload: A2ATaskResult = {
      id: 'generated-id',
      status: 'completed',
      artifacts: [{ parts: [{ text: 'done' }] }],
    };

    const mockFetch = vi.fn(async (_url: string, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string) as A2ATask;
      // Reflect the id the client sent back in the response
      resultPayload.id = body.id;
      return new Response(JSON.stringify(resultPayload), { status: 200 });
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new A2AClient('https://remote.example.com');
    const result = await client.sendTask({
      message: { role: 'user', parts: [{ text: 'Hello' }] },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://remote.example.com',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.status).toBe('completed');
    expect(result.id).toBeTruthy(); // auto-generated UUID
    expect(result.artifacts![0].parts[0].text).toBe('done');
  });

  it("sendTask() throws A2AClientError when server returns non-200", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Server Error', { status: 500 })));

    const client = new A2AClient('https://remote.example.com');
    await expect(
      client.sendTask({ message: { role: 'user', parts: [{ text: 'hi' }] } })
    ).rejects.toThrow(A2AClientError);
    await expect(
      client.sendTask({ message: { role: 'user', parts: [{ text: 'hi' }] } })
    ).rejects.toMatchObject({ status: 500 });
  });

  it("constructor rejects non-http/https scheme", () => {
    expect(() => new A2AClient('ftp://example.com')).toThrow('Invalid A2A base URL scheme');
    expect(() => new A2AClient('javascript:alert(1)')).toThrow();
    expect(() => new A2AClient('file:///etc/passwd')).toThrow('Invalid A2A base URL scheme');
  });

  it("constructor rejects unparseable URL strings", () => {
    expect(() => new A2AClient('not-a-url')).toThrow('Invalid A2A base URL');
  });

  it("constructor accepts valid http and https URLs", () => {
    expect(() => new A2AClient('http://localhost:3000')).not.toThrow();
    expect(() => new A2AClient('https://remote.example.com')).not.toThrow();
  });

  it("A2AClientError captures the status code", () => {
    const err = new A2AClientError('test error', 403);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(A2AClientError);
    expect(err.name).toBe('A2AClientError');
    expect(err.message).toBe('test error');
    expect(err.status).toBe(403);
  });

  it("sendTask() includes Content-Type application/json header", async () => {
    const mockFetch = vi.fn(async (_url: string, opts: RequestInit) => {
      expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      const result: A2ATaskResult = { id: 'x', status: 'completed', artifacts: [{ parts: [{ text: 'ok' }] }] };
      return new Response(JSON.stringify(result), { status: 200 });
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new A2AClient('https://remote.example.com');
    await client.sendTask({ message: { role: 'user', parts: [{ text: 'test' }] } });
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
