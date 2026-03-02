import type { ToolDefinition, ToolResult } from "../tools/define-tool";
import type { LLMToolSchema } from "@fabrk/ai";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARS = 50_000;

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

export function createToolExecutor(tools: ToolDefinition[]): ToolExecutor {
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

      const start = Date.now();

      const result = await Promise.race([
        tool.handler(input),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Tool "${name}" timed out after ${DEFAULT_TIMEOUT_MS}ms`)), DEFAULT_TIMEOUT_MS)
        ),
      ]);

      const durationMs = Date.now() - start;
      return { output: truncateOutput(result), durationMs };
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
