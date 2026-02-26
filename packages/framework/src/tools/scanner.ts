import fs from "node:fs";
import path from "node:path";

export interface ScannedTool {
  /** Tool name (filename without extension) */
  name: string;
  /** Absolute path to the tool file */
  filePath: string;
}

const TOOL_EXTENSIONS = new Set([".ts", ".js", ".tsx", ".jsx"]);

/**
 * Scan the tools/ directory for tool definitions.
 * Each .ts/.js file in tools/ is a tool (name derived from filename).
 */
export function scanTools(root: string): ScannedTool[] {
  const toolsDir = path.join(root, "tools");
  if (!fs.existsSync(toolsDir)) return [];

  const entries = fs.readdirSync(toolsDir, { withFileTypes: true });
  const tools: ScannedTool[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!TOOL_EXTENSIONS.has(ext)) continue;

    tools.push({
      name: path.basename(entry.name, ext),
      filePath: path.join(toolsDir, entry.name),
    });
  }

  return tools;
}
