import type { Plugin } from "vite";
import vinext from "vinext";
import { agentPlugin } from "./agents/vite-plugin";
import { dashboardPlugin } from "./dashboard/vite-plugin";

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

export { defineAgent } from "./agents/define-agent";
export type { AgentDefinition } from "./agents/define-agent";
export { defineTool, textResult } from "./tools/define-tool";
export type { ToolDefinition, ToolResult } from "./tools/define-tool";
export { loadFabrkConfig } from "./config/fabrk-config";
