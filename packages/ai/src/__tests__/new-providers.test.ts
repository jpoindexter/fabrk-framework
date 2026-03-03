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
