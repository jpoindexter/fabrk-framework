import type { LLMConfig } from "./types";
import type {
  LLMMessage,
  LLMToolSchema,
  LLMToolResult,
  LLMStreamEvent,
} from "./tool-types";

export interface ProviderAdapter {
  key: string;
  prefixes: string[];
  envKey: string;
  makeGenerateWithTools: (
    config: Partial<LLMConfig>
  ) => (
    messages: LLMMessage[],
    tools: LLMToolSchema[],
  ) => Promise<LLMToolResult>;
  makeStreamWithTools: (
    config: Partial<LLMConfig>
  ) => (
    messages: LLMMessage[],
    tools: LLMToolSchema[],
  ) => AsyncGenerator<LLMStreamEvent>;
}

const providers = new Map<string, ProviderAdapter>();

export function registerProvider(key: string, adapter: ProviderAdapter): void {
  providers.set(key, adapter);
}

export function getProvider(modelString: string): ProviderAdapter | undefined {
  // Longest-prefix-first: sort by prefix length descending to avoid ambiguity
  let bestMatch: ProviderAdapter | undefined;
  let bestLen = 0;

  for (const adapter of providers.values()) {
    for (const prefix of adapter.prefixes) {
      if (modelString.startsWith(prefix) && prefix.length > bestLen) {
        bestMatch = adapter;
        bestLen = prefix.length;
      }
    }
  }

  return bestMatch;
}

export function getProviderByKey(key: string): ProviderAdapter | undefined {
  return providers.get(key);
}

export function listProviders(): string[] {
  return [...providers.keys()];
}

// -- Built-in provider registrations --

registerProvider("openai", {
  key: "openai",
  prefixes: ["gpt-", "o1-", "o3-", "o4-", "chatgpt-"],
  envKey: "OPENAI_API_KEY",
  makeGenerateWithTools(config) {
    return async (messages, tools) => {
      const { generateWithTools } = await import("./openai-tools");
      return generateWithTools(messages, tools, {
        ...config,
        openaiModel: config.openaiModel || extractModel(config),
      });
    };
  },
  makeStreamWithTools(config) {
    return async function* (messages, tools) {
      const { streamWithTools } = await import("./openai-tools");
      yield* streamWithTools(messages, tools, {
        ...config,
        openaiModel: config.openaiModel || extractModel(config),
      });
    };
  },
});

registerProvider("anthropic", {
  key: "anthropic",
  prefixes: ["claude-"],
  envKey: "ANTHROPIC_API_KEY",
  makeGenerateWithTools(config) {
    return async (messages, tools) => {
      const { generateWithTools } = await import("./anthropic-tools");
      return generateWithTools(messages, tools, {
        ...config,
        anthropicModel: config.anthropicModel || extractModel(config),
      });
    };
  },
  makeStreamWithTools(config) {
    return async function* (messages, tools) {
      const { streamWithTools } = await import("./anthropic-tools");
      yield* streamWithTools(messages, tools, {
        ...config,
        anthropicModel: config.anthropicModel || extractModel(config),
      });
    };
  },
});

registerProvider("google", {
  key: "google",
  prefixes: ["gemini-"],
  envKey: "GOOGLE_AI_API_KEY",
  makeGenerateWithTools(config) {
    return async (messages, tools) => {
      // Google uses OpenAI-compatible endpoint via openai SDK
      const { generateWithTools } = await import("./openai-tools");
      return generateWithTools(messages, tools, {
        ...config,
        openaiApiKey: resolveEnv("GOOGLE_AI_API_KEY"),
        openaiModel: extractModel(config),
      });
    };
  },
  makeStreamWithTools(config) {
    return async function* (messages, tools) {
      const { streamWithTools } = await import("./openai-tools");
      yield* streamWithTools(messages, tools, {
        ...config,
        openaiApiKey: resolveEnv("GOOGLE_AI_API_KEY"),
        openaiModel: extractModel(config),
      });
    };
  },
});

registerProvider("ollama", {
  key: "ollama",
  prefixes: ["ollama:"],
  envKey: "",
  makeGenerateWithTools(config) {
    return async (messages, tools) => {
      const { generateWithTools } = await import("./openai-tools");
      const model = extractModel(config);
      const stripped = model.startsWith("ollama:") ? model.slice(7) : model;
      const baseUrl = config.ollamaBaseUrl || "http://localhost:11434";
      return generateWithTools(messages, tools, {
        ...config,
        openaiApiKey: "ollama",
        openaiModel: stripped,
        // OpenAI SDK accepts baseURL via config — we set it via env resolution
      });
    };
  },
  makeStreamWithTools(config) {
    return async function* (messages, tools) {
      const { streamWithTools } = await import("./openai-tools");
      const model = extractModel(config);
      const stripped = model.startsWith("ollama:") ? model.slice(7) : model;
      yield* streamWithTools(messages, tools, {
        ...config,
        openaiApiKey: "ollama",
        openaiModel: stripped,
      });
    };
  },
});

function extractModel(config: Partial<LLMConfig>): string {
  return (config as Record<string, unknown>)._model as string || "";
}

function resolveEnv(key: string): string {
  const g = globalThis as Record<string, unknown>;
  const proc = g.process as { env?: Record<string, string> } | undefined;
  return proc?.env?.[key] || "";
}
