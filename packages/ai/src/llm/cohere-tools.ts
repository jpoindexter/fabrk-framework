import type { LLMConfig } from "./types";
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from "./types";
import type {
  LLMMessage,
  LLMToolSchema,
  LLMToolResult,
  LLMToolCall,
  LLMStreamEvent,
  LLMContentPart,
} from "./tool-types";
import { registerProvider } from "./registry";

function resolveApiKey(config: Partial<LLMConfig>): string {
  const explicit = (config as Record<string, unknown>).providerApiKey as string | undefined;
  if (explicit) return explicit;
  const g = globalThis as Record<string, unknown>;
  const proc = g.process as { env?: Record<string, string> } | undefined;
  return proc?.env?.COHERE_API_KEY || "";
}

function resolveModel(config: Partial<LLMConfig>): string {
  return (config as Record<string, unknown>)._model as string || "command-r-plus";
}

interface CohereMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

/** Extract text from content — Cohere does not support multimodal input parts */
function contentToString(content: string | LLMContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function toCohereMessages(messages: LLMMessage[]): CohereMessage[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      return {
        role: "tool" as const,
        content: contentToString(m.content),
        tool_call_id: m.toolCallId,
      };
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      return {
        role: "assistant" as const,
        content: contentToString(m.content) || "",
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      };
    }
    return { role: m.role, content: contentToString(m.content) };
  });
}

function toCohereTools(tools: LLMToolSchema[]): unknown[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    },
  }));
}

function parseToolCalls(data: Record<string, unknown>): LLMToolCall[] {
  const rawCalls = data.tool_calls as Array<{
    id: string;
    function: { name: string; arguments: string };
  }> | undefined;
  if (!Array.isArray(rawCalls)) return [];
  return rawCalls.map((tc) => ({
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
  const apiKey = resolveApiKey(config);
  const model = resolveModel(config);

  const body: Record<string, unknown> = {
    model,
    messages: toCohereMessages(messages),
    max_tokens: Math.min(config.maxTokens ?? LLM_DEFAULTS.maxTokens, MAX_TOKENS_LIMIT),
    temperature: config.temperature ?? LLM_DEFAULTS.temperature,
  };
  if (tools.length > 0) {
    body.tools = toCohereTools(tools);
  }

  const response = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeoutMs ?? LLM_DEFAULTS.timeoutMs),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Cohere API error: ${response.status} ${text.slice(0, 200)}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const message = data.message as Record<string, unknown> | undefined;
  const content = (message?.content as Array<{ text: string }> | undefined)?.[0]?.text ?? null;
  const toolCalls = message ? parseToolCalls(message) : [];
  const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: {
      promptTokens: usage?.input_tokens ?? 0,
      completionTokens: usage?.output_tokens ?? 0,
    },
  };
}

export async function* streamWithTools(
  messages: LLMMessage[],
  tools: LLMToolSchema[],
  config: Partial<LLMConfig> = {}
): AsyncGenerator<LLMStreamEvent> {
  const apiKey = resolveApiKey(config);
  const model = resolveModel(config);

  const body: Record<string, unknown> = {
    model,
    messages: toCohereMessages(messages),
    max_tokens: Math.min(config.maxTokens ?? LLM_DEFAULTS.maxTokens, MAX_TOKENS_LIMIT),
    temperature: config.temperature ?? LLM_DEFAULTS.temperature,
    stream: true,
  };
  if (tools.length > 0) {
    body.tools = toCohereTools(tools);
  }

  const response = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeoutMs ?? LLM_DEFAULTS.timeoutMs),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Cohere API error: ${response.status} ${text.slice(0, 200)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body from Cohere streaming");

  const decoder = new TextDecoder();
  let buffer = "";
  const toolCallAccum = new Map<string, { id: string; name: string; args: string }>();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim() || !line.startsWith("data: ")) continue;
        const json = line.slice(6);
        if (json === "[DONE]") continue;

        let event: Record<string, unknown>;
        try {
          event = JSON.parse(json);
        } catch {
          continue;
        }

        const eventType = event.type as string;

        if (eventType === "content-delta") {
          const delta = event.delta as { message?: { content?: { text?: string } } } | undefined;
          const text = delta?.message?.content?.text;
          if (text) {
            yield { type: "text-delta", content: text };
          }
        } else if (eventType === "tool-call-start") {
          const delta = event.delta as { message?: { tool_calls?: { id: string; function: { name: string } } } } | undefined;
          const tc = delta?.message?.tool_calls;
          if (tc) {
            toolCallAccum.set(tc.id, { id: tc.id, name: tc.function.name, args: "" });
          }
        } else if (eventType === "tool-call-delta") {
          const delta = event.delta as { message?: { tool_calls?: { id: string; function: { arguments: string } } } } | undefined;
          const tc = delta?.message?.tool_calls;
          if (tc && toolCallAccum.has(tc.id)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            toolCallAccum.get(tc.id)!.args += tc.function.arguments;
          }
        } else if (eventType === "tool-call-end") {
          // Emit all accumulated tool calls
          for (const [id, entry] of toolCallAccum) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(entry.args || "{}");
            } catch { /* keep empty */ }
            yield { type: "tool-call", id: entry.id, name: entry.name, arguments: args };
            toolCallAccum.delete(id);
          }
        } else if (eventType === "message-end") {
          const delta = event.delta as { usage?: { input_tokens?: number; output_tokens?: number } } | undefined;
          if (delta?.usage) {
            yield {
              type: "usage",
              promptTokens: delta.usage.input_tokens ?? 0,
              completionTokens: delta.usage.output_tokens ?? 0,
            };
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Emit any remaining tool calls
  for (const [, entry] of toolCallAccum) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(entry.args || "{}");
    } catch { /* keep empty */ }
    yield { type: "tool-call", id: entry.id, name: entry.name, arguments: args };
  }
}

// Register Cohere provider
registerProvider("cohere", {
  key: "cohere",
  prefixes: ["command-"],
  envKey: "COHERE_API_KEY",
  makeGenerateWithTools(config) {
    return (messages, tools) => generateWithTools(messages, tools, config);
  },
  makeStreamWithTools(config) {
    return (messages, tools) => streamWithTools(messages, tools, config);
  },
});
