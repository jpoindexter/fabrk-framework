import { defineTool, textResult } from "../define-tool";
import type { ToolDefinition } from "../define-tool";

export interface RagResult {
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface RagToolOptions {
  /** Tool name exposed to the LLM. Default: "knowledge-search" */
  name?: string;
  /** Tool description exposed to the LLM. */
  description?: string;
  /** Default number of results to fetch when the agent omits topK. Default: 5 */
  topK?: number;
  /** Results with score below this threshold are excluded. Default: 0.0 */
  minScore?: number;
  /** Override the default result formatter. */
  formatResult?: (results: RagResult[], query: string) => string;
  /** Search function injected by the caller. */
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

      // Filter results below minScore
      const results =
        minScore > 0
          ? raw.filter((r) => r.score === undefined || r.score >= minScore)
          : raw;

      return textResult(formatResult(results, query));
    },
  });
}
