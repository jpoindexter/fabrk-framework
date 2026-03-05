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
  const merged = { ...LLM_DEFAULTS, ...config, provider: "google" as const };
  if (!merged.googleApiKey) {
    const g = globalThis as Record<string, unknown>;
    const proc = g.process as { env?: Record<string, string> } | undefined;
    merged.googleApiKey = proc?.env?.GOOGLE_API_KEY || "";
  }
  return merged;
}

function contentPartsToGemini(parts: LLMContentPart[]): Array<{ text: string }> {
  // Google Gemini vision is behind a different API path — skip image parts with a warning
  return parts.flatMap((part) => {
    if (part.type === "text") return [{ text: part.text }];
    console.warn("[fabrk/google-tools] Image content parts are not supported by this Google adapter — skipping image part");
    return [];
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGeminiContents(messages: LLMMessage[]): { systemInstruction?: any; contents: any[] } {
  let systemInstruction: { parts: Array<{ text: string }> } | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents: any[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemInstruction = { parts: [{ text: m.content as string }] };
      continue;
    }
    if (m.role === "tool") {
      contents.push({
        role: "function",
        parts: [{
          functionResponse: {
            name: m.toolCallId || "unknown",
            response: { result: m.content },
          },
        }],
      });
      continue;
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [];
      if (Array.isArray(m.content)) {
        parts.push(...contentPartsToGemini(m.content));
      } else if (m.content) {
        parts.push({ text: m.content });
      }
      for (const tc of m.toolCalls) {
        parts.push({
          functionCall: { name: tc.name, args: tc.arguments },
        });
      }
      contents.push({ role: "model", parts });
      continue;
    }
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: Array.isArray(m.content) ? contentPartsToGemini(m.content) : [{ text: m.content }],
    });
  }

  return { systemInstruction, contents };
}

function toGeminiToolConfig(toolChoice: ToolChoiceValue): unknown {
  if (toolChoice === "auto") return { functionCallingConfig: { mode: "AUTO" } };
  if (toolChoice === "none") return { functionCallingConfig: { mode: "NONE" } };
  if (toolChoice === "required") return { functionCallingConfig: { mode: "ANY" } };
  return { functionCallingConfig: { mode: "ANY", allowedFunctionNames: [toolChoice.toolName] } };
}

function toGeminiTools(tools: LLMToolSchema[]): unknown[] {
  return [{
    functionDeclarations: tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
  }];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseToolCalls(response: any): LLMToolCall[] {
  const calls: LLMToolCall[] = [];
  const candidates = response.candidates || [];
  for (const candidate of candidates) {
    for (const part of candidate.content?.parts || []) {
      if (part.functionCall) {
        calls.push({
          id: `call_${calls.length}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
        });
      }
    }
  }
  return calls;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(response: any): string | null {
  const candidates = response.candidates || [];
  for (const candidate of candidates) {
    for (const part of candidate.content?.parts || []) {
      if (part.text) return part.text;
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getClient(config: LLMConfig): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GoogleGenerativeAI: any;
  try {
    const mod = await import("@google/generative-ai");
    GoogleGenerativeAI = mod.GoogleGenerativeAI;
  } catch {
    throw new Error(
      "@google/generative-ai not installed. Install with: npm install @google/generative-ai"
    );
  }

  const client = new GoogleGenerativeAI(config.googleApiKey);
  return client.getGenerativeModel({
    model: config.googleModel || LLM_DEFAULTS.googleModel,
  });
}

export async function generateWithTools(
  messages: LLMMessage[],
  tools: LLMToolSchema[],
  config: Partial<LLMConfig> = {},
  opts?: GenerationOptions
): Promise<LLMToolResult> {
  const resolved = resolveConfig(config);
  const model = await getClient(resolved);
  const { systemInstruction, contents } = toGeminiContents(messages);

  const stopSequences = opts?.stop !== undefined
    ? (Array.isArray(opts.stop) ? opts.stop : [opts.stop])
    : undefined;

  const response = await model.generateContent({
    systemInstruction,
    contents,
    tools: tools.length > 0 ? toGeminiTools(tools) : undefined,
    ...(opts?.toolChoice !== undefined && tools.length > 0 && {
      toolConfig: toGeminiToolConfig(opts.toolChoice),
    }),
    generationConfig: {
      maxOutputTokens: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      ...(opts?.topP !== undefined && { topP: opts.topP }),
      ...(stopSequences !== undefined && { stopSequences }),
    },
  });

  const toolCalls = parseToolCalls(response.response);
  const content = extractText(response.response);
  const usage = response.response.usageMetadata ?? {};

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: {
      promptTokens: usage.promptTokenCount ?? 0,
      completionTokens: usage.candidatesTokenCount ?? 0,
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
  const model = await getClient(resolved);
  const { systemInstruction, contents } = toGeminiContents(messages);

  const stopSequences = opts?.stop !== undefined
    ? (Array.isArray(opts.stop) ? opts.stop : [opts.stop])
    : undefined;

  const response = await model.generateContentStream({
    systemInstruction,
    contents,
    tools: tools.length > 0 ? toGeminiTools(tools) : undefined,
    ...(opts?.toolChoice !== undefined && tools.length > 0 && {
      toolConfig: toGeminiToolConfig(opts.toolChoice),
    }),
    generationConfig: {
      maxOutputTokens: Math.min(resolved.maxTokens ?? MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      temperature: resolved.temperature,
      ...(opts?.topP !== undefined && { topP: opts.topP }),
      ...(stopSequences !== undefined && { stopSequences }),
    },
  });

  let toolCallCount = 0;

  for await (const chunk of response.stream) {
    const candidates = chunk.candidates || [];
    for (const candidate of candidates) {
      for (const part of candidate.content?.parts || []) {
        if (part.text) {
          yield { type: "text-delta", content: part.text };
        }
        if (part.functionCall) {
          yield {
            type: "tool-call",
            id: `call_${toolCallCount++}`,
            name: part.functionCall.name,
            arguments: part.functionCall.args || {},
          };
        }
      }
    }

    const usage = chunk.usageMetadata;
    if (usage) {
      yield {
        type: "usage",
        promptTokens: usage.promptTokenCount ?? 0,
        completionTokens: usage.candidatesTokenCount ?? 0,
      };
    }
  }
}
