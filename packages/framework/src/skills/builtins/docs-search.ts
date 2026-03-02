import fs from "node:fs";
import path from "node:path";
import type { SkillDefinition } from "../define-skill";
import { defineSkill } from "../define-skill";
import { defineTool, textResult } from "../../tools/define-tool";

export function docsSearch(options: { dir: string; name?: string }): SkillDefinition {
  const searchTool = defineTool({
    name: options.name ?? "docs-search",
    description: "Search markdown files in the documentation directory",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
    handler: async (input) => {
      const query = typeof input.query === "string" ? input.query.toLowerCase() : "";
      if (!query) return textResult("No query provided");

      const dir = path.resolve(options.dir);
      if (!fs.existsSync(dir)) return textResult("Documentation directory not found");

      const results: string[] = [];
      const files = collectMarkdownFiles(dir);

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        if (content.toLowerCase().includes(query)) {
          const relativePath = path.relative(dir, file);
          // Extract matching lines with context
          const lines = content.split("\n");
          const matchingLines = lines
            .map((line, i) => ({ line, index: i }))
            .filter(({ line }) => line.toLowerCase().includes(query))
            .slice(0, 3)
            .map(({ line, index }) => `  L${index + 1}: ${line.trim()}`);

          results.push(`**${relativePath}**\n${matchingLines.join("\n")}`);
        }
      }

      if (results.length === 0) return textResult(`No results found for "${query}"`);
      return textResult(results.slice(0, 10).join("\n\n"));
    },
  });

  return defineSkill({
    name: "docs-search",
    description: "Search project documentation",
    systemPrompt: "You have access to a documentation search tool. Use it to find relevant information when the user asks questions about the project.",
    tools: [searchTool],
  });
}

function collectMarkdownFiles(dir: string, maxDepth = 3, depth = 0): string[] {
  if (depth > maxDepth) return [];

  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))) {
      files.push(fullPath);
    } else if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      files.push(...collectMarkdownFiles(fullPath, maxDepth, depth + 1));
    }
  }

  return files;
}
