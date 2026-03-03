import { describe, it, expect, vi } from "vitest";
import { ragTool } from "../tools/builtins/rag";
import type { RagResult } from "../tools/builtins/rag";

// Extracts the text from a ToolResult for assertions.
function getText(result: { content: Array<{ type: string; text?: string }> }): string {
  const part = result.content[0];
  return (part as { text: string }).text;
}

// Builds a minimal RagResult.
function makeResult(
  content: string,
  score?: number,
  metadata?: Record<string, unknown>
): RagResult {
  return { content, score, metadata };
}

describe("ragTool", () => {
  // ── Basic search ──────────────────────────────────────────────────────────

  it("returns results numbered and formatted", async () => {
    const tool = ragTool({
      search: async () => [
        makeResult("First answer"),
        makeResult("Second answer"),
      ],
    });

    const result = await tool.handler({ query: "what is X?" });
    const text = getText(result);

    expect(text).toContain("[1] First answer");
    expect(text).toContain("[2] Second answer");
  });

  it("uses default name and description when none supplied", () => {
    const tool = ragTool({ search: async () => [] });
    expect(tool.name).toBe("knowledge-search");
    expect(tool.description).toBe("Search the knowledge base for relevant information.");
  });

  it("includes score when present on result", async () => {
    const tool = ragTool({
      search: async () => [makeResult("Relevant doc", 0.9312)],
    });

    const text = getText(await tool.handler({ query: "docs" }));
    expect(text).toContain("score: 0.9312");
  });

  it("omits score line when score is undefined", async () => {
    const tool = ragTool({
      search: async () => [makeResult("No score")],
    });

    const text = getText(await tool.handler({ query: "q" }));
    expect(text).not.toContain("score:");
  });

  // ── Empty results ─────────────────────────────────────────────────────────

  it("returns a graceful message when search yields nothing", async () => {
    const tool = ragTool({ search: async () => [] });
    const text = getText(await tool.handler({ query: "nothing here" }));
    expect(text).toBe("No results found.");
  });

  it("returns no results message when all results are filtered by minScore", async () => {
    const tool = ragTool({
      minScore: 0.8,
      search: async () => [
        makeResult("Low relevance", 0.3),
        makeResult("Also low", 0.5),
      ],
    });

    const text = getText(await tool.handler({ query: "q" }));
    expect(text).toBe("No results found.");
  });

  // ── Score filtering ───────────────────────────────────────────────────────

  it("keeps results at or above minScore, drops those below", async () => {
    const tool = ragTool({
      minScore: 0.7,
      search: async () => [
        makeResult("High", 0.95),
        makeResult("Exactly at threshold", 0.7),
        makeResult("Below", 0.69),
      ],
    });

    const text = getText(await tool.handler({ query: "q" }));
    expect(text).toContain("High");
    expect(text).toContain("Exactly at threshold");
    expect(text).not.toContain("Below");
  });

  it("passes through results without a score when minScore > 0", async () => {
    // Results with no score should not be discarded (score === undefined).
    const tool = ragTool({
      minScore: 0.5,
      search: async () => [makeResult("No score at all")],
    });

    const text = getText(await tool.handler({ query: "q" }));
    expect(text).toContain("No score at all");
  });

  // ── topK propagation ──────────────────────────────────────────────────────

  it("passes default topK to search when agent omits it", async () => {
    const search = vi.fn(async () => [] as RagResult[]);
    const tool = ragTool({ topK: 3, search });

    await tool.handler({ query: "q" });
    expect(search).toHaveBeenCalledWith("q", 3);
  });

  it("passes agent-supplied topK to search, flooring fractional values", async () => {
    const search = vi.fn(async () => [] as RagResult[]);
    const tool = ragTool({ topK: 5, search });

    await tool.handler({ query: "q", topK: 2.9 });
    expect(search).toHaveBeenCalledWith("q", 2);
  });

  it("falls back to default topK when agent-supplied topK is invalid", async () => {
    const search = vi.fn(async () => [] as RagResult[]);
    const tool = ragTool({ topK: 5, search });

    await tool.handler({ query: "q", topK: -1 });
    expect(search).toHaveBeenCalledWith("q", 5);

    await tool.handler({ query: "q", topK: 0 });
    expect(search).toHaveBeenCalledWith("q", 5);
  });

  // ── Metadata display ──────────────────────────────────────────────────────

  it("lists metadata keys when metadata is non-empty", async () => {
    const tool = ragTool({
      search: async () => [
        makeResult("Doc with meta", 0.8, { source: "wiki", page: 3 }),
      ],
    });

    const text = getText(await tool.handler({ query: "q" }));
    expect(text).toContain("metadata keys: source, page");
  });

  it("omits metadata line when metadata object is empty", async () => {
    const tool = ragTool({
      search: async () => [makeResult("No meta", 0.8, {})],
    });

    const text = getText(await tool.handler({ query: "q" }));
    expect(text).not.toContain("metadata keys:");
  });

  // ── Custom formatter ──────────────────────────────────────────────────────

  it("calls the custom formatResult function with results and query", async () => {
    const formatResult = vi.fn(
      (results: RagResult[], query: string) =>
        `query=${query} count=${results.length}`
    );

    const tool = ragTool({
      search: async () => [makeResult("doc")],
      formatResult,
    });

    const text = getText(await tool.handler({ query: "custom" }));
    expect(formatResult).toHaveBeenCalledOnce();
    expect(text).toBe("query=custom count=1");
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it("returns an error message when search throws, does not rethrow", async () => {
    const tool = ragTool({
      search: async () => {
        throw new Error("vector db timeout");
      },
    });

    const result = await tool.handler({ query: "q" });
    const text = getText(result);
    expect(text).toBe("Search failed: an internal error occurred.");
  });

  it("handles non-Error throw from search function", async () => {
    const tool = ragTool({
        search: async () => { throw "string error"; },
    });

    const text = getText(await tool.handler({ query: "q" }));
    expect(text).toBe("Search failed: an internal error occurred.");
  });

  // ── Custom name / description ─────────────────────────────────────────────

  it("respects custom name and description", () => {
    const tool = ragTool({
      name: "docs-search",
      description: "Search internal documentation.",
      search: async () => [],
    });

    expect(tool.name).toBe("docs-search");
    expect(tool.description).toBe("Search internal documentation.");
  });

  // ── Schema structure ──────────────────────────────────────────────────────

  it("exposes a valid JSON schema with query required and topK optional", () => {
    const tool = ragTool({ search: async () => [] });

    expect(tool.schema.type).toBe("object");
    expect(tool.schema.properties).toHaveProperty("query");
    expect(tool.schema.properties).toHaveProperty("topK");
    expect(tool.schema.required).toContain("query");
    expect(tool.schema.required).not.toContain("topK");
  });
});
