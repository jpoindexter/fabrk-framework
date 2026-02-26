import { describe, it, expect } from "vitest";
import type { LLMCallResult } from "../agents/llm-caller";

describe("LLMCallResult type", () => {
  it("has the expected shape", () => {
    const result: LLMCallResult = {
      content: "Hello",
      usage: { promptTokens: 10, completionTokens: 5 },
      cost: 0.001,
    };

    expect(result.content).toBe("Hello");
    expect(result.usage.promptTokens).toBe(10);
    expect(result.usage.completionTokens).toBe(5);
    expect(result.cost).toBe(0.001);
  });
});

describe("callWithFallback (via route handler)", () => {
  it("returns result from _llmCall override", async () => {
    // Test the integration through createAgentHandler's _llmCall path
    const { createAgentHandler } = await import("../agents/route-handler");

    const handler = createAgentHandler({
      model: "test/model",
      auth: "none",
      _llmCall: async (messages) => ({
        content: `Echo: ${messages[messages.length - 1].content}`,
        usage: { promptTokens: 5, completionTokens: 3 },
        cost: 0.0005,
      }),
    });

    const req = new Request("http://localhost/api/agents/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "ping" }],
      }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.content).toBe("Echo: ping");
    expect(data.cost).toBe(0.0005);
  });

  it("calls onCallComplete after successful call", async () => {
    const { createAgentHandler } = await import("../agents/route-handler");

    let callRecord: { agent: string; model: string; tokens: number; cost: number } | null = null;

    const handler = createAgentHandler({
      model: "openai/gpt-4",
      auth: "none",
      _llmCall: async () => ({
        content: "OK",
        usage: { promptTokens: 100, completionTokens: 50 },
        cost: 0.01,
      }),
      onCallComplete: (record) => {
        callRecord = record;
      },
    });

    const req = new Request("http://localhost/api/agents/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    await handler(req);

    expect(callRecord).not.toBeNull();
    expect(callRecord!.agent).toBe("gpt-4");
    expect(callRecord!.model).toBe("openai/gpt-4");
    expect(callRecord!.tokens).toBe(150);
    expect(callRecord!.cost).toBe(0.01);
  });
});
