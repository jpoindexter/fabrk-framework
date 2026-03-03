import { describe, it, expect } from "vitest";
import { createMCPServer } from "../tools/mcp/server";
import type { ToolDefinition } from "../tools/define-tool";

function makeTool(name = "test-tool"): ToolDefinition {
  return {
    name,
    description: `Tool: ${name}`,
    schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    handler: async (input) => ({
      content: [{ type: "text", text: `Result: ${input.query}` }],
    }),
  };
}

describe("MCP Server", () => {
  describe("handleRequest", () => {
    it("responds to initialize", async () => {
      const server = createMCPServer({ name: "test", version: "1.0", tools: [] });
      const result = await server.handleRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2024-11-05", capabilities: {} },
      }) as { result?: { serverInfo: { name: string } } };

      expect(result).toMatchObject({
        jsonrpc: "2.0",
        id: 1,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "test", version: "1.0" },
        },
      });
    });

    it("responds to ping", async () => {
      const server = createMCPServer({ name: "test", version: "1.0", tools: [] });
      const result = await server.handleRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "ping",
      });

      expect(result).toMatchObject({ jsonrpc: "2.0", id: 2, result: {} });
    });

    it("lists tools via tools/list", async () => {
      const server = createMCPServer({
        name: "test",
        version: "1.0",
        tools: [makeTool("search"), makeTool("calc")],
      });

      const result = await server.handleRequest({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/list",
      }) as { result?: { tools: Array<{ name: string }> } };

      expect(result.result?.tools).toHaveLength(2);
      expect(result.result?.tools.map((t: { name: string }) => t.name)).toContain("search");
    });

    it("calls a tool via tools/call", async () => {
      const server = createMCPServer({
        name: "test",
        version: "1.0",
        tools: [makeTool()],
      });

      const result = await server.handleRequest({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "test-tool", arguments: { query: "hello" } },
      }) as { result?: { content: Array<{ text: string }> } };

      expect(result.result?.content[0].text).toBe("Result: hello");
    });

    it("returns error for unknown tool", async () => {
      const server = createMCPServer({ name: "test", version: "1.0", tools: [] });
      const result = await server.handleRequest({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "nonexistent", arguments: {} },
      }) as { error?: { code: number } };

      expect(result.error?.code).toBe(-32602);
    });

    it("returns error for unknown method", async () => {
      const server = createMCPServer({ name: "test", version: "1.0", tools: [] });
      const result = await server.handleRequest({
        jsonrpc: "2.0",
        id: 6,
        method: "unknown/method",
      }) as { error?: { code: number } };

      expect(result.error?.code).toBe(-32601);
    });

    it("returns error for invalid JSON-RPC", async () => {
      const server = createMCPServer({ name: "test", version: "1.0", tools: [] });
      const result = await server.handleRequest({ foo: "bar" }) as { error?: { code: number } };
      expect(result.error?.code).toBe(-32600);
    });

    it("handles tool execution errors", async () => {
      const failTool: ToolDefinition = {
        name: "fail",
        description: "Always fails",
        schema: { type: "object", properties: {} },
        handler: async () => { throw new Error("Boom"); },
      };
      const server = createMCPServer({ name: "test", version: "1.0", tools: [failTool] });

      const result = await server.handleRequest({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: { name: "fail", arguments: {} },
      }) as { result?: { content: Array<{ text: string }>; isError: boolean } };

      expect(result.result?.isError).toBe(true);
      expect(result.result?.content[0].text).toBe("Error: Tool execution failed");
    });
  });

  describe("httpHandler", () => {
    it("responds to HTTP POST with JSON-RPC", async () => {
      const server = createMCPServer({ name: "test", version: "1.0", tools: [] });
      const res = await server.httpHandler(
        new Request("http://localhost/__mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
        })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result).toEqual({});
    });

    it("rejects non-POST requests", async () => {
      const server = createMCPServer({ name: "test", version: "1.0", tools: [] });
      const res = await server.httpHandler(
        new Request("http://localhost/__mcp", { method: "GET" })
      );
      expect(res.status).toBe(405);
    });

    it("returns parse error for invalid JSON", async () => {
      const server = createMCPServer({ name: "test", version: "1.0", tools: [] });
      const res = await server.httpHandler(
        new Request("http://localhost/__mcp", {
          method: "POST",
          body: "not json{",
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe(-32700);
    });

    it("includes security headers", async () => {
      const server = createMCPServer({ name: "test", version: "1.0", tools: [] });
      const res = await server.httpHandler(
        new Request("http://localhost/__mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
        })
      );
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
  });

  describe("rate limiting", () => {
    it("allows requests within rate limit", async () => {
      const server = createMCPServer({
        name: "test",
        version: "1.0",
        tools: [],
        rateLimit: 5,
        rateLimitWindowMs: 60_000,
      });

      for (let i = 0; i < 5; i++) {
        const res = await server.httpHandler(
          new Request("http://localhost/__mcp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Forwarded-For": "10.0.0.1",
            },
            body: JSON.stringify({ jsonrpc: "2.0", id: i, method: "ping" }),
          })
        );
        expect(res.status).toBe(200);
      }
    });

    it("returns 429 when rate limit exceeded", async () => {
      const server = createMCPServer({
        name: "test",
        version: "1.0",
        tools: [],
        rateLimit: 2,
        rateLimitWindowMs: 60_000,
      });

      const makeReq = () =>
        new Request("http://localhost/__mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": "10.0.0.2",
          },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
        });

      // First two should pass
      expect((await server.httpHandler(makeReq())).status).toBe(200);
      expect((await server.httpHandler(makeReq())).status).toBe(200);

      // Third should be rate limited
      const res = await server.httpHandler(makeReq());
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeTruthy();
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("rate limits are per-IP", async () => {
      const server = createMCPServer({
        name: "test",
        version: "1.0",
        tools: [],
        rateLimit: 1,
        rateLimitWindowMs: 60_000,
      });

      const makeReq = (ip: string) =>
        new Request("http://localhost/__mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": ip,
          },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
        });

      // Different IPs each get their own limit
      expect((await server.httpHandler(makeReq("1.1.1.1"))).status).toBe(200);
      expect((await server.httpHandler(makeReq("2.2.2.2"))).status).toBe(200);

      // Same IP over limit
      expect((await server.httpHandler(makeReq("1.1.1.1"))).status).toBe(429);
    });
  });
});
