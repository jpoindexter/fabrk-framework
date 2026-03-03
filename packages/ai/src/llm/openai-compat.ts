import type { ProviderAdapter } from "./registry";
import { registerProvider } from "./registry";
import type { LLMConfig } from "./types";

export interface OpenAICompatOptions {
  key: string;
  baseURL: string;
  envKey: string;
  prefixes: string[];
  defaults?: { model?: string };
  stripPrefix?: string;
}

function resolveEnv(key: string): string {
  const g = globalThis as Record<string, unknown>;
  const proc = g.process as { env?: Record<string, string> } | undefined;
  return proc?.env?.[key] || "";
}

export function makeOpenAICompatAdapter(opts: OpenAICompatOptions): ProviderAdapter {
  function resolveModel(config: Partial<LLMConfig>): string {
    const raw = (config as Record<string, unknown>)._model as string
      || config.openaiModel
      || opts.defaults?.model
      || "";
    if (opts.stripPrefix && raw.startsWith(opts.stripPrefix)) {
      return raw.slice(opts.stripPrefix.length);
    }
    return raw;
  }

  function resolveApiKey(config: Partial<LLMConfig>): string {
    return (config as Record<string, unknown>).providerApiKey as string
      || config.openaiApiKey
      || resolveEnv(opts.envKey);
  }

  return {
    key: opts.key,
    prefixes: opts.prefixes,
    envKey: opts.envKey,

    makeGenerateWithTools(config) {
      return async (messages, tools) => {
        const { generateWithTools } = await import("./openai-tools");
        return generateWithTools(messages, tools, {
          ...config,
          openaiApiKey: resolveApiKey(config),
          openaiModel: resolveModel(config),
          // baseURL is injected via env-based OpenAI client construction
        });
      };
    },

    makeStreamWithTools(config) {
      return async function* (messages, tools) {
        const { streamWithTools } = await import("./openai-tools");
        yield* streamWithTools(messages, tools, {
          ...config,
          openaiApiKey: resolveApiKey(config),
          openaiModel: resolveModel(config),
        });
      };
    },
  };
}

// -- Register OpenAI-compatible providers --

registerProvider("groq", makeOpenAICompatAdapter({
  key: "groq",
  baseURL: "https://api.groq.com/openai/v1",
  envKey: "GROQ_API_KEY",
  prefixes: ["groq:"],
  stripPrefix: "groq:",
}));

registerProvider("together", makeOpenAICompatAdapter({
  key: "together",
  baseURL: "https://api.together.xyz/v1",
  envKey: "TOGETHER_API_KEY",
  prefixes: ["together:"],
  stripPrefix: "together:",
}));

registerProvider("fireworks", makeOpenAICompatAdapter({
  key: "fireworks",
  baseURL: "https://api.fireworks.ai/inference/v1",
  envKey: "FIREWORKS_API_KEY",
  prefixes: ["accounts/fireworks/"],
}));

registerProvider("deepseek", makeOpenAICompatAdapter({
  key: "deepseek",
  baseURL: "https://api.deepseek.com/v1",
  envKey: "DEEPSEEK_API_KEY",
  prefixes: ["deepseek-"],
}));

registerProvider("xai", makeOpenAICompatAdapter({
  key: "xai",
  baseURL: "https://api.x.ai/v1",
  envKey: "XAI_API_KEY",
  prefixes: ["grok-"],
}));

registerProvider("perplexity", makeOpenAICompatAdapter({
  key: "perplexity",
  baseURL: "https://api.perplexity.ai",
  envKey: "PPLX_API_KEY",
  prefixes: ["pplx-", "llama-3.1-sonar"],
}));

registerProvider("mistral", makeOpenAICompatAdapter({
  key: "mistral",
  baseURL: "https://api.mistral.ai/v1",
  envKey: "MISTRAL_API_KEY",
  prefixes: ["mistral-", "codestral-"],
}));

registerProvider("azure", makeOpenAICompatAdapter({
  key: "azure",
  baseURL: "", // Azure requires per-deployment URL, set via providerBaseUrl
  envKey: "AZURE_OPENAI_API_KEY",
  prefixes: ["azure:"],
  stripPrefix: "azure:",
}));
