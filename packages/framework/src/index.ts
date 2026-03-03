import type { Plugin } from "vite";
import { fabrkPlugin, type FabrkRuntimeOptions } from "./runtime/plugin";
import { agentPlugin } from "./agents/vite-plugin";
import { dashboardPlugin } from "./dashboard/vite-plugin";
import { serverActionPlugin } from "./runtime/server-action-transform";

export interface FabrkOptions {
  runtime?: FabrkRuntimeOptions;
  agents?: boolean;
  dashboard?: boolean;
  /** Enable "use server" compiler transform. Defaults to true. */
  serverActions?: boolean;
}

export default function fabrk(options: FabrkOptions = {}): Plugin[] {
  const runtimePlugins = fabrkPlugin(options.runtime);
  const plugins: Plugin[] = [];

  if (options.serverActions !== false) {
    plugins.push(serverActionPlugin());
  }
  if (options.agents !== false) {
    plugins.push(agentPlugin());
  }
  if (options.dashboard !== false) {
    plugins.push(dashboardPlugin());
  }

  return [...runtimePlugins, ...plugins];
}

export { fabrkPlugin } from "./runtime/plugin";
export type { FabrkRuntimeOptions } from "./runtime/plugin";
export { scanRoutes, matchRoute, collectBoundaries } from "./runtime/router";
export type { Route, RouteMatch } from "./runtime/router";
export { handleRequest } from "./runtime/ssr-handler";
export { nodeToWebRequest, writeWebResponse } from "./runtime/node-web-bridge";
export { createFetchHandler } from "./runtime/worker-entry";
export type { FetchHandlerOptions } from "./runtime/worker-entry";

export { notFound, redirect, permanentRedirect } from "./runtime/server-helpers";
export { isRedirectError, isNotFoundError } from "./runtime/server-helpers";
export { buildPageTree } from "./runtime/page-builder";
export type { PageModules, BuildPageTreeOptions } from "./runtime/page-builder";
export {
  ErrorBoundary,
  NotFoundBoundary,
  GlobalErrorBoundary,
  FABRK_NOT_FOUND,
  FABRK_REDIRECT,
} from "./runtime/error-boundary";
export { safeJsonStringify } from "./runtime/safe-json";

export {
  runMiddleware,
  compileMatcher,
  matchesMiddleware,
  extractMiddleware,
} from "./runtime/middleware";
export type {
  MiddlewareResult,
  MiddlewareConfig,
  MiddlewareHandler,
  MiddlewareModule,
} from "./runtime/middleware";

export {
  collectStaticRoutes,
  resolveOutputPath,
  renderStaticPage,
} from "./runtime/static-export";
export type { StaticRoute, StaticExportOptions } from "./runtime/static-export";

export { handleImageRequest, isImageRequest } from "./runtime/image-handler";

export {
  InMemoryISRCache,
  serveFromISR,
  isrRevalidateTag,
  isrRevalidatePath,
  getRevalidateInterval,
  getPageTags,
} from "./runtime/isr-cache";
export type { ISRCacheHandler, ISRCacheEntry, ISRResult } from "./runtime/isr-cache";

export { generateSitemap } from "./build/sitemap-gen";
export type { SitemapEntry, SitemapOptions } from "./build/sitemap-gen";

export {
  createCachedFetch,
  patchFetch,
  clearFetchCache,
  revalidateTag,
  revalidatePath,
  getCacheStats,
  initFetchCache,
} from "./runtime/fetch-cache";
export type {
  FetchCacheOptions,
  CachedResponse,
} from "./runtime/fetch-cache";

export {
  createActionRegistry,
  validateCsrf,
  handleServerAction,
} from "./runtime/server-actions";
export type { ServerActionRegistry } from "./runtime/server-actions";

export { serverActionPlugin, generateActionId } from "./runtime/server-action-transform";

export { defineAgent } from "./agents/define-agent";
export type { AgentDefinition, DefineAgentOptions, AgentBudget, AgentMemoryConfig } from "./agents/define-agent";
export { defineTool, textResult } from "./tools/define-tool";
export type { ToolDefinition, ToolResult } from "./tools/define-tool";
export { sqlQueryTool } from "./tools/builtins/sql-query";
export type { SqlQueryOptions } from "./tools/builtins/sql-query";
export { loadFabrkConfig } from "./config/fabrk-config";

// i18n
export { extractLocale, detectLocale, localePath, createI18nMiddleware } from "./runtime/i18n";
export type { I18nConfig } from "./runtime/i18n";

// Memory
export { setMemoryStore, getMemoryStore, InMemoryMemoryStore, SemanticMemoryStore } from "./agents/memory/index";
export type { MemoryStore, Thread, ThreadMessage } from "./agents/memory/types";
export type { SemanticMemoryOptions } from "./agents/memory/semantic-store";

// Orchestration
export { agentAsTool, defineSupervisor, detectCircularDeps } from "./agents/orchestration/index";
export type { SupervisorConfig } from "./agents/orchestration/supervisor";

// MCP
export { createMCPServer, connectMCPServer, startStdioServer, createStdioClient } from "./tools/mcp/index";
export type { MCPServer } from "./tools/mcp/server";
export type { MCPClientOptions } from "./tools/mcp/client";

// Skills
export { defineSkill, applySkill, composeSkills, scanSkills, loadSkillDefinitions, docsSearch } from "./skills/index";
export type { SkillDefinition, DefineSkillOptions } from "./skills/define-skill";
export type { ScannedSkill } from "./skills/scanner";

// Agent loop
export { runAgentLoop } from "./agents/agent-loop";
export type { AgentLoopEvent, AgentLoopOptions } from "./agents/agent-loop";
export { createToolExecutor } from "./agents/tool-executor";

// Testing
export { mockLLM, MockLLM, createTestAgent, calledTool, calledToolWith, respondedWith, costUnder, iterationsUnder, getToolCalls } from "./testing/index";
export type { TestAgentOptions, TestAgentResult } from "./testing/index";

// Built-in tools
export { ragTool } from "./tools/builtins/rag";
export type { RagResult, RagToolOptions } from "./tools/builtins/rag";
