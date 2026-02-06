/**
 * Vercel AI SDK Provider Configuration
 * Modern AI integration with structured outputs support
 * Supports: OpenAI, Google (Gemini), and Ollama (local)
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// Provider types
export type AIProvider = 'openai' | 'google' | 'ollama';

// Default Ollama settings
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
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

// Create OpenAI client
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return createOpenAI({ apiKey });
}

// Create Google (Gemini) client
export function getGoogleClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured');
  }
  return createGoogleGenerativeAI({ apiKey });
}

// Create Ollama client (OpenAI-compatible API)
export function getOllamaClient() {
  return createOpenAICompatible({
    name: 'ollama',
    baseURL: OLLAMA_BASE_URL,
    // Ollama doesn't require an API key
  });
}

// Get the appropriate model based on provider
export function getModel(provider?: AIProvider): any {
  const activeProvider = provider || getConfiguredProvider();

  if (!activeProvider) {
    throw new Error(
      'No AI provider configured. Set OLLAMA_ENABLED=true for local, or OPENAI_API_KEY/GOOGLE_AI_API_KEY for cloud.'
    );
  }

  switch (activeProvider) {
    case 'ollama':
      return getOllamaClient()(OLLAMA_MODEL);
    case 'openai':
      return getOpenAIClient()('gpt-4o-mini');
    case 'google':
      return getGoogleClient()('gemini-1.5-flash');
    default:
      throw new Error(`Unknown provider: ${activeProvider}`);
  }
}

// Check if AI is available
export function isAIConfigured(): boolean {
  return getConfiguredProvider() !== null;
}

// Get current provider name (useful for UI)
export function getCurrentProviderName(): string {
  const provider = getConfiguredProvider();
  switch (provider) {
    case 'ollama':
      return `Ollama (${OLLAMA_MODEL})`;
    case 'openai':
      return 'OpenAI (GPT-4o-mini)';
    case 'google':
      return 'Google (Gemini 1.5 Flash)';
    default:
      return 'Not configured';
  }
}
