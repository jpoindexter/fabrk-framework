import type { TestAgentResult } from "./create-test-agent";

/**
 * Assertion helpers for agent test results.
 * These are convenience wrappers — you can also assert on result fields directly.
 */

/** Assert that the agent called a specific tool. */
export function calledTool(result: TestAgentResult, toolName: string): boolean {
  return result.toolCalls.some((tc) => tc.name === toolName);
}

/** Assert that the agent called a tool with specific input. */
export function calledToolWith(
  result: TestAgentResult,
  toolName: string,
  expectedInput: Record<string, unknown>,
): boolean {
  return result.toolCalls.some((tc) => {
    if (tc.name !== toolName) return false;
    for (const [key, value] of Object.entries(expectedInput)) {
      if (tc.input[key] !== value) return false;
    }
    return true;
  });
}

/** Assert that the agent's response contains a substring. */
export function respondedWith(result: TestAgentResult, text: string | RegExp): boolean {
  if (typeof text === "string") return result.content.includes(text);
  return text.test(result.content);
}

/** Assert total cost stayed under a threshold. */
export function costUnder(result: TestAgentResult, maxCost: number): boolean {
  return result.usage.cost <= maxCost;
}

/** Assert the agent completed in N or fewer tool-calling iterations. */
export function iterationsUnder(result: TestAgentResult, maxIterations: number): boolean {
  const toolCallEvents = result.events.filter((e) => e.type === "tool-call");
  return toolCallEvents.length <= maxIterations;
}

/** Get all tool calls for a specific tool name. */
export function getToolCalls(
  result: TestAgentResult,
  toolName: string,
): Array<{ name: string; input: Record<string, unknown> }> {
  return result.toolCalls.filter((tc) => tc.name === toolName);
}
