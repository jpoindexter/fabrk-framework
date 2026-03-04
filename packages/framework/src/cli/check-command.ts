import path from "node:path";
import fs from "node:fs";

export async function runCheck(root: string, version: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`\n  fabrk check v${version}\n`);

  let issues = 0;

  const nodeVersion = process.versions.node;
  const majorVersion = parseInt(nodeVersion.split(".")[0], 10);
  if (majorVersion < 22) {
    // eslint-disable-next-line no-console
    console.log(`  [WARN] Node.js ${nodeVersion} detected — Node.js 22+ recommended`);
    issues++;
  } else {
    // eslint-disable-next-line no-console
    console.log(`  [OK]   Node.js ${nodeVersion}`);
  }

  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    // eslint-disable-next-line no-console
    console.log("  [OK]   package.json found");
  } else {
    // eslint-disable-next-line no-console
    console.log("  [FAIL] No package.json found");
    issues++;
  }

  const hasConfigTs = fs.existsSync(path.join(root, "fabrk.config.ts"));
  const hasConfigJs = fs.existsSync(path.join(root, "fabrk.config.js"));
  if (hasConfigTs || hasConfigJs) {
    // eslint-disable-next-line no-console
    console.log(`  [OK]   ${hasConfigTs ? "fabrk.config.ts" : "fabrk.config.js"} found`);
  } else {
    // eslint-disable-next-line no-console
    console.log("  [INFO] No fabrk.config found (using defaults)");
  }

  const hasAppDir = fs.existsSync(path.join(root, "app"));
  if (hasAppDir) {
    // eslint-disable-next-line no-console
    console.log("  [OK]   app/ directory found");
  } else {
    // eslint-disable-next-line no-console
    console.log("  [INFO] No app/ directory (no file-system routing)");
  }

  const viteConfigs = ["vite.config.ts", "vite.config.js", "vite.config.mjs"];
  const hasViteConfig = viteConfigs.some((f) => fs.existsSync(path.join(root, f)));
  if (hasViteConfig) {
    // eslint-disable-next-line no-console
    console.log("  [OK]   Vite config found");
  } else {
    // eslint-disable-next-line no-console
    console.log("  [INFO] No vite config (fabrk will use defaults)");
  }

  try {
    const { scanAgents } = await import("../agents/scanner");
    const agents = scanAgents(root);
    if (agents.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`  [OK]   ${agents.length} agent(s) discovered`);

      for (const agent of agents) {
        try {
          const mod = await import(agent.filePath);
          const def = mod.default ?? mod;
          if (!def || typeof def !== "object") {
            // eslint-disable-next-line no-console
            console.log(`  [WARN] Agent "${agent.name}" has no valid definition export`);
            issues++;
          } else if (typeof def.model !== "string") {
            // eslint-disable-next-line no-console
            console.log(`  [WARN] Agent "${agent.name}" is missing a "model" field`);
            issues++;
          }
        } catch {
          // eslint-disable-next-line no-console
          console.log(`  [WARN] Agent "${agent.name}" failed to load — check for syntax errors`);
          issues++;
        }
      }
    } else {
      // eslint-disable-next-line no-console
      console.log("  [INFO] No agents found");
    }
  } catch {
    // eslint-disable-next-line no-console
    console.log("  [INFO] Agent scanning not available");
  }

  try {
    const { scanTools } = await import("../tools/scanner");
    const tools = scanTools(root);
    if (tools.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`  [OK]   ${tools.length} tool(s) discovered`);
    } else {
      // eslint-disable-next-line no-console
      console.log("  [INFO] No tools found");
    }
  } catch {
    // eslint-disable-next-line no-console
    console.log("  [INFO] Tool scanning not available");
  }

  const hasTsConfig = fs.existsSync(path.join(root, "tsconfig.json"));
  if (hasTsConfig) {
    // eslint-disable-next-line no-console
    console.log("  [OK]   tsconfig.json found");
  } else {
    // eslint-disable-next-line no-console
    console.log("  [INFO] No tsconfig.json");
  }

  // eslint-disable-next-line no-console
  console.log();
  if (issues === 0) {
    // eslint-disable-next-line no-console
    console.log("  All checks passed.\n");
  } else {
    // eslint-disable-next-line no-console
    console.log(`  ${issues} issue(s) found.\n`);
  }
}
