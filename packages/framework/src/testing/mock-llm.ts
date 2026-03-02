import type { LLMMessage, LLMToolResult, LLMToolSchema, LLMStreamEvent } from "@fabrk/ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolCallSpec {
  name: string;
  input: Record<string, unknown>;
}

interface MockResponse {
  content: string;
  toolCalls?: ToolCallSpec[];
  promptTokens?: number;
  completionTokens?: number;
}

interface MessageMatcher {
  pattern: string | RegExp;
  response: MockResponse;
}

interface ToolCallMatcher {
  toolName: string;
  result: string;
}

// ---------------------------------------------------------------------------
// MockLLM builder
// ---------------------------------------------------------------------------

export class MockLLM {
  private messageMatchers: MessageMatcher[] = [];
  private toolCallMatchers: Map<string, ToolCallMatcher> = new Map();
  private defaultResponse: MockResponse = { content: "Mock response" };
  private callLog: Array<{ messages: LLMMessage[]; tools?: LLMToolSchema[] }> = [];

  /** Match user messages containing a pattern and respond with specific content. */
  onMessage(pattern: string | RegExp): {
    respondWith: (content: string, opts?: Partial<MockResponse>) => MockLLM;
    callTool: (name: string, input?: Record<string, unknown>) => MockLLM;
  } {
    const self = this;
    return {
      respondWith(content: string, opts?: Partial<MockResponse>): MockLLM {
        self.messageMatchers.push({
          pattern,
          response: { content, ...opts },
        });
        return self;
      },
      callTool(name: string, input: Record<string, unknown> = {}): MockLLM {
        self.messageMatchers.push({
          pattern,
          response: {
            content: "",
            toolCalls: [{ name, input }],
          },
        });
        return self;
      },
    };
  }

  /** Configure a tool call result that the mock returns when the agent calls this tool. */
  onToolCall(toolName: string): { returnResult: (result: string) => MockLLM } {
    const self = this;
    return {
      returnResult(result: string): MockLLM {
        self.toolCallMatchers.set(toolName, { toolName, result });
        return self;
      },
    };
  }

  /** Set the default response for unmatched messages. */
  setDefault(content: string, opts?: Partial<MockResponse>): MockLLM {
    this.defaultResponse = { content, ...opts };
    return this;
  }

  /** Get all calls made to the mock LLM. */
  getCalls(): ReadonlyArray<{ messages: LLMMessage[]; tools?: LLMToolSchema[] }> {
    return this.callLog;
  }

  /** Number of LLM calls made. */
  get callCount(): number {
    return this.callLog.length;
  }

  /** Reset call log. */
  reset(): void {
    this.callLog = [];
  }

  // -------------------------------------------------------------------------
  // Internal: resolve a response for the given messages
  // -------------------------------------------------------------------------

  private resolve(messages: LLMMessage[]): MockResponse {
    const lastUser = messages.filter((m) => m.role === "user").pop();
    const text = lastUser?.content ?? "";

    for (const matcher of this.messageMatchers) {
      if (typeof matcher.pattern === "string") {
        if (text.includes(matcher.pattern)) return matcher.response;
      } else {
        if (matcher.pattern.test(text)) return matcher.response;
      }
    }

    return this.defaultResponse;
  }

  // -------------------------------------------------------------------------
  // Generators for createAgentHandler injection
  // -------------------------------------------------------------------------

  /** Returns a `generateWithTools` function for injection into the agent handler. */
  asGenerateWithTools(): (messages: LLMMessage[], tools: LLMToolSchema[]) => Promise<LLMToolResult> {
    return async (messages, tools) => {
      this.callLog.push({ messages, tools });
      const response = this.resolve(messages);

      return {
        content: response.content,
        toolCalls: response.toolCalls?.map((tc) => ({
          id: `call_${tc.name}_${Date.now()}`,
          name: tc.name,
          arguments: tc.input,
        })),
        usage: {
          promptTokens: response.promptTokens ?? 10,
          completionTokens: response.completionTokens ?? 5,
        },
      };
    };
  }

  /** Returns a `streamWithTools` async generator for injection. */
  asStreamWithTools(): (messages: LLMMessage[], tools: LLMToolSchema[]) => AsyncGenerator<LLMStreamEvent> {
    const self = this;
    return async function* (messages, tools) {
      self.callLog.push({ messages, tools });
      const response = self.resolve(messages);

      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const tc of response.toolCalls) {
          yield {
            type: "tool-call" as const,
            id: `call_${tc.name}_${Date.now()}`,
            name: tc.name,
            arguments: tc.input,
          };
        }
      } else {
        // Emit text as a single delta
        yield { type: "text-delta" as const, content: response.content };
      }

      yield {
        type: "usage" as const,
        promptTokens: response.promptTokens ?? 10,
        completionTokens: response.completionTokens ?? 5,
      };
    };
  }

  /** Returns a `_calculateCost` function that always returns 0. */
  static zeroCost(): (model: string, promptTokens: number, completionTokens: number) => { costUSD: number } {
    return () => ({ costUSD: 0 });
  }
}

/** Create a new MockLLM builder. */
export function mockLLM(): MockLLM {
  return new MockLLM();
}
