import { describe, it, expect } from "vitest";
import { createAgentHandler } from "../agents/route-handler";
import type { ToolDefinition } from "../tools/define-tool";
import type { LLMMessage, LLMToolSchema, LLMStreamEvent } from "@fabrk/ai";

function makeSearchTool(): ToolDefinition {
  return {
    name: "search",
    description: "Search the web",
    schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    handler: async (input) => ({
      content: [{ type: "text", text: `Found: results for "${input.query}"` }],
    }),
  };
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/agents/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("createAgentHandler with tools", () => {
  it("routes through agent loop when tools present (batch)", async () => {
    let callCount = 0;
    const handler = createAgentHandler({
      model: "test-model",
      auth: "none",
      tools: ["search"],
      stream: false,
      toolDefinitions: [makeSearchTool()],
      _generateWithTools: async () => {
        callCount++;
        if (callCount === 1) {
          return {
            content: null,
            toolCalls: [{ id: "tc1", name: "search", arguments: { query: "cats" } }],
            usage: { promptTokens: 10, completionTokens: 5 },
          };
        }
        return {
          content: "Here are the results about cats!",
          usage: { promptTokens: 20, completionTokens: 15 },
        };
      },
      _calculateCost: () => ({ costUSD: 0.001 }),
    });

    const res = await handler(postRequest({
      messages: [{ role: "user", content: "Search for cats" }],
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toBe("Here are the results about cats!");
    expect(data.toolCalls).toBeDefined();
    expect(data.toolCalls).toHaveLength(1);
    expect(data.toolCalls[0].name).toBe("search");
    expect(data.toolCalls[0].output).toContain("results for");
  });

  it("routes through agent loop with SSE when tools + stream", async () => {
    let callCount = 0;

    async function* mockStream(
      _messages: LLMMessage[],
      _tools: LLMToolSchema[]
    ): AsyncGenerator<LLMStreamEvent> {
      callCount++;
      if (callCount === 1) {
        yield { type: "tool-call", id: "tc1", name: "search", arguments: { query: "dogs" } };
        yield { type: "usage", promptTokens: 10, completionTokens: 5 };
      } else {
        yield { type: "text-delta", content: "Found " };
        yield { type: "text-delta", content: "dogs!" };
        yield { type: "usage", promptTokens: 20, completionTokens: 10 };
      }
    }

    const handler = createAgentHandler({
      model: "test-model",
      auth: "none",
      tools: ["search"],
      stream: true,
      toolDefinitions: [makeSearchTool()],
      _generateWithTools: async () => ({
        content: "fallback",
        usage: { promptTokens: 0, completionTokens: 0 },
      }),
      _streamWithTools: mockStream,
      _calculateCost: () => ({ costUSD: 0.001 }),
    });

    const res = await handler(postRequest({
      messages: [{ role: "user", content: "Search for dogs" }],
    }));

    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await res.text();
    const events = text
      .split("\n")
      .filter((l) => l.startsWith("data: "))
      .map((l) => JSON.parse(l.slice("data: ".length)));

    const types = events.map((e: { type: string }) => e.type);
    expect(types).toContain("tool-call");
    expect(types).toContain("tool-result");
    expect(types).toContain("text-delta");
    expect(types).toContain("text");
    expect(types).toContain("done");
  });

  it("falls back to simple path when no tool definitions", async () => {
    const handler = createAgentHandler({
      model: "test-model",
      auth: "none",
      tools: [],
      stream: false,
      toolDefinitions: [],
      _llmCall: async () => ({
        content: "Simple response",
        usage: { promptTokens: 5, completionTokens: 5 },
        cost: 0.001,
      }),
    });

    const res = await handler(postRequest({
      messages: [{ role: "user", content: "Hi" }],
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toBe("Simple response");
  });
});
