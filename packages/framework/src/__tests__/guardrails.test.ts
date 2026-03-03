import { describe, it, expect } from "vitest";
import {
  maxLength,
  denyList,
  requireJsonSchema,
  piiRedactor,
  runGuardrails,
  type GuardrailContext,
  type Guardrail,
} from "../agents/guardrails";
import { runAgentLoop, type AgentLoopEvent } from "../agents/agent-loop";
import { createToolExecutor } from "../agents/tool-executor";

const ctx: GuardrailContext = { agentName: "test", sessionId: "s1", direction: "input" };

async function collectEvents(gen: AsyncGenerator<AgentLoopEvent>): Promise<AgentLoopEvent[]> {
  const events: AgentLoopEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

function mockCalculateCost() {
  return () => ({ costUSD: 0 });
}

describe("maxLength", () => {
  it("passes content under limit", () => {
    const guard = maxLength(100);
    expect(guard("short", ctx)).toEqual({ pass: true });
  });

  it("rejects content over limit", () => {
    const guard = maxLength(5);
    const result = guard("too long", ctx);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("max length of 5");
  });

  it("passes content at exact limit", () => {
    const guard = maxLength(5);
    expect(guard("abcde", ctx).pass).toBe(true);
  });
});

describe("denyList", () => {
  it("passes content not matching any pattern", () => {
    const guard = denyList([/secret/i, /password/i]);
    expect(guard("hello world", ctx)).toEqual({ pass: true });
  });

  it("rejects content matching a pattern", () => {
    const guard = denyList([/secret/i, /password/i]);
    const result = guard("my Secret key", ctx);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("secret");
  });

  it("checks all patterns", () => {
    const guard = denyList([/foo/, /bar/]);
    expect(guard("has bar in it", ctx).pass).toBe(false);
  });
});

describe("requireJsonSchema", () => {
  it("passes valid JSON matching schema", () => {
    const guard = requireJsonSchema({
      required: ["name", "age"],
      properties: { name: { type: "string" }, age: { type: "number" } },
    });
    const result = guard(JSON.stringify({ name: "Alice", age: 30 }), ctx);
    expect(result.pass).toBe(true);
  });

  it("rejects non-JSON content", () => {
    const guard = requireJsonSchema({ required: ["name"] });
    const result = guard("not json", ctx);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("not valid JSON");
  });

  it("rejects missing required fields", () => {
    const guard = requireJsonSchema({ required: ["name", "email"] });
    const result = guard(JSON.stringify({ name: "Alice" }), ctx);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("email");
  });

  it("rejects wrong types", () => {
    const guard = requireJsonSchema({
      properties: { age: { type: "number" } },
    });
    const result = guard(JSON.stringify({ age: "thirty" }), ctx);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('"age"');
  });

  it("rejects arrays as top-level", () => {
    const guard = requireJsonSchema({});
    expect(guard("[1,2,3]", ctx).pass).toBe(false);
  });
});

describe("piiRedactor", () => {
  it("redacts email addresses", () => {
    const guard = piiRedactor();
    const result = guard("Contact me at alice@example.com please", ctx);
    expect(result.pass).toBe(true);
    expect(result.replacement).toBe("Contact me at [REDACTED] please");
  });

  it("redacts phone numbers", () => {
    const guard = piiRedactor();
    const result = guard("Call 555-123-4567", ctx);
    expect(result.pass).toBe(true);
    expect(result.replacement).toContain("[REDACTED]");
    expect(result.replacement).not.toContain("555");
  });

  it("redacts SSNs", () => {
    const guard = piiRedactor();
    const result = guard("SSN: 123-45-6789", ctx);
    expect(result.pass).toBe(true);
    expect(result.replacement).toContain("[REDACTED]");
    expect(result.replacement).not.toContain("123-45-6789");
  });

  it("passes content without PII", () => {
    const guard = piiRedactor();
    const result = guard("Hello world", ctx);
    expect(result.pass).toBe(true);
    expect(result.replacement).toBeUndefined();
  });

  it("redacts multiple PII instances", () => {
    const guard = piiRedactor();
    const result = guard("Email: a@b.com, Phone: 555-111-2222", ctx);
    expect(result.pass).toBe(true);
    expect(result.replacement).not.toContain("a@b.com");
    expect(result.replacement).not.toContain("555-111-2222");
  });
});

describe("runGuardrails", () => {
  it("runs multiple guardrails in sequence", () => {
    const result = runGuardrails(
      [maxLength(1000), denyList([/badword/])],
      "clean content",
      ctx,
    );
    expect(result.blocked).toBe(false);
  });

  it("stops at first blocking guardrail", () => {
    const result = runGuardrails(
      [maxLength(5), denyList([/badword/])],
      "too long text",
      ctx,
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("max length");
  });

  it("applies replacements and continues", () => {
    const result = runGuardrails(
      [piiRedactor(), maxLength(1000)],
      "Contact: alice@example.com",
      ctx,
    );
    expect(result.blocked).toBe(false);
    expect(result.content).toBe("Contact: [REDACTED]");
  });

  it("chains replacements through multiple guardrails", () => {
    const addPrefix: Guardrail = (content) => ({
      pass: true,
      replacement: `[PROCESSED] ${content}`,
    });
    const result = runGuardrails([piiRedactor(), addPrefix], "Email: a@b.com", ctx);
    expect(result.blocked).toBe(false);
    expect(result.content).toBe("[PROCESSED] Email: [REDACTED]");
  });
});

describe("agent-loop guardrail integration", () => {
  it("blocks input that fails input guardrails", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "This message has a secret password" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        generateWithTools: async () => ({
          content: "Should not reach here",
          usage: { promptTokens: 10, completionTokens: 5 },
        }),
        calculateCost: mockCalculateCost(),
        inputGuardrails: [denyList([/secret password/])],
      }),
    );

    const error = events.find((e) => e.type === "error") as Extract<AgentLoopEvent, { type: "error" }>;
    expect(error).toBeDefined();
    expect(error.message).toContain("Input guardrail blocked");
    expect(events.find((e) => e.type === "text")).toBeUndefined();
  });

  it("applies input replacement before LLM call", async () => {
    const executor = createToolExecutor([]);
    let capturedMessages: unknown[] = [];

    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "My email is alice@example.com" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        generateWithTools: async (msgs) => {
          capturedMessages = msgs;
          return {
            content: "Got it",
            usage: { promptTokens: 10, completionTokens: 5 },
          };
        },
        calculateCost: mockCalculateCost(),
        inputGuardrails: [piiRedactor()],
      }),
    );

    const userMsg = (capturedMessages as Array<{ role: string; content: string }>)
      .find((m) => m.role === "user");
    expect(userMsg?.content).toBe("My email is [REDACTED]");
    expect(events.find((e) => e.type === "text")).toBeDefined();
  });

  it("blocks output that fails output guardrails (batch)", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Tell me something" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        generateWithTools: async () => ({
          content: "Here is a secret password: hunter2",
          usage: { promptTokens: 10, completionTokens: 5 },
        }),
        calculateCost: mockCalculateCost(),
        outputGuardrails: [denyList([/secret password/])],
      }),
    );

    const error = events.find((e) => e.type === "error") as Extract<AgentLoopEvent, { type: "error" }>;
    expect(error).toBeDefined();
    expect(error.message).toContain("Output guardrail blocked");
    expect(events.find((e) => e.type === "done")).toBeUndefined();
  });

  it("applies output replacement (batch)", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Give me contact info" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        generateWithTools: async () => ({
          content: "Contact alice@example.com for help",
          usage: { promptTokens: 10, completionTokens: 5 },
        }),
        calculateCost: mockCalculateCost(),
        outputGuardrails: [piiRedactor()],
      }),
    );

    const text = events.find((e) => e.type === "text") as Extract<AgentLoopEvent, { type: "text" }>;
    expect(text.content).toBe("Contact [REDACTED] for help");
    expect(events.find((e) => e.type === "done")).toBeDefined();
  });

  it("blocks output in streaming path", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Tell me something" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: true,
        generateWithTools: async () => ({
          content: "should not be used",
          usage: { promptTokens: 0, completionTokens: 0 },
        }),
        streamWithTools: async function* () {
          yield { type: "text-delta" as const, content: "Contains secret password info" };
          yield { type: "usage" as const, promptTokens: 10, completionTokens: 5 };
        },
        calculateCost: mockCalculateCost(),
        outputGuardrails: [denyList([/secret password/])],
      }),
    );

    const error = events.find((e) => e.type === "error") as Extract<AgentLoopEvent, { type: "error" }>;
    expect(error).toBeDefined();
    expect(error.message).toContain("Output guardrail blocked");
  });

  it("no guardrails — loop works normally", async () => {
    const executor = createToolExecutor([]);
    const events = await collectEvents(
      runAgentLoop({
        messages: [{ role: "user", content: "Hi" }],
        toolExecutor: executor,
        toolSchemas: [],
        agentName: "test",
        sessionId: "s1",
        model: "test-model",
        stream: false,
        generateWithTools: async () => ({
          content: "Hello!",
          usage: { promptTokens: 10, completionTokens: 5 },
        }),
        calculateCost: mockCalculateCost(),
      }),
    );

    expect(events.find((e) => e.type === "text")).toMatchObject({ content: "Hello!" });
    expect(events.find((e) => e.type === "done")).toBeDefined();
  });
});
