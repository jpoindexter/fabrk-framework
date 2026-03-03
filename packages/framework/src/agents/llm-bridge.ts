export type LLMProvider = "openai" | "anthropic" | "google" | "ollama" | string;

export interface LLMBridge {
  model: string;
  resolvedModel: string;
  provider: LLMProvider;
}

function detectProvider(model: string): LLMProvider {
  if (model.startsWith("ollama:")) return "ollama";
  if (model.startsWith("bedrock:")) return "bedrock";
  if (model.startsWith("azure:")) return "azure";
  if (model.startsWith("together:")) return "together";
  if (model.startsWith("groq:")) return "groq";
  if (model.startsWith("claude") || model.startsWith("anthropic"))
    return "anthropic";
  if (model.startsWith("gemini")) return "google";
  if (model.startsWith("command-")) return "cohere";
  if (model.startsWith("deepseek-")) return "deepseek";
  if (model.startsWith("mistral-") || model.startsWith("codestral-"))
    return "mistral";
  if (model.startsWith("grok-")) return "xai";
  if (model.startsWith("pplx-") || model.startsWith("llama-3.1-sonar"))
    return "perplexity";
  if (model.startsWith("accounts/fireworks/")) return "fireworks";
  return "openai";
}

function resolveModel(model: string): string {
  if (model.startsWith("ollama:")) return model.slice("ollama:".length);
  if (model.startsWith("bedrock:")) return model.slice("bedrock:".length);
  if (model.startsWith("azure:")) return model.slice("azure:".length);
  if (model.startsWith("together:")) return model.slice("together:".length);
  if (model.startsWith("groq:")) return model.slice("groq:".length);
  return model;
}

export function createLLMBridge(options: { model: string }): LLMBridge {
  return {
    model: options.model,
    resolvedModel: resolveModel(options.model),
    provider: detectProvider(options.model),
  };
}
