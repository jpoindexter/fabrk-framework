/**
 * AI-Friendly Integration Helpers
 *
 * Pre-configured wrappers for common integrations that:
 * - Include proper error handling
 * - Track costs automatically
 * - Use typed responses
 *
 * @example
 * import { ai } from '@/lib/ai/integrations';
 *
 * const result = await ai.claude.generate({
 *   prompt: 'Generate a user profile form',
 *   feature: 'form-generation',
 * });
 */

import { getCostTracker } from './cost';
import { AppError, successResponse, errorResponse, type APIResponse } from './types';

// Type definitions for optional SDKs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnthropicMessage = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpenAICompletion = any;

// ============================================================================
// TYPES
// ============================================================================

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
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  model: string;
}

// ============================================================================
// CLAUDE INTEGRATION
// ============================================================================

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
      const Anthropic = (await import('@anthropic-ai/sdk' as any)).default;
      const client = new Anthropic();

      const tracker = getCostTracker();

      const result: AnthropicMessage = await tracker.trackClaudeCall({
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
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages,
          });
        },
      });

      const content = result.content[0]?.type === 'text' ? result.content[0].text : '';

      return successResponse({
        content,
        usage: {
          promptTokens: result.usage?.input_tokens || 0,
          completionTokens: result.usage?.output_tokens || 0,
          totalTokens: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
        },
        cost: 0, // Cost is tracked internally
        model,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(error.code, error.message);
      }
      console.error('Claude generation error:', error);
      return errorResponse(
        'CLAUDE_ERROR',
        error instanceof Error ? error.message : 'Failed to generate with Claude'
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

// ============================================================================
// OPENAI INTEGRATION
// ============================================================================

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
      const OpenAI = (await import('openai' as any)).default;
      const client = new OpenAI();

      const tracker = getCostTracker();

      const result: OpenAICompletion = await tracker.trackOpenAICall({
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
            max_tokens: maxTokens,
            temperature,
            messages,
          });
        },
      });

      const content = result.choices?.[0]?.message?.content || '';

      return successResponse({
        content,
        usage: {
          promptTokens: result.usage?.prompt_tokens || 0,
          completionTokens: result.usage?.completion_tokens || 0,
          totalTokens: result.usage?.total_tokens || 0,
        },
        cost: 0,
        model,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(error.code, error.message);
      }
      console.error('OpenAI generation error:', error);
      return errorResponse(
        'OPENAI_ERROR',
        error instanceof Error ? error.message : 'Failed to generate with OpenAI'
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
      const OpenAI = (await import('openai' as any)).default;
      const client = new OpenAI();

      const response = await client.embeddings.create({
        model,
        input: text,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const embeddings = response.data.map((d: any) => d.embedding);
      return successResponse(embeddings);
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      return errorResponse(
        'EMBEDDING_ERROR',
        error instanceof Error ? error.message : 'Failed to generate embeddings'
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

// ============================================================================
// VERCEL AI SDK INTEGRATION
// ============================================================================

/**
 * Vercel AI SDK integration (uses configured provider)
 */
export const vercelAI = {
  /**
   * Generate text using Vercel AI SDK with the configured provider
   *
   * @example
   * const result = await vercelAI.generate({
   *   prompt: 'Explain quantum computing',
   *   feature: 'explanation',
   * });
   */
  async generate(options: GenerateOptions): Promise<APIResponse<GenerateResult>> {
    const { prompt, feature: _feature, userId: _userId, maxTokens = 1024, systemPrompt } = options;

    try {
      const { generateText } = await import('ai');
      const { getModel } = await import('./provider');

      const model = getModel();

      // We can't directly wrap generateText with cost tracking since it doesn't
      // return token counts in a standard format. Track as a generic call.
      const startTime = Date.now();

      const result = await generateText({
        model,
        prompt,
        system: systemPrompt,
        maxTokens: maxTokens,
      });

      const _duration = Date.now() - startTime;

      // Estimate tokens (rough approximation)
      const estimatedPromptTokens = Math.ceil(prompt.length / 4);
      const estimatedCompletionTokens = Math.ceil(result.text.length / 4);

      return successResponse({
        content: result.text,
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
        },
        cost: 0,
        model: 'vercel-ai-sdk',
      });
    } catch (error) {
      console.error('Vercel AI generation error:', error);
      return errorResponse(
        'VERCEL_AI_ERROR',
        error instanceof Error ? error.message : 'Failed to generate with Vercel AI SDK'
      );
    }
  },

  /**
   * Stream text generation
   */
  async stream(options: GenerateOptions): Promise<APIResponse<ReadableStream<string>>> {
    const { prompt, maxTokens = 1024, systemPrompt } = options;

    try {
      const { streamText } = await import('ai');
      const { getModel } = await import('./provider');

      const model = getModel();

      const result = streamText({
        model,
        prompt,
        system: systemPrompt,
        maxTokens: maxTokens,
      });

      return successResponse((await result).textStream);
    } catch (error) {
      console.error('Vercel AI stream error:', error);
      return errorResponse(
        'VERCEL_AI_ERROR',
        error instanceof Error ? error.message : 'Failed to stream with Vercel AI SDK'
      );
    }
  },
};

// ============================================================================
// UNIFIED AI INTERFACE
// ============================================================================

/**
 * Unified AI interface - auto-selects available provider
 */
export const ai = {
  claude,
  openai,
  vercelAI,

  /**
   * Generate using the best available provider
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

    // Try Vercel AI SDK as last resort
    try {
      return await vercelAI.generate(options);
    } catch {
      return errorResponse(
        'NO_AI_PROVIDER',
        'No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.'
      );
    }
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

export default ai;
