/**
 * AI-Friendly Integration Helpers
 *
 * Pre-configured wrappers for common integrations that:
 * - Include proper error handling
 * - Track costs automatically
 * - Use typed responses
 *
 * @example
 * import { ai } from '@fabrk/ai';
 *
 * const result = await ai.claude.generate({
 *   prompt: 'Generate a user profile form',
 *   feature: 'form-generation',
 * });
 */

import { getCostTracker } from './tracker';
import { AppError, successResponse, errorResponse, type APIResponse } from './types';

/** Hard cap on tokens per request to prevent runaway cost from untrusted input */
const MAX_TOKENS_LIMIT = 100_000;

/** Scrub API key patterns from error messages to prevent leaks in logs */
function scrubApiKeys(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, 'sk-***REDACTED***')
    .replace(/AIza[a-zA-Z0-9_-]{30,}/g, 'AIza***REDACTED***')
    .replace(/re_[a-zA-Z0-9_]{10,}/g, 're_***REDACTED***')
    .replace(/Bearer\s+[a-zA-Z0-9_.-]{20,}/g, 'Bearer ***REDACTED***');
}

export interface GenerateOptions {
  prompt: string;
  feature: string;
  userId?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface GenerateResult {
  content: string;
  model: string;
}

/**
 * Claude AI integration with automatic cost tracking
 */
export const claude = {
  /**
   * Generate text with Claude
   *
   * @example
   * const result = await claude.generate({
   *   prompt: 'Write a product description for...',
   *   feature: 'product-description',
   *   userId: session.user.id,
   * });
   */
  async generate(options: GenerateOptions): Promise<APIResponse<GenerateResult>> {
    const {
      prompt,
      feature,
      userId,
      model = 'claude-sonnet-4-20250514',
      maxTokens = 1024,
      temperature = 0.7,
      systemPrompt,
    } = options;

    try {
      // Dynamic import to avoid requiring SDK at build time
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import('@anthropic-ai/sdk' as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Anthropic = mod.default || (mod as any).Anthropic || mod;
      const client = new Anthropic();

      const tracker = getCostTracker();

      const result = await tracker.trackClaudeCall<string>({
        model,
        feature,
        prompt,
        userId,
        fn: async () => {
          const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
            { role: 'user', content: prompt },
          ];

          return client.messages.create({
            model,
            max_tokens: Math.min(maxTokens, MAX_TOKENS_LIMIT),
            temperature,
            system: systemPrompt,
            messages,
          });
        },
      });

      const content = typeof result === 'string' ? result : '';

      return successResponse({ content, model });
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(error.code, error.message);
      }
      const safeMessage = error instanceof Error ? error.message : 'AI call failed';
      console.error('Claude generation error:', scrubApiKeys(safeMessage));
      return errorResponse(
        'CLAUDE_ERROR',
        scrubApiKeys(error instanceof Error ? error.message : 'Failed to generate with Claude')
      );
    }
  },

  /**
   * Check if Claude SDK is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await import('@anthropic-ai/sdk' as any);
      return !!process.env.ANTHROPIC_API_KEY;
    } catch {
      return false;
    }
  },
};

/**
 * OpenAI integration with automatic cost tracking
 */
export const openai = {
  /**
   * Generate text with OpenAI
   *
   * @example
   * const result = await openai.generate({
   *   prompt: 'Write a blog post about...',
   *   feature: 'blog-generation',
   *   model: 'gpt-4o',
   * });
   */
  async generate(options: GenerateOptions): Promise<APIResponse<GenerateResult>> {
    const {
      prompt,
      feature,
      userId,
      model = 'gpt-4o',
      maxTokens = 1024,
      temperature = 0.7,
      systemPrompt,
    } = options;

    try {
      // Dynamic import to avoid requiring SDK at build time
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import('openai' as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const OpenAI = mod.default || (mod as any).OpenAI || mod;
      const client = new OpenAI();

      const tracker = getCostTracker();

      const result = await tracker.trackOpenAICall<string>({
        model,
        feature,
        prompt,
        userId,
        fn: async () => {
          const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

          if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
          }
          messages.push({ role: 'user', content: prompt });

          return client.chat.completions.create({
            model,
            max_tokens: Math.min(maxTokens, MAX_TOKENS_LIMIT),
            temperature,
            messages,
          });
        },
      });

      const content = typeof result === 'string' ? result : '';

      return successResponse({ content, model });
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(error.code, error.message);
      }
      const safeMessage = error instanceof Error ? error.message : 'AI call failed';
      console.error('OpenAI generation error:', scrubApiKeys(safeMessage));
      return errorResponse(
        'OPENAI_ERROR',
        scrubApiKeys(error instanceof Error ? error.message : 'Failed to generate with OpenAI')
      );
    }
  },

  /**
   * Generate embeddings
   */
  async embed(
    text: string | string[],
    model = 'text-embedding-3-small'
  ): Promise<APIResponse<number[][]>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import('openai' as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const OpenAI = mod.default || (mod as any).OpenAI || mod;
      const client = new OpenAI();

      const response = await client.embeddings.create({
        model,
        input: text,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const embeddings = response.data.map((d: any) => d.embedding);
      return successResponse(embeddings);
    } catch (error) {
      const safeMessage = error instanceof Error ? error.message : 'AI call failed';
      console.error('OpenAI embedding error:', scrubApiKeys(safeMessage));
      return errorResponse(
        'EMBEDDING_ERROR',
        scrubApiKeys(error instanceof Error ? error.message : 'Failed to generate embeddings')
      );
    }
  },

  /**
   * Check if OpenAI SDK is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await import('openai' as any);
      return !!process.env.OPENAI_API_KEY;
    } catch {
      return false;
    }
  },
};

/**
 * Unified AI interface - auto-selects available provider
 */
export const ai = {
  claude,
  openai,

  /**
   * Generate using the best available provider
   *
   * @remarks Falls back through: claude → openai. Both paths track costs.
   */
  async generate(options: GenerateOptions): Promise<APIResponse<GenerateResult>> {
    // Try Claude first (preferred)
    if (await claude.isAvailable()) {
      return claude.generate(options);
    }

    // Fall back to OpenAI
    if (await openai.isAvailable()) {
      return openai.generate(options);
    }

    return errorResponse(
      'NO_AI_PROVIDER',
      'No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.'
    );
  },

  /**
   * Check which providers are available
   */
  async getAvailableProviders(): Promise<string[]> {
    const providers: string[] = [];

    if (await claude.isAvailable()) providers.push('claude');
    if (await openai.isAvailable()) providers.push('openai');

    return providers;
  },
};
