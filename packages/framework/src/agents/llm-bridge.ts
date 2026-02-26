export type LLMProvider = "openai" | "anthropic" | "google" | "ollama";

export interface LLMBridge {
  model: string;
  resolvedModel: string;
  provider: LLMProvider;
}

function detectProvider(model: string): LLMProvider {
  if (model.startsWith("ollama:")) return "ollama";
  if (model.startsWith("claude") || model.startsWith("anthropic"))
    return "anthropic";
  if (model.startsWith("gemini")) return "google";
  return "openai";
}

function resolveModel(model: string): string {
  if (model.startsWith("ollama:")) return model.slice("ollama:".length);
  return model;
}

export function createLLMBridge(options: { model: string }): LLMBridge {
  return {
    model: options.model,
    resolvedModel: resolveModel(options.model),
    provider: detectProvider(options.model),
  };
}
