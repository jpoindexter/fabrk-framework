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

registerProvider("openrouter", makeOpenAICompatAdapter({
  key: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  envKey: "OPENROUTER_API_KEY",
  prefixes: ["openrouter:", "or:"],
  stripPrefix: "or:",
}));

registerProvider("cerebras", makeOpenAICompatAdapter({
  key: "cerebras",
  baseURL: "https://api.cerebras.ai/v1",
  envKey: "CEREBRAS_API_KEY",
  prefixes: ["cerebras:"],
  stripPrefix: "cerebras:",
}));

registerProvider("lmstudio", makeOpenAICompatAdapter({
  key: "lmstudio",
  baseURL: "http://localhost:1234/v1",
  envKey: "",
  prefixes: ["lmstudio:"],
  stripPrefix: "lmstudio:",
}));

registerProvider("nim", makeOpenAICompatAdapter({
  key: "nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  envKey: "NIM_API_KEY",
  prefixes: ["nim:"],
  stripPrefix: "nim:",
}));

// === Batch 2: Additional OpenAI-compatible providers ===

registerProvider("huggingface", makeOpenAICompatAdapter({
  key: "huggingface",
  baseURL: "https://api-inference.huggingface.co/v1",
  envKey: "HF_TOKEN",
  prefixes: ["hf:"],
  stripPrefix: "hf:",
}));

registerProvider("replicate", makeOpenAICompatAdapter({
  key: "replicate",
  baseURL: "https://api.replicate.com/openai/v1",
  envKey: "REPLICATE_API_KEY",
  prefixes: ["replicate:"],
  stripPrefix: "replicate:",
}));

registerProvider("deepinfra", makeOpenAICompatAdapter({
  key: "deepinfra",
  baseURL: "https://api.deepinfra.com/v1/openai",
  envKey: "DEEPINFRA_API_KEY",
  prefixes: ["deepinfra:"],
  stripPrefix: "deepinfra:",
}));

registerProvider("sambanova", makeOpenAICompatAdapter({
  key: "sambanova",
  baseURL: "https://api.sambanova.ai/v1",
  envKey: "SAMBANOVA_API_KEY",
  prefixes: ["sambanova:"],
  stripPrefix: "sambanova:",
}));

registerProvider("hyperbolic", makeOpenAICompatAdapter({
  key: "hyperbolic",
  baseURL: "https://api.hyperbolic.xyz/v1",
  envKey: "HYPERBOLIC_API_KEY",
  prefixes: ["hyperbolic:"],
  stripPrefix: "hyperbolic:",
}));

registerProvider("novita", makeOpenAICompatAdapter({
  key: "novita",
  baseURL: "https://api.novita.ai/v3/openai",
  envKey: "NOVITA_API_KEY",
  prefixes: ["novita:"],
  stripPrefix: "novita:",
}));

registerProvider("friendli", makeOpenAICompatAdapter({
  key: "friendli",
  baseURL: "https://inference.friendli.ai/v1",
  envKey: "FRIENDLI_TOKEN",
  prefixes: ["friendli:"],
  stripPrefix: "friendli:",
}));

registerProvider("upstage", makeOpenAICompatAdapter({
  key: "upstage",
  baseURL: "https://api.upstage.ai/v1",
  envKey: "UPSTAGE_API_KEY",
  prefixes: ["upstage:", "solar-"],
  stripPrefix: "upstage:",
}));

registerProvider("writer", makeOpenAICompatAdapter({
  key: "writer",
  baseURL: "https://api.writer.com/v1",
  envKey: "WRITER_API_KEY",
  prefixes: ["writer:", "palmyra-"],
  stripPrefix: "writer:",
}));

registerProvider("lambda", makeOpenAICompatAdapter({
  key: "lambda",
  baseURL: "https://api.lambdalabs.com/v1",
  envKey: "LAMBDA_API_KEY",
  prefixes: ["lambda:"],
  stripPrefix: "lambda:",
}));

registerProvider("reka", makeOpenAICompatAdapter({
  key: "reka",
  baseURL: "https://api.reka.ai/v1",
  envKey: "REKA_API_KEY",
  prefixes: ["reka-"],
}));

registerProvider("ai21", makeOpenAICompatAdapter({
  key: "ai21",
  baseURL: "https://api.ai21.com/studio/v1",
  envKey: "AI21_API_KEY",
  prefixes: ["ai21:", "jamba-"],
  stripPrefix: "ai21:",
}));

registerProvider("moonshot", makeOpenAICompatAdapter({
  key: "moonshot",
  baseURL: "https://api.moonshot.cn/v1",
  envKey: "MOONSHOT_API_KEY",
  prefixes: ["moonshot:", "kimi-"],
  stripPrefix: "moonshot:",
}));

registerProvider("zhipu", makeOpenAICompatAdapter({
  key: "zhipu",
  baseURL: "https://open.bigmodel.cn/api/paas/v4",
  envKey: "ZHIPU_API_KEY",
  prefixes: ["zhipu:", "glm-"],
  stripPrefix: "zhipu:",
}));

registerProvider("yi", makeOpenAICompatAdapter({
  key: "yi",
  baseURL: "https://api.01.ai/v1",
  envKey: "YI_API_KEY",
  prefixes: ["yi-"],
}));

registerProvider("qwen", makeOpenAICompatAdapter({
  key: "qwen",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  envKey: "DASHSCOPE_API_KEY",
  prefixes: ["qwen-"],
}));

registerProvider("minimax", makeOpenAICompatAdapter({
  key: "minimax",
  baseURL: "https://api.minimax.chat/v1",
  envKey: "MINIMAX_API_KEY",
  prefixes: ["minimax:", "abab"],
  stripPrefix: "minimax:",
}));

registerProvider("stepfun", makeOpenAICompatAdapter({
  key: "stepfun",
  baseURL: "https://api.stepfun.com/v1",
  envKey: "STEPFUN_API_KEY",
  prefixes: ["step-"],
}));

registerProvider("baichuan", makeOpenAICompatAdapter({
  key: "baichuan",
  baseURL: "https://api.baichuan-ai.com/v1",
  envKey: "BAICHUAN_API_KEY",
  prefixes: ["baichuan:"],
  stripPrefix: "baichuan:",
}));

registerProvider("maritaca", makeOpenAICompatAdapter({
  key: "maritaca",
  baseURL: "https://chat.maritaca.ai/api",
  envKey: "MARITACA_KEY",
  prefixes: ["maritaca:", "sabia-"],
  stripPrefix: "maritaca:",
}));

registerProvider("nebius", makeOpenAICompatAdapter({
  key: "nebius",
  baseURL: "https://api.studio.nebius.ai/v1",
  envKey: "NEBIUS_API_KEY",
  prefixes: ["nebius:"],
  stripPrefix: "nebius:",
}));

registerProvider("cloudflare-ai", makeOpenAICompatAdapter({
  key: "cloudflare-ai",
  baseURL: "", // Set providerBaseUrl to https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/v1
  envKey: "CF_API_TOKEN",
  prefixes: ["@cf/", "cloudflare-ai:"],
  stripPrefix: "cloudflare-ai:",
}));

// === Batch 3: 27 more providers — 67 direct total ===

registerProvider("scaleway", makeOpenAICompatAdapter({
  key: "scaleway",
  baseURL: "https://api.scaleway.ai/v1",
  envKey: "SCALEWAY_API_KEY",
  prefixes: ["scaleway:"],
  stripPrefix: "scaleway:",
}));

registerProvider("siliconflow", makeOpenAICompatAdapter({
  key: "siliconflow",
  baseURL: "https://api.siliconflow.cn/v1",
  envKey: "SILICONFLOW_API_KEY",
  prefixes: ["siliconflow:", "sf:"],
  stripPrefix: "sf:",
}));

registerProvider("volcengine", makeOpenAICompatAdapter({
  key: "volcengine",
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
  envKey: "VOLCENGINE_API_KEY",
  prefixes: ["volcengine:", "doubao:"],
  stripPrefix: "volcengine:",
}));

registerProvider("anyscale", makeOpenAICompatAdapter({
  key: "anyscale",
  baseURL: "https://api.endpoints.anyscale.com/v1",
  envKey: "ANYSCALE_API_KEY",
  prefixes: ["anyscale:"],
  stripPrefix: "anyscale:",
}));

registerProvider("lepton", makeOpenAICompatAdapter({
  key: "lepton",
  baseURL: "https://api.lepton.ai/v1",
  envKey: "LEPTON_API_KEY",
  prefixes: ["lepton:"],
  stripPrefix: "lepton:",
}));

registerProvider("featherless", makeOpenAICompatAdapter({
  key: "featherless",
  baseURL: "https://api.featherless.ai/v1",
  envKey: "FEATHERLESS_API_KEY",
  prefixes: ["featherless:"],
  stripPrefix: "featherless:",
}));

registerProvider("arliai", makeOpenAICompatAdapter({
  key: "arliai",
  baseURL: "https://api.arliai.com/v1",
  envKey: "ARLIAI_API_KEY",
  prefixes: ["arliai:"],
  stripPrefix: "arliai:",
}));

registerProvider("kluster", makeOpenAICompatAdapter({
  key: "kluster",
  baseURL: "https://api.kluster.ai/v1",
  envKey: "KLUSTER_API_KEY",
  prefixes: ["kluster:"],
  stripPrefix: "kluster:",
}));

registerProvider("aimlapi", makeOpenAICompatAdapter({
  key: "aimlapi",
  baseURL: "https://api.aimlapi.com/v1",
  envKey: "AIMLAPI_API_KEY",
  prefixes: ["aimlapi:", "aim:"],
  stripPrefix: "aim:",
}));

registerProvider("nscale", makeOpenAICompatAdapter({
  key: "nscale",
  baseURL: "https://inference.api.nscale.com/v1",
  envKey: "NSCALE_API_KEY",
  prefixes: ["nscale:"],
  stripPrefix: "nscale:",
}));

registerProvider("octoai", makeOpenAICompatAdapter({
  key: "octoai",
  baseURL: "https://text.octoai.run/v1",
  envKey: "OCTOAI_TOKEN",
  prefixes: ["octoai:"],
  stripPrefix: "octoai:",
}));

registerProvider("github-models", makeOpenAICompatAdapter({
  key: "github-models",
  baseURL: "https://models.github.ai/inference",
  envKey: "GITHUB_TOKEN",
  prefixes: ["github:"],
  stripPrefix: "github:",
}));

registerProvider("azure-ai-inference", makeOpenAICompatAdapter({
  key: "azure-ai-inference",
  baseURL: "https://models.inference.ai.azure.com",
  envKey: "AZURE_AI_API_KEY",
  prefixes: ["azure-ai:"],
  stripPrefix: "azure-ai:",
}));

registerProvider("prem", makeOpenAICompatAdapter({
  key: "prem",
  baseURL: "https://app.premai.io/api/v1",
  envKey: "PREM_API_KEY",
  prefixes: ["prem:"],
  stripPrefix: "prem:",
}));

registerProvider("aleph-alpha", makeOpenAICompatAdapter({
  key: "aleph-alpha",
  baseURL: "https://api.aleph-alpha.com",
  envKey: "AA_TOKEN",
  prefixes: ["aleph-alpha:"],
  stripPrefix: "aleph-alpha:",
}));

registerProvider("ovhcloud", makeOpenAICompatAdapter({
  key: "ovhcloud",
  baseURL: "https://oai.endpoints.kepler.ai.cloud.ovh.net/api/openai_compat/v1",
  envKey: "OVH_API_KEY",
  prefixes: ["ovh:", "ovhcloud:"],
  stripPrefix: "ovh:",
}));

registerProvider("chutes", makeOpenAICompatAdapter({
  key: "chutes",
  baseURL: "https://llm.chutes.ai/v1",
  envKey: "CHUTES_API_KEY",
  prefixes: ["chutes:"],
  stripPrefix: "chutes:",
}));

registerProvider("infermatic", makeOpenAICompatAdapter({
  key: "infermatic",
  baseURL: "https://api.infermatic.ai/v1",
  envKey: "INFERMATIC_API_KEY",
  prefixes: ["infermatic:"],
  stripPrefix: "infermatic:",
}));

registerProvider("predibase", makeOpenAICompatAdapter({
  key: "predibase",
  baseURL: "https://serving.app.predibase.com",
  envKey: "PREDIBASE_API_KEY",
  prefixes: ["predibase:"],
  stripPrefix: "predibase:",
}));

registerProvider("spark", makeOpenAICompatAdapter({
  key: "spark",
  baseURL: "https://spark-api-open.xf-yun.com/v1",
  envKey: "SPARK_API_KEY",
  prefixes: ["spark:"],
  stripPrefix: "spark:",
}));

registerProvider("hunyuan", makeOpenAICompatAdapter({
  key: "hunyuan",
  baseURL: "https://api.lkeap.cloud.tencent.com/v1",
  envKey: "TENCENTCLOUD_API_KEY",
  prefixes: ["hunyuan:"],
  stripPrefix: "hunyuan:",
}));

// Local / self-hosted OpenAI-compatible servers
registerProvider("vllm", makeOpenAICompatAdapter({
  key: "vllm",
  baseURL: "http://localhost:8000/v1",
  envKey: "",
  prefixes: ["vllm:"],
  stripPrefix: "vllm:",
}));

registerProvider("jan", makeOpenAICompatAdapter({
  key: "jan",
  baseURL: "http://localhost:1337/v1",
  envKey: "",
  prefixes: ["jan:"],
  stripPrefix: "jan:",
}));

registerProvider("llamacpp", makeOpenAICompatAdapter({
  key: "llamacpp",
  baseURL: "http://localhost:8080/v1",
  envKey: "",
  prefixes: ["llamacpp:"],
  stripPrefix: "llamacpp:",
}));

registerProvider("localai", makeOpenAICompatAdapter({
  key: "localai",
  baseURL: "http://localhost:8888/v1",
  envKey: "",
  prefixes: ["localai:"],
  stripPrefix: "localai:",
}));

registerProvider("text-generation-webui", makeOpenAICompatAdapter({
  key: "text-generation-webui",
  baseURL: "http://localhost:5000/v1",
  envKey: "",
  prefixes: ["tgwui:"],
  stripPrefix: "tgwui:",
}));
