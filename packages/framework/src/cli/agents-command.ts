import path from "node:path";

export async function runAgents(root: string, version: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`\n  fabrk agents v${version}\n`);

  try {
    const { scanAgents } = await import("../agents/scanner");
    const { scanTools } = await import("../tools/scanner");

    const scannedAgents = scanAgents(root);
    const scannedTools = scanTools(root);

    if (scannedAgents.length === 0) {
      // eslint-disable-next-line no-console
      console.log("  No agents found. Create agents in agents/ directory.\n");
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`  Found ${scannedAgents.length} agent(s):\n`);

    for (const agent of scannedAgents) {
      // eslint-disable-next-line no-console
      console.log(`  ${agent.name}`);
      // eslint-disable-next-line no-console
      console.log(`    Route:  ${agent.routePattern}`);
      // eslint-disable-next-line no-console
      console.log(`    File:   ${path.relative(root, agent.filePath)}`);

      try {
        const mod = await import(agent.filePath);
        const def = mod.default ?? mod;
        if (def && typeof def === "object") {
          if (typeof def.model === "string") {
            // eslint-disable-next-line no-console
            console.log(`    Model:  ${def.model}`);
          }
          if (Array.isArray(def.tools) && def.tools.length > 0) {
            // eslint-disable-next-line no-console
            console.log(`    Tools:  ${def.tools.join(", ")}`);
          }
          if (def.memory) {
            // eslint-disable-next-line no-console
            console.log("    Memory: enabled");
          }
          if (def.auth) {
            // eslint-disable-next-line no-console
            console.log(`    Auth:   ${def.auth}`);
          }
        }
      } catch {
        // eslint-disable-next-line no-console
        console.log("    (could not load definition)");
      }
      // eslint-disable-next-line no-console
      console.log();
    }

    if (scannedTools.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`  Found ${scannedTools.length} tool(s): ${scannedTools.map((t) => t.name).join(", ")}\n`);
    }
  } catch (err) {
    console.error("  Error scanning project:", err);
  }
}
