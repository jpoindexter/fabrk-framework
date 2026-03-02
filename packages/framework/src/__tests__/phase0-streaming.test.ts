import { describe, it, expect } from "vitest";
import { createAgentHandler } from "../agents/route-handler";
import { parseSSELine } from "../client/use-agent";
import { formatSSEEvent } from "../agents/sse-stream";

describe("Phase 0: Streaming + Wire Dead Code", () => {
  describe("SSE streaming path", () => {
    it("returns SSE content-type when stream: true", async () => {
      const handler = createAgentHandler({
        model: "test-model",
        auth: "none",
        tools: [],
        stream: true,
        _llmCall: async () => ({
          content: "Hello from stream!",
          usage: { promptTokens: 10, completionTokens: 5 },
          cost: 0.001,
        }),
      });

      const req = new Request("http://localhost/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      const res = await handler(req);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");
      expect(res.headers.get("Cache-Control")).toBe("no-cache");
    });

    it("emits text, usage, done events in SSE stream", async () => {
      const handler = createAgentHandler({
        model: "test-model",
        auth: "none",
        tools: [],
        stream: true,
        _llmCall: async () => ({
          content: "Hello!",
          usage: { promptTokens: 10, completionTokens: 5 },
          cost: 0.002,
        }),
      });

      const req = new Request("http://localhost/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      const res = await handler(req);
      const text = await res.text();
      const lines = text.split("\n").filter((l) => l.startsWith("data: "));

      const events = lines.map((l) => JSON.parse(l.slice("data: ".length)));
      expect(events).toHaveLength(3);
      expect(events[0]).toEqual({ type: "text", content: "Hello!" });
      expect(events[1]).toMatchObject({ type: "usage", promptTokens: 10, cost: 0.002 });
      expect(events[2]).toEqual({ type: "done" });
    });

    it("returns JSON when stream: false", async () => {
      const handler = createAgentHandler({
        model: "test-model",
        auth: "none",
        tools: [],
        stream: false,
        _llmCall: async () => ({
          content: "Hello JSON!",
          usage: { promptTokens: 10, completionTokens: 5 },
          cost: 0.001,
        }),
      });

      const req = new Request("http://localhost/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      const res = await handler(req);
      expect(res.headers.get("Content-Type")).toBe("application/json");
      const data = await res.json();
      expect(data.content).toBe("Hello JSON!");
    });

    it("includes security headers on SSE response", async () => {
      const handler = createAgentHandler({
        model: "test-model",
        auth: "none",
        tools: [],
        stream: true,
        _llmCall: async () => ({
          content: "OK",
          usage: { promptTokens: 1, completionTokens: 1 },
          cost: 0,
        }),
      });

      const req = new Request("http://localhost/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hi" }],
        }),
      });
      const res = await handler(req);
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });
  });

  describe("new SSE event types", () => {
    it("formats text-delta event", () => {
      const event = formatSSEEvent({ type: "text-delta", content: "Hel" });
      expect(event).toContain('"type":"text-delta"');
      expect(event).toContain('"content":"Hel"');
    });

    it("formats tool-call event", () => {
      const event = formatSSEEvent({
        type: "tool-call",
        name: "search",
        input: { query: "hello" },
        iteration: 0,
      });
      expect(event).toContain('"type":"tool-call"');
      expect(event).toContain('"name":"search"');
    });

    it("formats tool-result event", () => {
      const event = formatSSEEvent({
        type: "tool-result",
        name: "search",
        output: "found 3 results",
        durationMs: 150,
        iteration: 0,
      });
      expect(event).toContain('"type":"tool-result"');
      expect(event).toContain('"durationMs":150');
    });

    it("parseSSELine handles new event types", () => {
      const delta = parseSSELine('data: {"type":"text-delta","content":"Hi"}');
      expect(delta).toEqual({ type: "text-delta", content: "Hi" });

      const toolCall = parseSSELine(
        'data: {"type":"tool-call","name":"calc","input":{},"iteration":0}'
      );
      expect(toolCall).toMatchObject({ type: "tool-call", name: "calc" });
    });
  });

  describe("config loading", () => {
    it("FabrkConfig has agents and mcp fields", async () => {
      const { defineFabrkConfig } = await import("../config/fabrk-config");
      const config = defineFabrkConfig({
        ai: { defaultModel: "gpt-4o" },
        agents: { maxIterations: 10, defaultStream: false },
        mcp: { expose: true, consume: ["http://localhost:3001/mcp"] },
      });
      expect(config.agents?.maxIterations).toBe(10);
      expect(config.agents?.defaultStream).toBe(false);
      expect(config.mcp?.expose).toBe(true);
      expect(config.mcp?.consume).toEqual(["http://localhost:3001/mcp"]);
    });
  });
});
