import type { ScannedTool } from "./scanner.js";
import type { ToolDefinition } from "./define-tool.js";

/**
 * Dynamically import tool definitions from scanned tool files.
 * Each file should export a ToolDefinition as default or named export.
 */
export async function loadToolDefinitions(
  scanned: ScannedTool[]
): Promise<ToolDefinition[]> {
  const tools: ToolDefinition[] = [];

  for (const entry of scanned) {
    try {
      const mod = await import(/* @vite-ignore */ entry.filePath);
      const toolDef: ToolDefinition = mod.default ?? mod;

      if (toolDef?.name && typeof toolDef?.handler === "function") {
        tools.push(toolDef);
      }
    } catch (err) {
      console.warn(`[fabrk] Failed to load tool "${entry.name}":`, err);
    }
  }

  return tools;
}
