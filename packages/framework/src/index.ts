import type { Plugin } from "vite";
import vinext from "vinext";
import { agentPlugin } from "./agents/vite-plugin.js";
import { dashboardPlugin } from "./dashboard/vite-plugin.js";

export interface FabrkOptions {
  vinext?: Parameters<typeof vinext>[0];
  agents?: boolean;
  dashboard?: boolean;
}

export default function fabrk(options: FabrkOptions = {}): Plugin[] {
  const vinextPlugins = vinext(options.vinext);
  const plugins: Plugin[] = [];

  if (options.agents !== false) {
    plugins.push(agentPlugin());
  }
  if (options.dashboard !== false) {
    plugins.push(dashboardPlugin());
  }

  return [...vinextPlugins, ...plugins];
}

export { vinext };
export { defineAgent } from "./agents/define-agent.js";
export type { AgentDefinition } from "./agents/define-agent.js";
export { defineTool } from "./tools/define-tool.js";
export type { ToolDefinition } from "./tools/define-tool.js";
export { loadFabrkConfig } from "./config/fabrk-config.js";
