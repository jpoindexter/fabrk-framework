import path from "node:path";
import fs from "node:fs";

interface AgentEntry {
  name: string;
  route: string;
  model: string;
  auth: string;
  tools: string[];
}

interface ToolEntry {
  name: string;
  description: string;
}

/**
 * Scan agents directory, load tool definitions, and generate AGENTS.md.
 * Returns true if the file was generated.
 */
export async function generateAgentsMdFile(root: string): Promise<boolean> {
  const { scanAgents } = await import("../agents/scanner");
  const { scanTools } = await import("../tools/scanner");

  const scannedAgents = scanAgents(root);
  const scannedTools = scanTools(root);

  if (scannedAgents.length === 0 && scannedTools.length === 0) {
    return false;
  }

  const { generateAgentsMd } = await import("../build/agents-md");
  const { loadToolDefinitions } = await import("../tools/loader");

  const toolDefs = await loadToolDefinitions(scannedTools);
  const agentEntries = await loadAgentEntries(scannedAgents);

  const md = generateAgentsMd({
    agents: agentEntries,
    tools: toolDefs.map(toToolEntry),
    prompts: [],
  });

  const outPath = path.join(root, "AGENTS.md");
  fs.writeFileSync(outPath, md);

  // eslint-disable-next-line no-console
  console.log(
    `        Generated (${scannedAgents.length} agents, ${scannedTools.length} tools)`,
  );
  return true;
}

async function loadAgentEntries(
  scannedAgents: Array<{ name: string; filePath: string; routePattern: string }>,
): Promise<AgentEntry[]> {
  return Promise.all(
    scannedAgents.map(async (a) => {
      try {
        const mod = await import(a.filePath);
        const def = mod.default ?? mod;
        if (def && typeof def === "object" && typeof def.model === "string") {
          return {
            name: a.name,
            route: a.routePattern,
            model: def.model as string,
            auth: (def.auth as string) ?? "none",
            tools: (def.tools as string[]) ?? [],
          };
        }
      } catch (err) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.warn(`[fabrk] failed to load agent definition for "${a.name}":`, err);
        }
      }
      return {
        name: a.name,
        route: a.routePattern,
        model: "default",
        auth: "none",
        tools: [] as string[],
      };
    }),
  );
}

function toToolEntry(t: { name: string; description: string }): ToolEntry {
  return { name: t.name, description: t.description };
}
