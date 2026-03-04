import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProvider, listProviders } from '../llm/registry';
import '../llm/openai-compat-providers'; // trigger registrations
import '../llm/cohere-tools';             // trigger cohere registration
import '../llm/bedrock-tools';            // trigger bedrock registration

describe('makeOpenAICompatAdapter — baseURL propagation', () => {
  beforeEach(() => { vi.resetModules() })

  it('groq adapter passes baseURL as providerBaseUrl to openai-tools', async () => {
    const captureCtorArgs: unknown[] = []
    vi.doMock('openai', () => ({
      default: class {
        chat = {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: 'ok', tool_calls: undefined } }],
              usage: { prompt_tokens: 5, completion_tokens: 3 },
            }),
          },
        }
        constructor(...args: unknown[]) { captureCtorArgs.push(args[0]) }
      },
    }))

    const { makeOpenAICompatAdapter } = await import('../llm/openai-compat')
    await import('../llm/openai-compat-providers')
    const adapter = makeOpenAICompatAdapter({
      key: 'test-provider',
      baseURL: 'https://api.groq.com/openai/v1',
      envKey: 'GROQ_API_KEY',
      prefixes: ['groq-test:'],
    })
    const fn = adapter.makeGenerateWithTools({ openaiApiKey: 'test-key' })
    await fn([{ role: 'user', content: 'hi' }], [])

    const ctorArg = captureCtorArgs[0] as Record<string, unknown>
    expect(ctorArg.baseURL).toBe('https://api.groq.com/openai/v1')
  })
})

describe('new provider registrations', () => {
  it('resolves openrouter: prefix', () => {
    expect(getProvider('openrouter:openai/gpt-4o')?.key).toBe('openrouter');
  });

  it('resolves or: shorthand', () => {
    expect(getProvider('or:anthropic/claude-opus-4')?.key).toBe('openrouter');
  });

  it('resolves cerebras: prefix', () => {
    expect(getProvider('cerebras:llama-3.1-70b')?.key).toBe('cerebras');
  });

  it('resolves lmstudio: prefix', () => {
    expect(getProvider('lmstudio:phi-3-mini')?.key).toBe('lmstudio');
  });

  it('resolves nim: prefix', () => {
    expect(getProvider('nim:meta/llama-3.1-8b-instruct')?.key).toBe('nim');
  });

  it('lists at least 18 providers', () => {
    expect(listProviders().length).toBeGreaterThanOrEqual(18);
  });
});

describe('batch 2 provider registrations', () => {
  it('resolves huggingface: prefix', () => {
    expect(getProvider('hf:meta-llama/Llama-3.1-8B-Instruct')?.key).toBe('huggingface');
  });
  it('resolves replicate: prefix', () => {
    expect(getProvider('replicate:meta/llama-3.1-8b-instruct')?.key).toBe('replicate');
  });
  it('resolves deepinfra: prefix', () => {
    expect(getProvider('deepinfra:meta-llama/Meta-Llama-3.1-8B-Instruct')?.key).toBe('deepinfra');
  });
  it('resolves sambanova: prefix', () => {
    expect(getProvider('sambanova:Meta-Llama-3.1-8B-Instruct')?.key).toBe('sambanova');
  });
  it('resolves hyperbolic: prefix', () => {
    expect(getProvider('hyperbolic:meta-llama/Llama-3.1-8B-Instruct')?.key).toBe('hyperbolic');
  });
  it('resolves novita: prefix', () => {
    expect(getProvider('novita:meta-llama/llama-3.1-8b-instruct')?.key).toBe('novita');
  });
  it('resolves friendli: prefix', () => {
    expect(getProvider('friendli:meta-llama-3-1-8b-instruct')?.key).toBe('friendli');
  });
  it('resolves solar- prefix for upstage', () => {
    expect(getProvider('solar-1-mini-chat')?.key).toBe('upstage');
  });
  it('resolves palmyra- prefix for writer', () => {
    expect(getProvider('palmyra-x-004')?.key).toBe('writer');
  });
  it('resolves lambda: prefix', () => {
    expect(getProvider('lambda:llama3.1-8b-instruct')?.key).toBe('lambda');
  });
  it('resolves reka- prefix', () => {
    expect(getProvider('reka-flash-3')?.key).toBe('reka');
  });
  it('resolves jamba- prefix for ai21', () => {
    expect(getProvider('jamba-1.5-large')?.key).toBe('ai21');
  });
  it('resolves kimi- prefix for moonshot', () => {
    expect(getProvider('kimi-latest')?.key).toBe('moonshot');
  });
  it('resolves glm- prefix for zhipu', () => {
    expect(getProvider('glm-4-plus')?.key).toBe('zhipu');
  });
  it('resolves yi- prefix', () => {
    expect(getProvider('yi-large')?.key).toBe('yi');
  });
  it('resolves qwen- prefix', () => {
    expect(getProvider('qwen-turbo-latest')?.key).toBe('qwen');
  });
  it('resolves step- prefix for stepfun', () => {
    expect(getProvider('step-2-16k')?.key).toBe('stepfun');
  });
  it('resolves baichuan: prefix', () => {
    expect(getProvider('baichuan:Baichuan4-Turbo')?.key).toBe('baichuan');
  });
  it('resolves sabia- prefix for maritaca', () => {
    expect(getProvider('sabia-3')?.key).toBe('maritaca');
  });
  it('resolves nebius: prefix', () => {
    expect(getProvider('nebius:meta-llama/Llama-3.1-8B-Instruct')?.key).toBe('nebius');
  });
  it('resolves @cf/ prefix for cloudflare-ai', () => {
    expect(getProvider('@cf/meta/llama-3.1-8b-instruct')?.key).toBe('cloudflare-ai');
  });
  it('lists at least 40 providers', () => {
    expect(listProviders().length).toBeGreaterThanOrEqual(40);
  });
});

describe('batch 3 provider registrations', () => {
  it('resolves scaleway: prefix', () => {
    expect(getProvider('scaleway:llama-3.3-70b-instruct')?.key).toBe('scaleway');
  });
  it('resolves siliconflow: and sf: prefixes', () => {
    expect(getProvider('siliconflow:Qwen/Qwen2.5-7B-Instruct')?.key).toBe('siliconflow');
    expect(getProvider('sf:deepseek-ai/DeepSeek-V3')?.key).toBe('siliconflow');
  });
  it('resolves volcengine: and doubao: prefixes', () => {
    expect(getProvider('volcengine:ep-20250101-abcdef')?.key).toBe('volcengine');
    expect(getProvider('doubao:doubao-pro-32k')?.key).toBe('volcengine');
  });
  it('resolves anyscale: prefix', () => {
    expect(getProvider('anyscale:meta-llama/Llama-2-70b-chat-hf')?.key).toBe('anyscale');
  });
  it('resolves lepton: prefix', () => {
    expect(getProvider('lepton:llama3-1-70b')?.key).toBe('lepton');
  });
  it('resolves featherless: prefix', () => {
    expect(getProvider('featherless:meta-llama/Meta-Llama-3.1-8B-Instruct')?.key).toBe('featherless');
  });
  it('resolves arliai: prefix', () => {
    expect(getProvider('arliai:Meta-Llama-3.1-8B-Instruct')?.key).toBe('arliai');
  });
  it('resolves kluster: prefix', () => {
    expect(getProvider('kluster:meta-llama/Llama-3.3-70B-Instruct')?.key).toBe('kluster');
  });
  it('resolves aimlapi: and aim: prefixes', () => {
    expect(getProvider('aimlapi:gpt-4o')?.key).toBe('aimlapi');
    expect(getProvider('aim:claude-3-5-sonnet')?.key).toBe('aimlapi');
  });
  it('resolves nscale: prefix', () => {
    expect(getProvider('nscale:llama-3.1-8b-instruct')?.key).toBe('nscale');
  });
  it('resolves octoai: prefix', () => {
    expect(getProvider('octoai:meta-llama-3-1-8b-instruct')?.key).toBe('octoai');
  });
  it('resolves github: prefix for github-models', () => {
    expect(getProvider('github:gpt-4o')?.key).toBe('github-models');
  });
  it('resolves azure-ai: prefix for azure-ai-inference', () => {
    expect(getProvider('azure-ai:Phi-4')?.key).toBe('azure-ai-inference');
  });
  it('resolves prem: prefix', () => {
    expect(getProvider('prem:gpt-4o')?.key).toBe('prem');
  });
  it('resolves aleph-alpha: prefix', () => {
    expect(getProvider('aleph-alpha:luminous-supreme')?.key).toBe('aleph-alpha');
  });
  it('resolves ovh: and ovhcloud: prefixes', () => {
    expect(getProvider('ovh:llama-3.1-70b-instruct')?.key).toBe('ovhcloud');
    expect(getProvider('ovhcloud:mistral-7b-instruct')?.key).toBe('ovhcloud');
  });
  it('resolves chutes: prefix', () => {
    expect(getProvider('chutes:deepseek-ai/DeepSeek-V3')?.key).toBe('chutes');
  });
  it('resolves infermatic: prefix', () => {
    expect(getProvider('infermatic:meta-llama/llama-3.1-8b-instruct')?.key).toBe('infermatic');
  });
  it('resolves predibase: prefix', () => {
    expect(getProvider('predibase:llama-3-1-8b-instruct')?.key).toBe('predibase');
  });
  it('resolves spark: prefix', () => {
    expect(getProvider('spark:generalv3.5')?.key).toBe('spark');
  });
  it('resolves hunyuan: prefix', () => {
    expect(getProvider('hunyuan:hunyuan-pro')?.key).toBe('hunyuan');
  });
  it('resolves vllm: prefix (local)', () => {
    expect(getProvider('vllm:meta-llama/Llama-3.1-8B-Instruct')?.key).toBe('vllm');
  });
  it('resolves jan: prefix (local)', () => {
    expect(getProvider('jan:llama3.2-3b-instruct')?.key).toBe('jan');
  });
  it('resolves llamacpp: prefix (local)', () => {
    expect(getProvider('llamacpp:llama-3.1-8b')?.key).toBe('llamacpp');
  });
  it('resolves localai: prefix (local)', () => {
    expect(getProvider('localai:gpt-3.5-turbo')?.key).toBe('localai');
  });
  it('resolves tgwui: prefix for text-generation-webui (local)', () => {
    expect(getProvider('tgwui:llama-3.1-8b')?.key).toBe('text-generation-webui');
  });
  it('lists at least 65 providers', () => {
    expect(listProviders().length).toBeGreaterThanOrEqual(65);
  });
});
