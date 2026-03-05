import type { LLMMessage, LLMToolResult, LLMToolSchema, LLMStreamEvent } from "@fabrk/ai";

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

export class MockLLM {
  private messageMatchers: MessageMatcher[] = [];
  private toolCallMatchers: Map<string, ToolCallMatcher> = new Map();
  private defaultResponse: MockResponse = { content: "Mock response" };
  private callLog: Array<{ messages: LLMMessage[]; tools?: LLMToolSchema[] }> = [];

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

  onToolCall(toolName: string): { returnResult: (result: string) => MockLLM } {
    const self = this;
    return {
      returnResult(result: string): MockLLM {
        self.toolCallMatchers.set(toolName, { toolName, result });
        return self;
      },
    };
  }

  setDefault(content: string, opts?: Partial<MockResponse>): MockLLM {
    this.defaultResponse = { content, ...opts };
    return this;
  }

  getCalls(): ReadonlyArray<{ messages: LLMMessage[]; tools?: LLMToolSchema[] }> {
    return this.callLog;
  }

  get callCount(): number {
    return this.callLog.length;
  }

  reset(): void {
    this.callLog = [];
  }

  private resolve(messages: LLMMessage[]): MockResponse {
    const lastUser = messages.filter((m) => m.role === "user").pop();
    const rawContent = lastUser?.content ?? "";
    const text: string = typeof rawContent === "string"
      ? rawContent
      : rawContent
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((p): p is { type: "text"; text: string } => (p as any).type === "text")
          .map((p) => p.text)
          .join("");

    for (const matcher of this.messageMatchers) {
      if (typeof matcher.pattern === "string") {
        if (text.includes(matcher.pattern)) return matcher.response;
      } else {
        if (matcher.pattern.test(text)) return matcher.response;
      }
    }

    return this.defaultResponse;
  }

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
        yield { type: "text-delta" as const, content: response.content };
      }

      yield {
        type: "usage" as const,
        promptTokens: response.promptTokens ?? 10,
        completionTokens: response.completionTokens ?? 5,
      };
    };
  }

  static zeroCost(): (model: string, promptTokens: number, completionTokens: number) => { costUSD: number } {
    return () => ({ costUSD: 0 });
  }
}

export function mockLLM(): MockLLM {
  return new MockLLM();
}
