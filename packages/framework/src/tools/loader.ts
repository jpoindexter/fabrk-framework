import type { ScannedTool } from "./scanner.js";
import type { ToolDefinition } from "./define-tool.js";

export async function loadToolDefinitions(
  scanned: ScannedTool[]
): Promise<ToolDefinition[]> {
  const tools: ToolDefinition[] = [];

  for (const entry of scanned) {
    try {
      const mod = await import(/* @vite-ignore */ entry.filePath);
      const toolDef: ToolDefinition = mod.default ?? mod;

      if (
        typeof toolDef?.name === "string" &&
        typeof toolDef?.description === "string" &&
        typeof toolDef?.handler === "function"
      ) {
        tools.push(toolDef);
      } else {
        console.warn(`[fabrk] Tool "${entry.name}" has invalid shape, skipping`);
      }
    } catch (err) {
      console.warn(`[fabrk] Failed to load tool "${entry.name}":`, err);
    }
  }

  return tools;
}
