import { describe, it, expect } from 'vitest';
import { getProvider, listProviders } from '../llm/registry';
import '../llm/openai-compat'; // trigger registrations
import '../llm/cohere-tools';  // trigger cohere registration
import '../llm/bedrock-tools'; // trigger bedrock registration

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
