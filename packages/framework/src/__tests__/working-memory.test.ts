import { describe, it, expect } from "vitest";
import { buildWorkingMemory, type WorkingMemoryConfig } from "../agents/memory/working-memory";
import type { ThreadMessage } from "../agents/memory/types";
import { defineAgent } from "../agents/define-agent";

function makeMessage(role: ThreadMessage["role"], content: string): ThreadMessage {
  return { id: `msg-${Math.random()}`, threadId: "t1", role, content, createdAt: new Date() };
}

describe("buildWorkingMemory", () => {
  it("calls template with the messages array", () => {
    const messages = [makeMessage("user", "hello")];
    let received: ThreadMessage[] | undefined;
    const config: WorkingMemoryConfig = {
      template: (msgs) => {
        received = msgs;
        return "wm content";
      },
    };
    buildWorkingMemory(messages, config);
    expect(received).toBe(messages);
  });

  it("returns the string produced by the template", () => {
    const messages = [makeMessage("user", "test")];
    const config: WorkingMemoryConfig = {
      template: () => "working memory result",
    };
    const result = buildWorkingMemory(messages, config);
    expect(result).toBe("working memory result");
  });

  it("returns empty string when template returns empty", () => {
    const messages = [makeMessage("user", "hello")];
    const config: WorkingMemoryConfig = { template: () => "" };
    expect(buildWorkingMemory(messages, config)).toBe("");
  });

  it("with scope 'session' passes messages without crashing", () => {
    const messages = [makeMessage("user", "a"), makeMessage("assistant", "b")];
    const config: WorkingMemoryConfig = {
      scope: "session",
      template: (msgs) => `count:${msgs.length}`,
    };
    expect(buildWorkingMemory(messages, config)).toBe("count:2");
  });

  it("with scope 'full' passes messages without crashing", () => {
    const messages = [makeMessage("user", "a"), makeMessage("assistant", "b")];
    const config: WorkingMemoryConfig = {
      scope: "full",
      template: (msgs) => `count:${msgs.length}`,
    };
    expect(buildWorkingMemory(messages, config)).toBe("count:2");
  });

  it("readOnly field on config does not crash when present", () => {
    const messages = [makeMessage("user", "hello")];
    const config: WorkingMemoryConfig = {
      readOnly: true,
      template: () => "readonly content",
    };
    expect(() => buildWorkingMemory(messages, config)).not.toThrow();
    expect(buildWorkingMemory(messages, config)).toBe("readonly content");
  });

  it("template can extract entity from messages", () => {
    const messages = [
      makeMessage("user", "My name is Alice"),
      makeMessage("assistant", "Hello Alice!"),
    ];
    const config: WorkingMemoryConfig = {
      template: (msgs) => {
        const nameMatch = msgs.find((m) => m.content.includes("My name is"));
        if (nameMatch) {
          const match = nameMatch.content.match(/My name is (\w+)/);
          if (match) return `Known user: ${match[1]}`;
        }
        return "";
      },
    };
    expect(buildWorkingMemory(messages, config)).toBe("Known user: Alice");
  });

  it("returns non-empty string when template returns content", () => {
    const messages = [makeMessage("user", "context data")];
    const config: WorkingMemoryConfig = { template: () => "summary of context" };
    const result = buildWorkingMemory(messages, config);
    expect(result.length).toBeGreaterThan(0);
    expect(result.trim()).not.toBe("");
  });
});

describe("AgentMemoryConfig accepts workingMemory field", () => {
  it("defineAgent accepts memory config with workingMemory without TS errors", () => {
    const agent = defineAgent({
      model: "gpt-4o",
      memory: {
        maxMessages: 20,
        workingMemory: {
          template: (msgs) => `messages: ${msgs.length}`,
          scope: "full",
          readOnly: false,
        },
      },
    });
    // Verify the config is stored correctly
    expect(typeof agent.memory).toBe("object");
    const memConfig = agent.memory as { workingMemory?: WorkingMemoryConfig };
    expect(typeof memConfig.workingMemory?.template).toBe("function");
  });
});
