import type { LLMConfig } from "./types";
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from "./types";
import type {
  LLMMessage,
  LLMToolSchema,
  LLMToolResult,
  LLMToolCall,
  LLMStreamEvent,
  LLMContentPart,
  GenerationOptions,
  ToolChoiceValue,
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

function contentPartsToOpenAI(parts: LLMContentPart[]): unknown[] {
  return parts.map((part) => {
    if (part.type === "text") {
      return { type: "text", text: part.text };
    }
    const url = part.url
      ? part.url
      : `data:${part.mimeType ?? "image/jpeg"};base64,${part.base64}`;
    return { type: "image_url", image_url: { url } };
  });
}

function toOpenAIMessages(messages: LLMMessage[]): unknown[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      // tool role always carries string content
      return { role: "tool", content: m.content, tool_call_id: m.toolCallId };
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      return {
        role: "assistant",
        content: Array.isArray(m.content)
          ? contentPartsToOpenAI(m.content)
          : (m.content || null),
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      };
    }
    return {
      role: m.role,
      content: Array.isArray(m.content) ? contentPartsToOpenAI(m.content) : m.content,
    };
  });
}

function toOpenAIToolChoice(toolChoice: ToolChoiceValue): unknown {
  if (toolChoice === "auto" || toolChoice === "none" || toolChoice === "required") {
    return toolChoice;
  }
  return { type: "function", function: { name: toolChoice.toolName } };
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
  config: Partial<LLMConfig> = {},
  opts?: GenerationOptions
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

  const client = new OpenAI({
    apiKey: resolved.openaiApiKey,
    ...(resolved.providerBaseUrl ? { baseURL: resolved.providerBaseUrl } : {}),
  });
  const response = await client.chat.completions.create(
    {
      model: resolved.openaiModel || LLM_DEFAULTS.openaiModel,
      messages: toOpenAIMessages(messages),
      tools: tools.length > 0 ? tools : undefined,
      max_tokens: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      ...(opts?.topP !== undefined && { top_p: opts.topP }),
      ...(opts?.stop !== undefined && { stop: opts.stop }),
      ...(tools.length > 0 && opts?.toolChoice !== undefined && {
        tool_choice: toOpenAIToolChoice(opts.toolChoice),
      }),
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
  config: Partial<LLMConfig> = {},
  opts?: GenerationOptions
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

  const client = new OpenAI({
    apiKey: resolved.openaiApiKey,
    ...(resolved.providerBaseUrl ? { baseURL: resolved.providerBaseUrl } : {}),
  });
  const stream = await client.chat.completions.create(
    {
      model: resolved.openaiModel || LLM_DEFAULTS.openaiModel,
      messages: toOpenAIMessages(messages),
      tools: tools.length > 0 ? tools : undefined,
      max_tokens: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      stream: true,
      stream_options: { include_usage: true },
      ...(opts?.topP !== undefined && { top_p: opts.topP }),
      ...(opts?.stop !== undefined && { stop: opts.stop }),
      ...(tools.length > 0 && opts?.toolChoice !== undefined && {
        tool_choice: toOpenAIToolChoice(opts.toolChoice),
      }),
    },
    { timeout: resolved.timeoutMs }
  );

  const toolCallAccum = new Map<number, { id: string; name: string; args: string }>();
  let toolCallsEmitted = false;

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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      toolCallsEmitted = true;

      yield {
        type: "usage",
        promptTokens: chunk.usage.prompt_tokens ?? 0,
        completionTokens: chunk.usage.completion_tokens ?? 0,
      };
    }
  }

  // Fallback: emit tool calls if no usage chunk was received
  if (toolCallAccum.size > 0 && !toolCallsEmitted) {
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
  }
}
