import type { ProviderAdapter } from "./registry";
import { registerProvider } from "./registry";
import type { LLMConfig } from "./types";
import { resolveEnv } from "../utils/env";

export interface OpenAICompatOptions {
  key: string;
  baseURL: string;
  envKey: string;
  prefixes: string[];
  defaults?: { model?: string };
  stripPrefix?: string;
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
      const providerBaseURL = opts.baseURL;
      return async (messages, tools, genOpts) => {
        const { generateWithTools } = await import("./openai-tools");
        return generateWithTools(messages, tools, {
          ...config,
          openaiApiKey: resolveApiKey(config),
          openaiModel: resolveModel(config),
          providerBaseUrl: providerBaseURL,
        }, genOpts);
      };
    },

    makeStreamWithTools(config) {
      const providerBaseURL = opts.baseURL;
      return async function* (messages, tools, genOpts) {
        const { streamWithTools } = await import("./openai-tools");
        yield* streamWithTools(messages, tools, {
          ...config,
          openaiApiKey: resolveApiKey(config),
          openaiModel: resolveModel(config),
          providerBaseUrl: providerBaseURL,
        }, genOpts);
      };
    },
  };
}

export { registerProvider };
