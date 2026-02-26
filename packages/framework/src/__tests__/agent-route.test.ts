import { describe, it, expect } from "vitest";
import { createAgentHandler } from "../agents/route-handler.js";

describe("createAgentHandler", () => {
  it("returns a request handler function", () => {
    const handler = createAgentHandler({
      model: "claude-sonnet-4-5-20250514",
      tools: [],
      stream: true,
      auth: "none",
    });

    expect(typeof handler).toBe("function");
  });

  it("rejects non-POST requests", async () => {
    const handler = createAgentHandler({
      model: "claude-sonnet-4-5-20250514",
      tools: [],
      stream: true,
      auth: "none",
    });

    const req = new Request("http://localhost/api/agents/chat", {
      method: "GET",
    });
    const res = await handler(req);
    expect(res.status).toBe(405);
  });

  it("rejects missing body", async () => {
    const handler = createAgentHandler({
      model: "claude-sonnet-4-5-20250514",
      tools: [],
      stream: true,
      auth: "none",
    });

    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  it("accepts valid messages body", async () => {
    const handler = createAgentHandler({
      model: "test-model",
      tools: [],
      stream: false,
      auth: "none",
      _llmCall: async () => ({
        content: "Hello!",
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
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toBe("Hello!");
    expect(data.usage.promptTokens).toBe(10);
  });

  it("prepends system prompt to messages", async () => {
    let capturedMessages: Array<{ role: string; content: string }> = [];
    const handler = createAgentHandler({
      model: "test-model",
      tools: [],
      stream: false,
      auth: "none",
      systemPrompt: "You are a helpful assistant.",
      _llmCall: async (messages) => {
        capturedMessages = messages;
        return {
          content: "OK",
          usage: { promptTokens: 10, completionTokens: 5 },
          cost: 0.001,
        };
      },
    });

    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    await handler(req);
    expect(capturedMessages[0]).toEqual({
      role: "system",
      content: "You are a helpful assistant.",
    });
    expect(capturedMessages[1]).toEqual({ role: "user", content: "Hi" });
  });
});
