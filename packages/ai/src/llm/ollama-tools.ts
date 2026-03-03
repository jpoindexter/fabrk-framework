import type { LLMConfig } from "./types";
import { LLM_DEFAULTS, MAX_TOKENS_LIMIT } from "./types";
import { validateOllamaUrl } from "./ollama-client";
import type {
  LLMMessage,
  LLMToolSchema,
  LLMToolResult,
  LLMToolCall,
  LLMStreamEvent,
  LLMContentPart,
} from "./tool-types";

function resolveConfig(config: Partial<LLMConfig> = {}): LLMConfig {
  return { ...LLM_DEFAULTS, ...config, provider: "ollama" as const };
}

function contentPartsToOllama(parts: LLMContentPart[]): string {
  // Ollama's text API — skip image parts with a warning, concatenate text parts
  const textParts: string[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      textParts.push(part.text);
    } else {
      console.warn("[fabrk/ollama-tools] Image content parts are not supported by this Ollama adapter — skipping image part");
    }
  }
  return textParts.join("");
}

function toOllamaMessages(messages: LLMMessage[]): unknown[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      return { role: "tool", content: m.content };
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      return {
        role: "assistant",
        content: Array.isArray(m.content) ? contentPartsToOllama(m.content) : (m.content || ""),
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };
    }
    return {
      role: m.role,
      content: Array.isArray(m.content) ? contentPartsToOllama(m.content) : m.content,
    };
  });
}

function toOllamaTools(tools: LLMToolSchema[]): unknown[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    },
  }));
}

export async function generateWithTools(
  messages: LLMMessage[],
  tools: LLMToolSchema[],
  config: Partial<LLMConfig> = {}
): Promise<LLMToolResult> {
  const resolved = resolveConfig(config);
  const baseUrl = resolved.ollamaBaseUrl || LLM_DEFAULTS.ollamaBaseUrl;
  validateOllamaUrl(baseUrl);

  const model = resolved.ollamaModel || LLM_DEFAULTS.ollamaModel;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: toOllamaMessages(messages),
      tools: tools.length > 0 ? toOllamaTools(tools) : undefined,
      stream: false,
      options: {
        temperature: resolved.temperature,
        num_predict: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      },
    }),
    signal: AbortSignal.timeout(resolved.timeoutMs || LLM_DEFAULTS.timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  const toolCalls: LLMToolCall[] = [];
  if (Array.isArray(data.message?.tool_calls)) {
    for (const tc of data.message.tool_calls) {
      toolCalls.push({
        id: tc.id || `call_${toolCalls.length}`,
        name: tc.function?.name || "",
        arguments: tc.function?.arguments || {},
      });
    }
  }

  return {
    content: data.message?.content || null,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: {
      promptTokens: data.prompt_eval_count ?? 0,
      completionTokens: data.eval_count ?? 0,
    },
  };
}

export async function* streamWithTools(
  messages: LLMMessage[],
  tools: LLMToolSchema[],
  config: Partial<LLMConfig> = {}
): AsyncGenerator<LLMStreamEvent> {
  const resolved = resolveConfig(config);
  const baseUrl = resolved.ollamaBaseUrl || LLM_DEFAULTS.ollamaBaseUrl;
  validateOllamaUrl(baseUrl);

  const model = resolved.ollamaModel || LLM_DEFAULTS.ollamaModel;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: toOllamaMessages(messages),
      tools: tools.length > 0 ? toOllamaTools(tools) : undefined,
      stream: true,
      options: {
        temperature: resolved.temperature,
        num_predict: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      },
    }),
    signal: AbortSignal.timeout(resolved.timeoutMs || LLM_DEFAULTS.timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body from Ollama");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let chunk;
        try {
          chunk = JSON.parse(line);
        } catch {
          continue;
        }

        if (chunk.message?.content) {
          yield { type: "text-delta", content: chunk.message.content };
        }

        if (Array.isArray(chunk.message?.tool_calls)) {
          for (let i = 0; i < chunk.message.tool_calls.length; i++) {
            const tc = chunk.message.tool_calls[i];
            yield {
              type: "tool-call",
              id: tc.id || `call_${i}`,
              name: tc.function?.name || "",
              arguments: tc.function?.arguments || {},
            };
          }
        }

        if (chunk.done) {
          yield {
            type: "usage",
            promptTokens: chunk.prompt_eval_count ?? 0,
            completionTokens: chunk.eval_count ?? 0,
          };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
