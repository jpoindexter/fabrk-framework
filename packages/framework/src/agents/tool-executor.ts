import type { ToolDefinition, ToolResult } from "../tools/define-tool";
import type { LLMToolSchema } from "@fabrk/ai";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARS = 50_000;

export interface ToolExecutorHooks {
  onBefore?: (toolName: string, input: unknown) => void | Promise<void>;
  onAfter?: (toolName: string, input: unknown, output: unknown, durationMs: number) => void | Promise<void>;
  onTimeout?: (toolName: string, input: unknown, timeoutMs: number) => void | Promise<void>;
  onError?: (toolName: string, input: unknown, error: Error) => void | Promise<void>;
}

export interface ToolExecutor {
  resolvedTools: Map<string, ToolDefinition>;
  execute(name: string, input: Record<string, unknown>): Promise<{ output: string; durationMs: number }>;
  toLLMSchema(): LLMToolSchema[];
}

function validateRequiredFields(
  input: Record<string, unknown>,
  schema: ToolDefinition["schema"]
): string | null {
  if (!schema.required) return null;
  for (const field of schema.required) {
    if (!Object.hasOwn(input, field)) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

function truncateOutput(result: ToolResult): string {
  const text = result.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  if (text.length > MAX_OUTPUT_CHARS) {
    return text.slice(0, MAX_OUTPUT_CHARS) + "\n...[truncated]";
  }
  return text;
}

async function safeHook(fn: (() => void | Promise<void>) | undefined): Promise<void> {
  if (!fn) return;
  try {
    await fn();
  } catch { /* hooks must never break execution */ }
}

function mergeHooks(
  executorHooks?: ToolExecutorHooks,
  toolHooks?: ToolExecutorHooks,
): ToolExecutorHooks {
  if (!executorHooks && !toolHooks) return {};
  if (!toolHooks) return executorHooks ?? {};
  if (!executorHooks) return toolHooks;
  return {
    onBefore: toolHooks.onBefore ?? executorHooks.onBefore,
    onAfter: toolHooks.onAfter ?? executorHooks.onAfter,
    onTimeout: toolHooks.onTimeout ?? executorHooks.onTimeout,
    onError: toolHooks.onError ?? executorHooks.onError,
  };
}

export function createToolExecutor(
  tools: ToolDefinition[],
  hooks?: ToolExecutorHooks,
): ToolExecutor {
  const resolvedTools = new Map<string, ToolDefinition>();
  for (const tool of tools) {
    resolvedTools.set(tool.name, tool);
  }

  return {
    resolvedTools,

    async execute(name: string, input: Record<string, unknown>) {
      const tool = resolvedTools.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const validationError = validateRequiredFields(input, tool.schema);
      if (validationError) {
        throw new Error(`Tool "${name}" input validation failed: ${validationError}`);
      }

      const merged = mergeHooks(hooks, tool.hooks);

      await safeHook(() => merged.onBefore?.(name, input));

      const start = Date.now();

      try {
        const result = await Promise.race([
          tool.handler(input),
          new Promise<never>((_, reject) => {
            const err = new Error(`Tool "${name}" timed out after ${DEFAULT_TIMEOUT_MS}ms`);
            (err as Error & { _timeout: boolean })._timeout = true;
            setTimeout(() => reject(err), DEFAULT_TIMEOUT_MS);
          }),
        ]);

        const durationMs = Date.now() - start;
        const output = truncateOutput(result);
        await safeHook(() => merged.onAfter?.(name, input, output, durationMs));
        return { output, durationMs };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if ((error as Error & { _timeout?: boolean })._timeout) {
          await safeHook(() => merged.onTimeout?.(name, input, DEFAULT_TIMEOUT_MS));
        } else {
          await safeHook(() => merged.onError?.(name, input, error));
        }
        throw error;
      }
    },

    toLLMSchema(): LLMToolSchema[] {
      return tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.schema,
        },
      }));
    },
  };
}
