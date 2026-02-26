import fs from "node:fs";
import path from "node:path";

export function interpolatePrompt(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return Object.hasOwn(variables, key) ? variables[key] : match;
  });
}

function assertWithinDir(fullPath: string, baseDir: string): void {
  const resolved = path.resolve(fullPath);
  const base = path.resolve(baseDir);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error("Path traversal blocked");
  }
}

export async function loadPrompt(
  root: string,
  promptPath: string,
  depth = 0
): Promise<string> {
  if (depth > 10) return "";

  const promptsDir = path.join(root, "prompts");
  const fullPath = path.join(promptsDir, promptPath);
  assertWithinDir(fullPath, promptsDir);

  if (!fs.existsSync(fullPath)) {
    return `{{> ${promptPath}}}`;
  }

  let content = fs.readFileSync(fullPath, "utf-8");

  const partialRegex = /\{\{>\s*([^}]+)\}\}/g;
  const matches = [...content.matchAll(partialRegex)];

  for (const match of matches) {
    const partialPath = match[1].trim();
    const partialContent = await loadPrompt(root, partialPath, depth + 1);
    content = content.replace(match[0], () => partialContent);
  }

  return content;
}
