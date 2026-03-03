export interface StopConditionContext {
  /** How many iterations have completed (0-indexed: first tool-use loop completes iteration 0) */
  iterationCount: number;
  /** Names of tools called in the most recent iteration (empty on first call or no-tool turns) */
  lastToolCallNames: string[];
}

export type StopCondition = (ctx: StopConditionContext) => boolean;

/** Stop after at most `n` tool-using iterations (i.e., fires when iterationCount >= n). */
export function stepCountIs(n: number): StopCondition {
  return ({ iterationCount }) => iterationCount >= n;
}

/**
 * Stop when any tool named `name` was called in the last iteration.
 * If `name` is omitted, stops when any tool was called.
 */
export function hasToolCall(name?: string): StopCondition {
  return ({ lastToolCallNames }) => {
    if (name === undefined) return lastToolCallNames.length > 0;
    return lastToolCallNames.includes(name);
  };
}
