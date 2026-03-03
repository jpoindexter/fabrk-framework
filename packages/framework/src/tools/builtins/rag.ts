import { defineTool, textResult } from "../define-tool";
import type { ToolDefinition } from "../define-tool";
import type { RagPipeline } from "@fabrk/ai";

export interface RagResult {
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface RagToolOptions {
  name?: string;
  description?: string;
  topK?: number;
  minScore?: number;
  formatResult?: (results: RagResult[], query: string) => string;
  search: (query: string, topK: number) => Promise<RagResult[]>;
}

function defaultFormat(results: RagResult[], _query: string): string {
  if (results.length === 0) {
    return "No results found.";
  }

  return results
    .map((r, i) => {
      const lines: string[] = [`[${i + 1}] ${r.content}`];

      if (r.score !== undefined) {
        lines.push(`    score: ${r.score.toFixed(4)}`);
      }

      if (r.metadata && Object.keys(r.metadata).length > 0) {
        const keys = Object.keys(r.metadata).join(", ");
        lines.push(`    metadata keys: ${keys}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function ragToolFromPipeline(
  pipeline: RagPipeline,
  options?: Omit<RagToolOptions, "search">,
): ToolDefinition {
  return ragTool({
    ...options,
    search: async (query, topK) => {
      const results = await pipeline.search(query, { topK });
      return results.map((r) => ({
        content: r.text,
        score: r.score,
        metadata: r.metadata,
      }));
    },
  });
}

export function ragTool(options: RagToolOptions): ToolDefinition {
  const {
    name = "knowledge-search",
    description = "Search the knowledge base for relevant information.",
    topK: defaultTopK = 5,
    minScore = 0.0,
    formatResult = defaultFormat,
    search,
  } = options;

  return defineTool({
    name,
    description,
    schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query.",
        },
        topK: {
          type: "number",
          description: `Maximum number of results to return (default: ${defaultTopK}).`,
        },
      },
      required: ["query"],
    },
    handler: async (input) => {
      const query = input.query as string;
      const topK =
        typeof input.topK === "number" && Number.isFinite(input.topK) && input.topK > 0
          ? Math.floor(input.topK)
          : defaultTopK;

      let raw: RagResult[];
      try {
        raw = await search(query, topK);
      } catch (err) {
        console.error("[fabrk] RAG search error:", err);
        return textResult("Search failed: an internal error occurred.");
      }

      const results =
        minScore > 0
          ? raw.filter((r) => r.score === undefined || r.score >= minScore)
          : raw;

      return textResult(formatResult(results, query));
    },
  });
}
