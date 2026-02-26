import fs from "node:fs";
import path from "node:path";

/**
 * Interpolate {{variable}} placeholders in a template string.
 * Missing variables are left as-is.
 */
export function interpolatePrompt(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in variables ? variables[key] : match;
  });
}

/**
 * Load a prompt file from the prompts/ directory.
 * Resolves {{> partial.md}} includes recursively.
 */
export async function loadPrompt(
  root: string,
  promptPath: string,
  _depth = 0
): Promise<string> {
  // Prevent infinite recursion
  if (_depth > 10) return "";

  const promptsDir = path.join(root, "prompts");
  const fullPath = path.join(promptsDir, promptPath);

  if (!fs.existsSync(fullPath)) {
    return `{{> ${promptPath}}}`;
  }

  let content = fs.readFileSync(fullPath, "utf-8");

  // Resolve {{> partial}} includes
  const partialRegex = /\{\{>\s*([^}]+)\}\}/g;
  const matches = [...content.matchAll(partialRegex)];

  for (const match of matches) {
    const partialPath = match[1].trim();
    const partialContent = await loadPrompt(root, partialPath, _depth + 1);
    content = content.replace(match[0], partialContent);
  }

  return content;
}
