/**
 * fabrk — AI-first full-stack framework built on vinext
 *
 * Composes vinext (Vite + Next.js API + Cloudflare Workers) with
 * fabrk's AI agents, tools, components, auth, and payments.
 *
 * Usage:
 *   import fabrk from 'fabrk'
 *   export default defineConfig({ plugins: [fabrk()] })
 */

import type { Plugin } from "vite";
import vinext from "vinext";
import { agentPlugin } from "./agents/vite-plugin.js";
import { dashboardPlugin } from "./dashboard/vite-plugin.js";

export interface FabrkOptions {
  /** Options passed through to vinext() */
  vinext?: Parameters<typeof vinext>[0];
  /** Enable AI agent scanning from agents/ directory (default: true) */
  agents?: boolean;
  /** Enable /__ai dev dashboard (default: true) */
  dashboard?: boolean;
}

/**
 * Vite plugin that composes vinext + fabrk additions.
 *
 * Includes:
 * - vinext: Vite + Next.js API surface + Cloudflare Workers
 * - agentPlugin: scans agents/ and tools/ dirs, registers /api/agents/* routes
 * - dashboardPlugin: serves /__ai dev dashboard
 */
export default function fabrk(options: FabrkOptions = {}): Plugin[] {
  const vinextPlugins = vinext(options.vinext);
  const fabrkPlugins: Plugin[] = [];

  if (options.agents !== false) {
    fabrkPlugins.push(agentPlugin());
  }
  if (options.dashboard !== false) {
    fabrkPlugins.push(dashboardPlugin());
  }

  return [...vinextPlugins, ...fabrkPlugins];
}

// Re-export vinext for direct access
export { vinext };

// Re-export fabrk-specific APIs
export { defineAgent } from "./agents/define-agent.js";
export type { AgentDefinition } from "./agents/define-agent.js";
export { defineTool } from "./tools/define-tool.js";
export type { ToolDefinition } from "./tools/define-tool.js";
export { loadFabrkConfig } from "./config/fabrk-config.js";
