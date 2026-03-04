import type { Plugin } from "vite";
import { fabrkPlugin, type FabrkRuntimeOptions } from "./runtime/plugin";
import { agentPlugin } from "./agents/vite-plugin";
import { dashboardPlugin } from "./dashboard/vite-plugin";
import { serverActionPlugin } from "./runtime/server-action-transform";
import { voicePlugin } from "./agents/voice-plugin";

export interface FabrkOptions {
  runtime?: FabrkRuntimeOptions;
  agents?: boolean;
  dashboard?: boolean;
  /** Enable "use server" compiler transform. Defaults to true. */
  serverActions?: boolean;
  /** Enable voice routes (/__ai/tts, /__ai/stt, /__ai/realtime). Defaults to true. */
  voice?: boolean;
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
  if (options.voice !== false) {
    plugins.push(voicePlugin());
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

// OG image generation
export { defineOGTemplate, handleOGRequest, isOGRequest } from "./runtime/og-handler";
export type { OGTemplate, OGTemplateOptions, OGFont } from "./runtime/og-handler";

// JSON-LD structured data
export { buildJsonLdScript, JsonLdScript } from "./runtime/json-ld";
export type { JsonLdData, JsonLdOrganization, JsonLdProduct, JsonLdArticle, JsonLdBreadcrumb } from "./runtime/json-ld";

export {
  InMemoryISRCache,
  FilesystemISRCache,
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
export type { AgentDefinition, DefineAgentOptions, AgentBudget, AgentMemoryConfig, GenerationOptions, ToolChoiceValue } from "./agents/define-agent";
export { defineTool, textResult } from "./tools/define-tool";
export type { ToolDefinition, ToolResult, TextPart, ImagePart, FilePart, ToolOutputPart } from "./tools/define-tool";
export { toolDefinition, clientTools } from "./tools/tool-definition";
export type { IsomorphicToolDefinition, ClientToolDescriptor } from "./tools/tool-definition";
export { zodToJsonSchema } from "./tools/zod-schema";
export type { ZodObjectLike } from "./tools/zod-schema";
export { sqlQueryTool } from "./tools/builtins/sql-query";
export type { SqlQueryOptions } from "./tools/builtins/sql-query";
export { loadFabrkConfig } from "./config/fabrk-config";
export type { TracingConfig } from "./config/fabrk-config.js";

// A2A Protocol (Agent-to-Agent)
export * from "./agents/a2a/index.js";

// i18n
export { extractLocale, detectLocale, localePath, createI18nMiddleware } from "./runtime/i18n";
export type { I18nConfig } from "./runtime/i18n";

// Memory
export { setMemoryStore, getMemoryStore, InMemoryMemoryStore, SemanticMemoryStore } from "./agents/memory/index";
export type { MemoryStore, Thread, ThreadMessage } from "./agents/memory/types";
export type { SemanticMemoryOptions } from "./agents/memory/semantic-store";
export { buildWorkingMemory } from "./agents/memory/working-memory";
export type { WorkingMemoryConfig } from "./agents/memory/working-memory";
export { InMemoryLongTermStore } from "./agents/memory/long-term-store.js";
export type { LongTermStore, LongTermEntry } from "./agents/memory/long-term-store.js";

// Orchestration
export { agentAsTool, defineSupervisor, detectCircularDeps } from "./agents/orchestration/index";
export type { SupervisorConfig } from "./agents/orchestration/supervisor";

// Agent network
export { defineAgentNetwork } from "./agents/network.js";
export type { AgentNetwork, AgentNetworkConfig, AgentNetworkResult, NetworkContext, LLMRouterConfig, RouterFn } from "./agents/network.js";

// Workflows
export { defineWorkflow, agentStep, toolStep, conditionStep, parallelStep, runWorkflow, createWorkflowStream } from "./agents/workflow/index";
export type { WorkflowDefinition, WorkflowStep, WorkflowResult, WorkflowContext, StepResult, WorkflowProgressEvent } from "./agents/workflow/index";

// StateGraph (cyclic workflow)
export { defineStateGraph, createStateGraph, StateGraphBuilder, MessagesAnnotation, interrupt, GraphInterrupt, subgraphNode } from "./agents/workflow/state-graph";
export type { StateGraphConfig, StateGraphEvent, StateGraphEventType, GraphNode, GraphEdge, NodeResult, StateReducers, CompileOptions, CompiledStateGraph, Command } from "./agents/workflow/state-graph";

// MCP
export { createMCPServer, connectMCPServer, startStdioServer, createStdioClient } from "./tools/mcp/index";
export type { MCPServer, MCPResource, MCPPromptDef, MCPPromptArg } from "./tools/mcp/server";
export type { MCPClientOptions, MCPConnection } from "./tools/mcp/client";
export { MCPClientError, OAuth2TokenCache } from "./tools/mcp/client";

// Skills
export { defineSkill, applySkill, composeSkills, scanSkills, loadSkillDefinitions, docsSearch } from "./skills/index";
export type { SkillDefinition, DefineSkillOptions } from "./skills/define-skill";
export type { ScannedSkill } from "./skills/scanner";

// Agent loop
export { runAgentLoop } from "./agents/agent-loop";

// Prompt versioning + A/B testing
export { definePromptVersion, resolvePrompt, abTestPrompt, clearPromptRegistry } from "./agents/prompt-registry";
export type { PromptVersion } from "./agents/prompt-registry";
export type { AgentLoopEvent, AgentLoopOptions } from "./agents/agent-loop";
export { createToolExecutor } from "./agents/tool-executor";

// Durable agent execution (checkpoint/resume)
export { InMemoryCheckpointStore, generateCheckpointId } from "./agents/checkpoint";
export type { CheckpointStore, CheckpointState, CheckpointStatus } from "./agents/checkpoint";
export { handleStartAgent, handleResumeAgent, handleAgentStatus } from "./agents/durable-handler";
export type { DurableAgentOptions } from "./agents/durable-handler";

// Guardrails
export { runGuardrails, maxLength, denyList, requireJsonSchema, piiRedactor, runGuardrailsParallel } from "./agents/guardrails";
export type { Guardrail, GuardrailContext, GuardrailResult, AsyncGuardrail } from "./agents/guardrails";

// Stop conditions
export { stepCountIs, hasToolCall } from "./agents/stop-conditions";
export type { StopCondition, StopConditionContext } from "./agents/stop-conditions";

// Testing
export { mockLLM, MockLLM, createTestAgent, calledTool, calledToolWith, respondedWith, costUnder, iterationsUnder, getToolCalls } from "./testing/index";
export type { TestAgentOptions, TestAgentResult } from "./testing/index";

// Evals
export { defineEval, runEvals, exactMatch, includes, llmAsJudge, toolCallSequence, jsonSchema } from "./testing/index";
export type { EvalCase, EvalSuite, EvalCaseResult, EvalSuiteResult, Scorer, ScorerResult } from "./testing/index";
export { defineDataset } from "./testing/index";
export type { EvalDataset, EvalRunRecord, EvalRunSummary, EvalRunStore } from "./testing/index";
export { FileEvalRunStore } from "./testing/index";

// Tool lifecycle hooks
export type { ToolExecutorHooks } from "./agents/tool-executor";

// OpenTelemetry tracer
export { initTracer, startSpan, setSpanAttributes, getActiveSpan, type SpanAttributes } from "./runtime/tracer";

// Route type generation
export { generateRouteTypes } from "./runtime/route-types-gen";

// Typed navigation
export { useParams, buildHref } from "./client/typed-navigation";
export type { TypedLinkProps } from "./client/typed-navigation";

// Built-in tools
export { ragTool, ragToolFromPipeline } from "./tools/builtins/rag";
export type { RagResult, RagToolOptions } from "./tools/builtins/rag";

// Computer use tools (Anthropic computer_use_20250124 API compatible)
export { defineBashTool, defineTextEditorTool, defineComputerTool } from "./tools/computer-use/index.js";
export type { BashToolOptions, TextEditorToolOptions, TextEditorCommand, TextEditorExecuteOptions, ComputerToolOptions, ComputerAction } from "./tools/computer-use/index.js";

// Voice
export { handleTTSRequest, handleSTTRequest } from "./agents/voice-handler";
export { handleRealtimeUpgrade } from "./agents/voice-ws-handler";
export type { RealtimeHandlerConfig } from "./agents/voice-ws-handler";
export { voicePlugin } from "./agents/voice-plugin";

// Client hooks
export { useAgent, parseSSELine } from "./client/use-agent.js";
export type { AgentMessage, AgentContentPart, AgentUsage, AgentToolCall, InferChatMessages } from "./client/use-agent.js";
export { useObject } from "./client/use-object";
export type { UseObjectOptions } from "./client/use-object";

export { handleStreamObject } from "./runtime/stream-object-handler";

// View Transitions API
export { useViewTransition, ViewTransitionLink } from "./client/view-transition";
export { readManifest, getEntryAssets, buildAssetTags } from "./runtime/asset-manifest";
export { cookies, headers, runWithContext } from "./runtime/server-context";
