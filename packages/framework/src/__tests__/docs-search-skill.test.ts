import { describe, it, expect, afterEach } from "vitest";
import { docsSearch } from "../skills/builtins/docs-search";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Build a real temp directory structure and clean it up after each test
function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-docs-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

async function callSearch(skillDir: string, query: string): Promise<string> {
  const skill = docsSearch({ dir: skillDir });
  const tool = skill.tools[0];
   
  const result = await (tool as any).handler({ query });
  // Tool returns { content: [{ type: "text", text: "..." }] }
  return result.content[0].text as string;
}

describe("docsSearch — collectMarkdownFiles via handler", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const d of dirs) cleanup(d);
    dirs.length = 0;
  });

  it("finds .md files in root dir", async () => {
    const dir = makeTmpDir();
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, "README.md"), "# Hello\nThis is documentation.");

    const text = await callSearch(dir, "documentation");
    expect(text).toContain("README.md");
    expect(text).toContain("documentation");
  });

  it("finds .mdx files in root dir", async () => {
    const dir = makeTmpDir();
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, "guide.mdx"), "export const meta = {}\n\nThis is a guide with widgets.");

    const text = await callSearch(dir, "widgets");
    expect(text).toContain("guide.mdx");
  });

  it("finds files in subdirectories", async () => {
    const dir = makeTmpDir();
    dirs.push(dir);
    fs.mkdirSync(path.join(dir, "api"));
    fs.writeFileSync(path.join(dir, "api", "reference.md"), "# API\nEndpoints and schemas.");

    const text = await callSearch(dir, "endpoints");
    expect(text).toContain("reference.md");
  });

  it("skips hidden directories (dot-prefixed)", async () => {
    const dir = makeTmpDir();
    dirs.push(dir);
    fs.mkdirSync(path.join(dir, ".hidden"));
    fs.writeFileSync(path.join(dir, ".hidden", "secret.md"), "# Hidden\nDo not include this secret content.");
    // Root has a visible file so query doesn't return 'no dir'
    fs.writeFileSync(path.join(dir, "visible.md"), "# Visible doc");

    const text = await callSearch(dir, "secret");
    expect(text).toContain("No results found");
  });

  it("skips node_modules directory", async () => {
    const dir = makeTmpDir();
    dirs.push(dir);
    fs.mkdirSync(path.join(dir, "node_modules", "pkg"), { recursive: true });
    fs.writeFileSync(path.join(dir, "node_modules", "pkg", "readme.md"), "# Pkg\nnode module readme content.");
    fs.writeFileSync(path.join(dir, "main.md"), "# Main");

    const text = await callSearch(dir, "node module readme");
    expect(text).toContain("No results found");
  });

  it("returns 'Documentation directory not found' for missing dir", async () => {
    const text = await callSearch("/nonexistent/path/xyz", "anything");
    expect(text).toContain("Documentation directory not found");
  });

  it("returns 'No query provided' for empty query", async () => {
    const dir = makeTmpDir();
    dirs.push(dir);
    const text = await callSearch(dir, "");
    expect(text).toContain("No query provided");
  });
});
