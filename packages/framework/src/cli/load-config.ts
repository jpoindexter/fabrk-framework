import path from "node:path";
import fs from "node:fs";

export async function loadFabrkViteConfig(root: string) {
  const { fabrkPlugin } = await import("../runtime/plugin");
  const { agentPlugin } = await import("../agents/vite-plugin");
  const { dashboardPlugin } = await import("../dashboard/vite-plugin");

  const configFiles = ["vite.config.ts", "vite.config.js", "vite.config.mjs"];
  let userConfigPath: string | undefined;
  for (const file of configFiles) {
    const fullPath = path.join(root, file);
    if (fs.existsSync(fullPath)) {
      userConfigPath = fullPath;
      break;
    }
  }

  return { fabrkPlugin, agentPlugin, dashboardPlugin, userConfigPath };
}
