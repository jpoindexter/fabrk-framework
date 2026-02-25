/**
 * fabrk — Public API
 *
 * The React framework where AI agents are as native as pages and API routes.
 */

// Agent system
export { defineAgent } from "./agents/define-agent.js";
export type {
  AgentDefinition,
  DefineAgentOptions,
  AgentBudget,
} from "./agents/define-agent.js";
export { scanAgents } from "./agents/scanner.js";
export type { ScannedAgent } from "./agents/scanner.js";
export { createAgentHandler } from "./agents/route-handler.js";
export type { AgentHandlerOptions } from "./agents/route-handler.js";
export { createLLMBridge } from "./agents/llm-bridge.js";
export type { LLMBridge, LLMProvider } from "./agents/llm-bridge.js";

// LLM calling + fallback
export { callLLM, callWithFallback } from "./agents/llm-caller.js";
export type { LLMCallResult } from "./agents/llm-caller.js";

// Budget enforcement
export { checkBudget, recordCost } from "./agents/budget-guard.js";

// SSE streaming
export { formatSSEEvent, createSSEStream, createSSEResponse } from "./agents/sse-stream.js";
export type { SSEEvent } from "./agents/sse-stream.js";

// Tool system
export { defineTool, textResult } from "./tools/define-tool.js";
export type { ToolDefinition, ToolResult } from "./tools/define-tool.js";
export { scanTools } from "./tools/scanner.js";
export type { ScannedTool } from "./tools/scanner.js";

// Prompts
export { loadPrompt, interpolatePrompt } from "./prompts/loader.js";

// Config
export { defineFabrkConfig, loadFabrkConfig } from "./config/fabrk-config.js";
export type { FabrkConfig, FabrkAIConfig } from "./config/fabrk-config.js";

// Middleware
export { createAuthGuard } from "./middleware/auth-guard.js";
export { buildSecurityHeaders } from "./middleware/security.js";

// Build utilities
export { generateAgentsMd } from "./build/agents-md.js";
export type { AgentsMdInput } from "./build/agents-md.js";

// Client (re-export parseSSELine for non-React usage)
export { parseSSELine } from "./client/use-agent.js";
