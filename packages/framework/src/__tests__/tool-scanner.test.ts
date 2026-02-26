import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { scanTools } from "../tools/scanner.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("scanTools", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-tools-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("discovers tools from tools/ directory", () => {
    const toolsDir = path.join(tmpDir, "tools");
    fs.mkdirSync(toolsDir, { recursive: true });
    fs.writeFileSync(
      path.join(toolsDir, "search-docs.ts"),
      "export default {}"
    );

    const tools = scanTools(tmpDir);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("search-docs");
    expect(tools[0].filePath).toContain("tools/search-docs.ts");
  });

  it("discovers multiple tools", () => {
    const toolsDir = path.join(tmpDir, "tools");
    fs.mkdirSync(toolsDir, { recursive: true });
    for (const name of ["search-docs", "fetch-url", "run-sql"]) {
      fs.writeFileSync(path.join(toolsDir, `${name}.ts`), "export default {}");
    }

    const tools = scanTools(tmpDir);
    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.name).sort()).toEqual([
      "fetch-url",
      "run-sql",
      "search-docs",
    ]);
  });

  it("returns empty array when no tools/ dir", () => {
    const tools = scanTools(tmpDir);
    expect(tools).toEqual([]);
  });

  it("ignores non-ts/js files", () => {
    const toolsDir = path.join(tmpDir, "tools");
    fs.mkdirSync(toolsDir, { recursive: true });
    fs.writeFileSync(path.join(toolsDir, "search-docs.ts"), "export default {}");
    fs.writeFileSync(path.join(toolsDir, "README.md"), "# Tools");

    const tools = scanTools(tmpDir);
    expect(tools).toHaveLength(1);
  });
});
