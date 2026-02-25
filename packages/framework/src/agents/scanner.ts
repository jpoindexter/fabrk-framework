import fs from "node:fs";
import path from "node:path";

export interface ScannedAgent {
  /** Agent name (directory name under agents/) */
  name: string;
  /** Absolute path to the agent.ts file */
  filePath: string;
  /** Route pattern: /api/agents/{name} */
  routePattern: string;
}

/**
 * Scan the agents/ directory for agent definitions.
 * Each subdirectory with an agent.ts or agent.js file is an agent.
 */
export function scanAgents(root: string): ScannedAgent[] {
  const agentsDir = path.join(root, "agents");
  if (!fs.existsSync(agentsDir)) return [];

  const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  const agents: ScannedAgent[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    for (const ext of ["ts", "js", "tsx", "jsx"]) {
      const agentFile = path.join(agentsDir, entry.name, `agent.${ext}`);
      if (fs.existsSync(agentFile)) {
        agents.push({
          name: entry.name,
          filePath: agentFile,
          routePattern: `/api/agents/${entry.name}`,
        });
        break;
      }
    }
  }

  return agents;
}
