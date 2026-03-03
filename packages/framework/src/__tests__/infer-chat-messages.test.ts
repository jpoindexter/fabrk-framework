import { describe, it, expect } from "vitest";
import type { InferChatMessages } from "../client/use-agent";
import type { AgentMessage } from "../client/use-agent";

// Type-level test: InferChatMessages extracts AgentMessage[] from a hook result shape
type MockHookResult = {
  messages: AgentMessage[];
  isStreaming: boolean;
  send: (content: string) => void;
};

// Verify InferChatMessages<MockHookResult> resolves to AgentMessage[]
// TypeScript will error at compile time if this assignment is invalid
type Extracted = InferChatMessages<MockHookResult>;
const _typeCheck: Extracted = [] as AgentMessage[];
void _typeCheck;

describe("InferChatMessages type helper", () => {
  it("is exported from use-agent module", async () => {
    const mod = await import("../client/use-agent");
    // InferChatMessages is a type-only export — no runtime value
    expect(mod).toBeDefined();
    expect(typeof mod.useAgent).toBe("function");
  });

  it("AgentMessage type has role and content fields", () => {
    const msg: AgentMessage = { role: "user", content: "hello" };
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("hello");
  });

  it("InferChatMessages extracts the messages array type at runtime usage", () => {
    const mockHookResult: { messages: AgentMessage[]; isStreaming: boolean } = {
      messages: [{ role: "assistant", content: "Hi there" }],
      isStreaming: false,
    };

    // InferChatMessages<typeof mockHookResult> is AgentMessage[]
    const messages: InferChatMessages<typeof mockHookResult> = mockHookResult.messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("assistant");
  });

  it("works with content as AgentContentPart array", () => {
    const msg: AgentMessage = {
      role: "user",
      content: [{ type: "text", text: "hello" }],
    };
    const result: InferChatMessages<{ messages: AgentMessage[] }> = [msg];
    expect(result[0].role).toBe("user");
    expect(Array.isArray(result[0].content)).toBe(true);
  });
});
