import { describe, it, expect, beforeEach } from "vitest";
import type { EventEmitter } from "node:events";

// ---------------------------------------------------------------------------
// Helpers — minimal mock of ServerResponse used by the Connect middleware
// ---------------------------------------------------------------------------

interface MockResponse {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: string;
  flushed: boolean;
  ended: boolean;
  _listeners: Record<string, Array<() => void>>;
  setHeader(name: string, value: string): void;
  write(data: string): boolean;
  end(data?: string): void;
  flushHeaders(): void;
  on(event: string, cb: () => void): MockResponse;
  emit(event: string): void;
}

function makeMockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    body: "",
    flushed: false,
    ended: false,
    _listeners: {},
    setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; },
    write(data: string) { this.body += data; return true; },
    end(data?: string) { if (data) this.body += data; this.ended = true; },
    flushHeaders() { this.flushed = true; },
    on(event: string, cb: () => void) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(cb);
      return this;
    },
    emit(event: string) {
      (this._listeners[event] ?? []).forEach((cb) => cb());
    },
  };
  return res;
}

interface MockRequest {
  url: string;
  method: string;
  socket: { remoteAddress: string };
}

function makeMockReq(url: string, method = "GET"): MockRequest {
  return { url, method, socket: { remoteAddress: "127.0.0.1" } };
}

// ---------------------------------------------------------------------------
// Access module internals via the Vite plugin's configureServer hook
// ---------------------------------------------------------------------------

type DashboardModule = typeof import("../dashboard/vite-plugin");

// The plugin uses module-level state (sinks, calls, etc.). We call the
// middleware handler directly by extracting it from configureServer.
type ConnectHandler = (req: unknown, res: unknown, next: () => void) => void;

async function getHandler(): Promise<ConnectHandler> {
  const mod: DashboardModule = await import("../dashboard/vite-plugin");
  const plugin = mod.dashboardPlugin();

  let handler: ConnectHandler | undefined;
  const fakeServer = {
    middlewares: {
      use(fn: ConnectHandler) { handler = fn; },
    },
  };

  // configureServer may be a bare function or an ObjectHook with { handler, order }.
  // Cast through unknown to avoid TS narrowing issues.
  const cs = plugin.configureServer as unknown;
  const configureFn: ((server: unknown) => unknown) | undefined =
    typeof cs === "function"
      ? (cs as (server: unknown) => unknown)
      : typeof (cs as Record<string, unknown>)?.handler === "function"
        ? ((cs as Record<string, unknown>).handler as (server: unknown) => unknown)
        : undefined;
  if (!configureFn) throw new Error("configureServer is not callable");
  const setup = configureFn(fakeServer);
  if (typeof setup === "function") (setup as () => void)();

  if (!handler) throw new Error("Middleware handler not registered");
  return handler;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("dashboard SSE — /__ai/events", () => {
  it("returns 200 with Content-Type: text/event-stream", async () => {
    const handler = await getHandler();
    const req = makeMockReq("/__ai/events");
    const res = makeMockRes();
    let nextCalled = false;
    handler(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/event-stream");
    expect(res.headers["cache-control"]).toBe("no-cache");
    expect(res.flushed).toBe(true);
    expect(res.ended).toBe(false); // connection must stay open

    // Cleanup — trigger close to remove from sinks
    res.emit("close");
  });

  it("emits call-recorded SSE event when recordCall is called after connecting", async () => {
    const handler = await getHandler();
    const mod: DashboardModule = await import("../dashboard/vite-plugin");

    const req = makeMockReq("/__ai/events");
    const res = makeMockRes();
    handler(req, res, () => {});

    mod.recordCall({
      id: "sse-test-id-1",
      timestamp: Date.now(),
      agent: "sse-agent",
      model: "gpt-4o",
      tokens: 50,
      cost: 0.005,
      outputText: "Hello from SSE",
      inputMessages: [{ role: "user", content: "SSE test" }],
    });

    expect(res.body).toContain("call-recorded");
    expect(res.body).toContain("sse-agent");
    expect(res.body.startsWith("data: ")).toBe(true);

    // Cleanup
    res.emit("close");
  });

  it("enforces max 5 concurrent SSE connections (6th returns 429)", async () => {
    const handler = await getHandler();
    const connections: MockResponse[] = [];

    // Establish 5 connections
    for (let i = 0; i < 5; i++) {
      const req = makeMockReq("/__ai/events");
      const res = makeMockRes();
      handler(req, res, () => {});
      expect(res.statusCode).toBe(200);
      connections.push(res);
    }

    // 6th connection must be rejected
    const rejectedReq = makeMockReq("/__ai/events");
    const rejectedRes = makeMockRes();
    handler(rejectedReq, rejectedRes, () => {});
    expect(rejectedRes.statusCode).toBe(429);
    expect(rejectedRes.ended).toBe(true);

    // Cleanup all connections
    connections.forEach((r) => r.emit("close"));
  });

  it("removes sink from set when connection closes", async () => {
    const handler = await getHandler();
    const mod: DashboardModule = await import("../dashboard/vite-plugin");

    const req = makeMockReq("/__ai/events");
    const res = makeMockRes();
    handler(req, res, () => {});

    // Close the connection
    res.emit("close");
    const bodyBefore = res.body;

    // recordCall should not write to a closed sink
    mod.recordCall({
      timestamp: Date.now(),
      agent: "after-close",
      model: "gpt-4o",
      tokens: 10,
      cost: 0.001,
    });

    // Body should not have grown (sink was removed)
    expect(res.body).toBe(bodyBefore);
  });
});

describe("dashboard dataset — /__ai/api/dataset", () => {
  it("returns valid JSON with name, version, cases, createdAt fields", async () => {
    const handler = await getHandler();
    const mod: DashboardModule = await import("../dashboard/vite-plugin");

    mod.recordCall({
      id: "ds-base-1",
      timestamp: Date.now(),
      agent: "ds-agent",
      model: "gpt-4o",
      tokens: 100,
      cost: 0.01,
      inputMessages: [{ role: "user", content: "Hello dataset" }],
      outputText: "Dataset response",
    });

    const req = makeMockReq("/__ai/api/dataset");
    const res = makeMockRes();
    handler(req, res, () => {});

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/json");
    expect(res.ended).toBe(true);

    const body = JSON.parse(res.body);
    expect(typeof body.name).toBe("string");
    expect(body.version).toBe(1);
    expect(Array.isArray(body.cases)).toBe(true);
    expect(typeof body.createdAt).toBe("string");
  });

  it("filters records by agent when ?agent= is provided", async () => {
    const handler = await getHandler();
    const mod: DashboardModule = await import("../dashboard/vite-plugin");

    mod.recordCall({
      id: "filter-foo-1",
      timestamp: Date.now(),
      agent: "foo-agent",
      model: "gpt-4o",
      tokens: 10,
      cost: 0.001,
      inputMessages: [{ role: "user", content: "foo query" }],
      outputText: "foo answer",
    });

    mod.recordCall({
      id: "filter-bar-1",
      timestamp: Date.now(),
      agent: "bar-agent",
      model: "gpt-4o",
      tokens: 10,
      cost: 0.001,
      inputMessages: [{ role: "user", content: "bar query" }],
      outputText: "bar answer",
    });

    const req = makeMockReq("/__ai/api/dataset?agent=foo-agent");
    const res = makeMockRes();
    handler(req, res, () => {});

    const body = JSON.parse(res.body);
    expect(body.name).toBe("foo-agent-traces");
    // Every case should come from foo-agent
    for (const c of body.cases) {
      expect(c.input).not.toContain("bar query");
    }
  });

  it("respects ?limit= parameter", async () => {
    const handler = await getHandler();
    const mod: DashboardModule = await import("../dashboard/vite-plugin");

    // Insert 10 records with output
    for (let i = 0; i < 10; i++) {
      mod.recordCall({
        timestamp: Date.now(),
        agent: "limit-agent",
        model: "gpt-4o",
        tokens: 5,
        cost: 0.0001,
        inputMessages: [{ role: "user", content: `limit query ${i}` }],
        outputText: `limit answer ${i}`,
      });
    }

    const req = makeMockReq("/__ai/api/dataset?agent=limit-agent&limit=3");
    const res = makeMockRes();
    handler(req, res, () => {});

    const body = JSON.parse(res.body);
    expect(body.cases.length).toBeLessThanOrEqual(3);
  });

  it("dataset cases[].input uses last user message content", async () => {
    const handler = await getHandler();
    const mod: DashboardModule = await import("../dashboard/vite-plugin");

    mod.recordCall({
      id: "input-test-1",
      timestamp: Date.now(),
      agent: "input-agent",
      model: "gpt-4o",
      tokens: 30,
      cost: 0.003,
      inputMessages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "First user message" },
        { role: "assistant", content: "First reply" },
        { role: "user", content: "Last user message" },
      ],
      outputText: "Final output",
    });

    const req = makeMockReq("/__ai/api/dataset?agent=input-agent");
    const res = makeMockRes();
    handler(req, res, () => {});

    const body = JSON.parse(res.body);
    const matchingCase = body.cases.find((c: { input: string }) => c.input === "Last user message");
    expect(matchingCase).toBeDefined();
  });

  it("dataset cases[].expectedOutput uses outputText", async () => {
    const handler = await getHandler();
    const mod: DashboardModule = await import("../dashboard/vite-plugin");

    mod.recordCall({
      id: "output-test-1",
      timestamp: Date.now(),
      agent: "output-agent",
      model: "gpt-4o",
      tokens: 20,
      cost: 0.002,
      inputMessages: [{ role: "user", content: "output test query" }],
      outputText: "Expected output text",
    });

    const req = makeMockReq("/__ai/api/dataset?agent=output-agent");
    const res = makeMockRes();
    handler(req, res, () => {});

    const body = JSON.parse(res.body);
    const matchingCase = body.cases.find((c: { expectedOutput: string }) => c.expectedOutput === "Expected output text");
    expect(matchingCase).toBeDefined();
  });

  it("excludes records without outputText from dataset cases", async () => {
    const handler = await getHandler();
    const mod: DashboardModule = await import("../dashboard/vite-plugin");

    // Record with no outputText
    mod.recordCall({
      id: "no-output-1",
      timestamp: Date.now(),
      agent: "no-output-agent",
      model: "gpt-4o",
      tokens: 10,
      cost: 0.001,
      inputMessages: [{ role: "user", content: "no output query" }],
      // outputText intentionally omitted
    });

    // Record with outputText
    mod.recordCall({
      id: "with-output-1",
      timestamp: Date.now(),
      agent: "no-output-agent",
      model: "gpt-4o",
      tokens: 10,
      cost: 0.001,
      inputMessages: [{ role: "user", content: "has output query" }],
      outputText: "has output answer",
    });

    const req = makeMockReq("/__ai/api/dataset?agent=no-output-agent");
    const res = makeMockRes();
    handler(req, res, () => {});

    const body = JSON.parse(res.body);
    // Only the record with outputText should appear
    expect(body.cases.length).toBeGreaterThanOrEqual(1);
    for (const c of body.cases) {
      expect(c.expectedOutput).toBeDefined();
      expect(c.expectedOutput.length).toBeGreaterThan(0);
    }
    // The no-output record should not produce a case
    const noOutputCase = body.cases.find((c: { input: string }) => c.input === "no output query");
    expect(noOutputCase).toBeUndefined();
  });
});
