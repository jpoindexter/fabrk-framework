/**
 * 🚀 OPTIONAL FEATURE: AI Integration Toolkit
 *
 * ⚠️ This module is NOT active by default. To enable AI features:
 *
 * 1. Install dependencies:
 *    npm install openai @anthropic-ai/sdk
 *
 * 2. Add API keys to .env:
 *    OPENAI_API_KEY=sk-...
 *    ANTHROPIC_API_KEY=sk-ant-...
 *
 * 3. Import and use in your code:
 *    import { chatWithOpenAI, chatWithClaude } from '@/lib/ai'
 *
 * Features:
 * - OpenAI GPT-4/GPT-3.5 support
 * - Anthropic Claude support
 * - Streaming responses
 * - Function calling
 * - Token usage tracking
 * - Rate limiting
 * - Cost tracking
 *
 * ✨ Zero cost if unused (tree-shaken from production bundle)
 *
 * @module ai
 * @optional
 */

// Dynamic imports for optional dependencies (type safety not available until SDK installed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic import requires any until SDK installed
let OpenAI: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic import requires any until SDK installed
let Anthropic: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic import instance
let openai: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic import instance
let anthropic: any;

try {
  OpenAI = require('openai').default || require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} catch {
  // OpenAI SDK is optional - silent skip for optional dependencies
}

try {
  Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
} catch {
  // Anthropic SDK is optional - silent skip for optional dependencies
}

export type AIProvider = 'openai' | 'anthropic';
export type OpenAIModel = 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
export type AnthropicModel =
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
  model: string;
  provider: AIProvider;
}

/**
 * Token pricing (per 1M tokens)
 */
const TOKEN_PRICING = {
  'gpt-4': { input: 30, output: 60 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'claude-3-sonnet-20240229': { input: 3, output: 15 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
};

/**
 * Calculate cost
 */
function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = TOKEN_PRICING[model as keyof typeof TOKEN_PRICING];
  if (!pricing) return 0;

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Chat completion with OpenAI
 */
export async function chatWithOpenAI(options: {
  messages: AIMessage[];
  model?: OpenAIModel;
  temperature?: number;
  maxTokens?: number;
  stream?: false;
}): Promise<AIResponse>;

export async function chatWithOpenAI(options: {
  messages: AIMessage[];
  model?: OpenAIModel;
  temperature?: number;
  maxTokens?: number;
  stream: true;
}): Promise<AsyncIterable<string>>;

export async function chatWithOpenAI(options: {
  messages: AIMessage[];
  model?: OpenAIModel;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}): Promise<AIResponse | AsyncIterable<string>> {
  if (!openai) {
    throw new Error('OpenAI SDK not installed. Install with: npm install openai');
  }

  const model = options.model || 'gpt-3.5-turbo';

  if (options.stream) {
    // Streaming response
    const stream = await openai.chat.completions.create({
      model,
      messages: options.messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens,
      stream: true,
    });

    return (async function* () {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    })();
  } else {
    // Regular response
    const completion = await openai.chat.completions.create({
      model,
      messages: options.messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens,
    });

    const usage = completion.usage;
    const content = completion.choices[0]?.message?.content || '';

    return {
      content,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
      cost: usage ? calculateCost(model, usage.prompt_tokens, usage.completion_tokens) : undefined,
      model,
      provider: 'openai',
    };
  }
}

/**
 * Chat completion with Anthropic Claude
 */
export async function chatWithClaude(options: {
  messages: AIMessage[];
  model?: AnthropicModel;
  temperature?: number;
  maxTokens?: number;
  stream?: false;
}): Promise<AIResponse>;

export async function chatWithClaude(options: {
  messages: AIMessage[];
  model?: AnthropicModel;
  temperature?: number;
  maxTokens?: number;
  stream: true;
}): Promise<AsyncIterable<string>>;

export async function chatWithClaude(options: {
  messages: AIMessage[];
  model?: AnthropicModel;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}): Promise<AIResponse | AsyncIterable<string>> {
  if (!anthropic) {
    throw new Error('Anthropic SDK not installed. Install with: npm install @anthropic-ai/sdk');
  }

  const model = options.model || 'claude-3-sonnet-20240229';

  // Separate system message
  const systemMessage = options.messages.find((m) => m.role === 'system');
  const messages = options.messages.filter((m) => m.role !== 'system');

  if (options.stream) {
    // Streaming response
    const stream = await anthropic.messages.create({
      model,
      messages: messages,
      system: systemMessage?.content,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1024,
      stream: true,
    });

    return (async function* () {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    })();
  } else {
    // Regular response
    const message = await anthropic.messages.create({
      model,
      messages: messages,
      system: systemMessage?.content,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1024,
    });

    const content = message.content[0]?.type === 'text' ? message.content[0].text : '';

    return {
      content,
      usage: {
        promptTokens: message.usage.input_tokens,
        completionTokens: message.usage.output_tokens,
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
      },
      cost: calculateCost(model, message.usage.input_tokens, message.usage.output_tokens),
      model,
      provider: 'anthropic',
    };
  }
}

/**
 * Generic chat function (auto-select provider)
 */
export async function chat(options: {
  messages: AIMessage[];
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}): Promise<AIResponse | AsyncIterable<string>> {
  const provider = options.provider || 'openai';

  if (provider === 'openai') {
    if (options.stream) {
      return chatWithOpenAI({
        messages: options.messages,
        model: (options.model as OpenAIModel) || 'gpt-3.5-turbo',
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stream: true,
      });
    } else {
      return chatWithOpenAI({
        messages: options.messages,
        model: (options.model as OpenAIModel) || 'gpt-3.5-turbo',
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stream: false,
      });
    }
  } else {
    if (options.stream) {
      return chatWithClaude({
        messages: options.messages,
        model: (options.model as AnthropicModel) || 'claude-3-sonnet-20240229',
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stream: true,
      });
    } else {
      return chatWithClaude({
        messages: options.messages,
        model: (options.model as AnthropicModel) || 'claude-3-sonnet-20240229',
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stream: false,
      });
    }
  }
}

/**
 * Generate embeddings (OpenAI)
 */
export async function generateEmbeddings(
  text: string | string[],
  model: string = 'text-embedding-3-small'
): Promise<number[][]> {
  if (!openai) {
    throw new Error('OpenAI SDK not installed. Install with: npm install openai');
  }

  const response = await openai.embeddings.create({
    model,
    input: text,
  });

  return response.data.map((d: { embedding: number[] }) => d.embedding);
}

/**
 * Text moderation (OpenAI)
 */
export async function moderateContent(text: string): Promise<{
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
}> {
  if (!openai) {
    throw new Error('OpenAI SDK not installed. Install with: npm install openai');
  }

  const response = await openai.moderations.create({
    input: text,
  });

  const result = response.results[0];

  return {
    flagged: result.flagged,
    categories: result.categories as Record<string, boolean>,
    scores: result.category_scores as Record<string, number>,
  };
}

/**
 * Image generation (OpenAI DALL-E)
 */
export async function generateImage(options: {
  prompt: string;
  model?: 'dall-e-2' | 'dall-e-3';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  n?: number;
}): Promise<string[]> {
  if (!openai) {
    throw new Error('OpenAI SDK not installed. Install with: npm install openai');
  }

  const response = await openai.images.generate({
    model: options.model || 'dall-e-3',
    prompt: options.prompt,
    size: options.size || '1024x1024',
    quality: options.quality || 'standard',
    n: options.n || 1,
  });

  return response.data.map((d: { url?: string }) => d.url || '');
}

/**
 * Text-to-speech (OpenAI TTS)
 */
export async function textToSpeech(options: {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: 'tts-1' | 'tts-1-hd';
}): Promise<Buffer> {
  if (!openai) {
    throw new Error('OpenAI SDK not installed. Install with: npm install openai');
  }

  const response = await openai.audio.speech.create({
    model: options.model || 'tts-1',
    voice: options.voice || 'alloy',
    input: options.text,
  });

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Speech-to-text (OpenAI Whisper)
 */
export async function speechToText(
  audioFile: File,
  options?: {
    language?: string;
    prompt?: string;
  }
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI SDK not installed. Install with: npm install openai');
  }

  const response = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: options?.language,
    prompt: options?.prompt,
  });

  return response.text;
}

/**
 * Helper: Stream to string
 */
export async function streamToString(stream: AsyncIterable<string>): Promise<string> {
  let result = '';
  for await (const chunk of stream) {
    result += chunk;
  }
  return result;
}

/**
 * Helper: Estimate tokens
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Re-export Vercel AI SDK provider utilities
export {
  getModel,
  isAIConfigured,
  getCurrentProviderName,
  getConfiguredProvider,
} from './provider';

// ===========================
// AI DEVELOPMENT TOOLS
// ===========================

// Cost tracking
export {
  // Types
  type AICostEvent,
  type CostSummary,
  type FeatureCost,
  type CostBudgetStatus,
  type CostStore,
  // Classes
  AICostTracker,
  InMemoryCostStore,
  // Functions
  calculateCost as calculateModelCost,
  getCostTracker,
  setCostStore,
  // Constants
  MODEL_PRICING,
} from './cost';

// Validation
export {
  // Types
  type ValidationIssue,
  type ValidationResult,
  // Classes
  CodeValidator,
  // Functions
  getValidator,
  validateCode,
  isCodeSafe,
  getSecurityIssues,
  getDesignViolations,
} from './validation';

// Testing
export {
  // Types
  type TestResult,
  type AITestResults,
  // Classes
  AITest,
  // Quick test helpers
  testDoesNotThrow,
  testReturnsType,
  testCompletesInMs,
  // Common schemas
  commonSchemas,
} from './testing';

// AI Integrations (unified interface)
export {
  // Types
  type GenerateOptions,
  type GenerateResult,
  // Providers
  ai,
  claude,
  openai,
  vercelAI,
} from './integrations';

// Streaming utilities
export {
  streamToString as streamTextToString,
  parseStreamChunks,
  createTextStream,
  mergeStreams,
  transformStream,
  toReadableStream,
  fromReadableStream,
} from './streaming/stream-text';

// Prompt management
export {
  // Types
  type PromptTemplate,
  // Functions
  createPromptTemplate,
  composePrompts,
  createMessagePair,
} from './prompts/template';

export {
  // Types
  type BuiltPrompt,
  // Classes
  PromptBuilder,
} from './prompts/builder';

// Prisma cost store (reference implementation)
export { PrismaCostStore } from './cost-store-prisma';
