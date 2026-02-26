import { describe, it, expect } from "vitest";
import { loadToolDefinitions } from "../tools/loader";

describe("loadToolDefinitions", () => {
  it("returns empty array for empty input", async () => {
    const result = await loadToolDefinitions([]);
    expect(result).toEqual([]);
  });

  it("skips files that fail to import", async () => {
    const result = await loadToolDefinitions([
      { name: "nonexistent", filePath: "/nonexistent/path/tool.ts" },
    ]);
    expect(result).toEqual([]);
  });
});
