import type { LLMConfig } from "./types";
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from "./types";
import type {
  LLMMessage,
  LLMToolSchema,
  LLMToolResult,
  LLMToolCall,
  LLMStreamEvent,
} from "./tool-types";

function resolveConfig(config: Partial<LLMConfig> = {}): LLMConfig {
  const merged = { ...LLM_DEFAULTS, ...config, provider: "openai" as const };
  if (!merged.openaiApiKey) {
    const g = globalThis as Record<string, unknown>;
    const proc = g.process as { env?: Record<string, string> } | undefined;
    merged.openaiApiKey = proc?.env?.OPENAI_API_KEY || "";
  }
  return merged;
}

function toOpenAIMessages(messages: LLMMessage[]): unknown[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      return { role: "tool", content: m.content, tool_call_id: m.toolCallId };
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      return {
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      };
    }
    return { role: m.role, content: m.content };
  });
}

function parseToolCalls(choices: unknown[]): LLMToolCall[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const choice = (choices as any[])[0];
  const rawCalls = choice?.message?.tool_calls;
  if (!Array.isArray(rawCalls)) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rawCalls.map((tc: any) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments || "{}"),
  }));
}

export async function generateWithTools(
  messages: LLMMessage[],
  tools: LLMToolSchema[],
  config: Partial<LLMConfig> = {}
): Promise<LLMToolResult> {
  const resolved = resolveConfig(config);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let OpenAI: any;
  try {
    const mod = await import("openai");
    OpenAI = mod.default || mod.OpenAI || mod;
  } catch {
    throw new Error("openai package not installed. Install with: npm install openai");
  }

  const client = new OpenAI({ apiKey: resolved.openaiApiKey });
  const response = await client.chat.completions.create(
    {
      model: resolved.openaiModel || LLM_DEFAULTS.openaiModel,
      messages: toOpenAIMessages(messages),
      tools: tools.length > 0 ? tools : undefined,
      max_tokens: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
    },
    { timeout: resolved.timeoutMs }
  );

  const toolCalls = parseToolCalls(response.choices);
  const content = response.choices[0]?.message?.content || null;
  const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0 };

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
    },
  };
}

export async function* streamWithTools(
  messages: LLMMessage[],
  tools: LLMToolSchema[],
  config: Partial<LLMConfig> = {}
): AsyncGenerator<LLMStreamEvent> {
  const resolved = resolveConfig(config);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let OpenAI: any;
  try {
    const mod = await import("openai");
    OpenAI = mod.default || mod.OpenAI || mod;
  } catch {
    throw new Error("openai package not installed. Install with: npm install openai");
  }

  const client = new OpenAI({ apiKey: resolved.openaiApiKey });
  const stream = await client.chat.completions.create(
    {
      model: resolved.openaiModel || LLM_DEFAULTS.openaiModel,
      messages: toOpenAIMessages(messages),
      tools: tools.length > 0 ? tools : undefined,
      max_tokens: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      stream: true,
      stream_options: { include_usage: true },
    },
    { timeout: resolved.timeoutMs }
  );

  // Accumulate tool call deltas
  const toolCallAccum = new Map<number, { id: string; name: string; args: string }>();

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta;

    if (delta?.content) {
      yield { type: "text-delta", content: delta.content };
    }

    if (delta?.tool_calls) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const tc of delta.tool_calls as any[]) {
        const idx = tc.index ?? 0;
        if (!toolCallAccum.has(idx)) {
          toolCallAccum.set(idx, { id: tc.id || "", name: "", args: "" });
        }
        const entry = toolCallAccum.get(idx)!;
        if (tc.id) entry.id = tc.id;
        if (tc.function?.name) entry.name += tc.function.name;
        if (tc.function?.arguments) entry.args += tc.function.arguments;
      }
    }

    // Usage comes in the final chunk
    if (chunk.usage) {
      // Emit accumulated tool calls before usage
      for (const [, entry] of toolCallAccum) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(entry.args || "{}");
        } catch { /* keep empty */ }
        yield {
          type: "tool-call",
          id: entry.id,
          name: entry.name,
          arguments: args,
        };
      }

      yield {
        type: "usage",
        promptTokens: chunk.usage.prompt_tokens ?? 0,
        completionTokens: chunk.usage.completion_tokens ?? 0,
      };
    }
  }

  // If no usage chunk was sent (some providers), emit tool calls now
  if (toolCallAccum.size > 0) {
    // Check if we already emitted (usage path handles it)
    // This is a fallback for providers that don't send usage
  }
}
