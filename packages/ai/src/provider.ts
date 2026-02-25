/**
 * Vercel AI SDK Provider Configuration
 * Modern AI integration with structured outputs support
 * Supports: OpenAI, Google (Gemini), and Ollama (local)
 */

import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { validateOllamaUrl } from './llm/ollama-client';

// Provider types
export type AIProvider = 'openai' | 'google' | 'ollama';

// OLLAMA_MODEL is read at module load time (low churn — model name rarely changes)
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

// Get the configured provider based on available API keys
// Priority: OpenAI > Google > Ollama (cloud providers have better structured output support)
export function getConfiguredProvider(): AIProvider | null {
  // Prefer cloud providers for better structured output support
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GOOGLE_AI_API_KEY) return 'google';
  // Fall back to Ollama for local development (uses text parsing for JSON)
  if (process.env.OLLAMA_ENABLED === 'true' || process.env.OLLAMA_BASE_URL) {
    return 'ollama';
  }
  return null;
}

// Create OpenAI client (internal — used by getModel)
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return createOpenAI({ apiKey });
}

// Create Google (Gemini) client (internal — used by getModel)
function getGoogleClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured');
  }
  return createGoogleGenerativeAI({ apiKey });
}

// Create Ollama client (internal — used by getModel)
// OLLAMA_BASE_URL is read here (not at module load) so it can be set after import
function getOllamaClient() {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
  validateOllamaUrl(baseUrl)
  return createOpenAICompatible({ name: 'ollama', baseURL: baseUrl })
}

// Get the appropriate model based on provider
// Returns LanguageModelV1 for compatibility with ai SDK's generateText/streamText.
// Provider SDKs return LanguageModelV2 which is runtime-compatible but not type-compatible
// with the ai package's LanguageModelV1 typedef — cast bridges the V1↔V2 gap.
export function getModel(provider?: AIProvider): LanguageModelV1 {
  const activeProvider = provider || getConfiguredProvider();

  if (!activeProvider) {
    throw new Error(
      'No AI provider configured. Set OLLAMA_ENABLED=true for local, or OPENAI_API_KEY/GOOGLE_AI_API_KEY for cloud.'
    );
  }

  // Provider SDKs return LanguageModelV2; ai SDK expects LanguageModelV1.
  // They are runtime-compatible (V2 extends V1 behavior) but not type-compatible.
  switch (activeProvider) {
    case 'ollama':
      return getOllamaClient()(OLLAMA_MODEL) as unknown as LanguageModelV1;
    case 'openai':
      return getOpenAIClient()('gpt-4o-mini') as unknown as LanguageModelV1;
    case 'google':
      return getGoogleClient()('gemini-1.5-flash') as unknown as LanguageModelV1;
    default:
      throw new Error(`Unknown provider: ${activeProvider}`);
  }
}

