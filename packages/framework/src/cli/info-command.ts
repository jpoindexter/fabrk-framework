import path from "node:path";
import fs from "node:fs";

export async function runInfo(root: string, version: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`\n  fabrk info v${version}\n`);

  try {
    const { scanAgents } = await import("../agents/scanner");
    const { scanTools } = await import("../tools/scanner");

    const agents = scanAgents(root);
    const tools = scanTools(root);

    const promptsDir = path.join(root, "prompts");
    const hasPrompts = fs.existsSync(promptsDir);
    const promptCount = hasPrompts
      ? fs.readdirSync(promptsDir).filter((f) => f.endsWith(".md")).length
      : 0;

    const hasConfig =
      fs.existsSync(path.join(root, "fabrk.config.ts")) ||
      fs.existsSync(path.join(root, "fabrk.config.js"));

    const hasAppDir =
      fs.existsSync(path.join(root, "app")) ||
      fs.existsSync(path.join(root, "src", "app"));

    // eslint-disable-next-line no-console
    console.log(`  Config:   ${hasConfig ? "fabrk.config.ts" : "none (using defaults)"}`);
    // eslint-disable-next-line no-console
    console.log(`  Agents:   ${agents.length}${agents.length > 0 ? ` (${agents.map((a) => a.name).join(", ")})` : ""}`);
    // eslint-disable-next-line no-console
    console.log(`  Tools:    ${tools.length}${tools.length > 0 ? ` (${tools.map((t) => t.name).join(", ")})` : ""}`);
    // eslint-disable-next-line no-console
    console.log(`  Prompts:  ${promptCount}`);
    // eslint-disable-next-line no-console
    console.log(`  App dir:  ${hasAppDir ? "yes" : "no"}`);
    // eslint-disable-next-line no-console
    console.log();
  } catch (err) {
    console.error("  Error scanning project:", err);
  }
}
