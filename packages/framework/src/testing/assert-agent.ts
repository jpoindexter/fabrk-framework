import type { TestAgentResult } from "./create-test-agent";

export function calledTool(result: TestAgentResult, toolName: string): boolean {
  return result.toolCalls.some((tc) => tc.name === toolName);
}

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

export function respondedWith(result: TestAgentResult, text: string | RegExp): boolean {
  // Both paths use test-author-controlled input; content is bounded by LLM response limits.
  // String search: indexOf is O(n*m) worst case but acceptable for test assertions.
  if (typeof text === "string") {
    return result.content.indexOf(text) !== -1; // codeql[js/polynomial-redos] test-only utility
  }
  return text.test(result.content);
}

export function costUnder(result: TestAgentResult, maxCost: number): boolean {
  return result.usage.cost <= maxCost;
}

export function iterationsUnder(result: TestAgentResult, maxIterations: number): boolean {
  const toolCallEvents = result.events.filter((e) => e.type === "tool-call");
  return toolCallEvents.length <= maxIterations;
}

export function getToolCalls(
  result: TestAgentResult,
  toolName: string,
): Array<{ name: string; input: Record<string, unknown> }> {
  return result.toolCalls.filter((tc) => tc.name === toolName);
}
