import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
  WorkflowSuspendedResult,
  StepResult,
  WorkflowProgressEvent,
} from "./types";

const MAX_STEPS_HARD_CAP = 50;

class SuspendError {
  readonly data: unknown;
  constructor(data: unknown) {
    this.data = data;
  }
}

async function runSteps(
  steps: WorkflowStep[],
  ctx: WorkflowContext,
  results: StepResult[],
  stepCount: { n: number },
  maxSteps: number,
  skipIds: Set<string>,
  onProgress?: (event: WorkflowProgressEvent) => void
): Promise<string> {
  let lastOutput = ctx.input;

  for (const step of steps) {
    if (skipIds.has(step.id)) {
      continue;
    }

    if (stepCount.n >= maxSteps) {
      throw new Error(`[fabrk] Workflow exceeded max steps (${maxSteps})`);
    }
    stepCount.n++;

    if (step.type === "agent" || step.type === "tool") {
      onProgress?.({ type: 'step-start', stepName: step.id });
      const stepStart = Date.now();
      try {
        const output = await step.run(ctx);
        const durationMs = Date.now() - stepStart;
        ctx.history.push({ stepId: step.id, output });
        ctx.input = output;
        lastOutput = output;
        results.push({ stepId: step.id, output });
        onProgress?.({ type: 'step-complete', stepName: step.id, output, durationMs });
      } catch (err) {
        const durationMs = Date.now() - stepStart;
        const error = err instanceof Error ? err.message : String(err);
        onProgress?.({ type: 'step-error', stepName: step.id, error, durationMs });
        throw err;
      }
    } else if (step.type === "suspendable-agent" || step.type === "suspendable-tool") {
      onProgress?.({ type: 'step-start', stepName: step.id });
      const stepStart = Date.now();
      const control = {
        suspend: (data: unknown): never => {
          throw new SuspendError(data);
        },
      };
      try {
        const output = (await step.run(ctx, control)) ?? "";
        const durationMs = Date.now() - stepStart;
        ctx.history.push({ stepId: step.id, output });
        ctx.input = output;
        lastOutput = output;
        results.push({ stepId: step.id, output });
        onProgress?.({ type: 'step-complete', stepName: step.id, output, durationMs });
      } catch (err) {
        const durationMs = Date.now() - stepStart;
        if (err instanceof SuspendError) {
          // Don't emit step-error for suspend — it's intentional
          throw err;
        }
        const error = err instanceof Error ? err.message : String(err);
        onProgress?.({ type: 'step-error', stepName: step.id, error, durationMs });
        throw err;
      }
    } else if (step.type === "condition") {
      const branch = step.condition(ctx) ? step.then : (step.else ?? []);
      if (branch.length === 0) {
        results.push({ stepId: step.id, output: lastOutput, skipped: true });
      } else {
        lastOutput = await runSteps(branch, ctx, results, stepCount, maxSteps, skipIds, onProgress);
      }
    } else if (step.type === "parallel") {
      onProgress?.({ type: 'parallel-start', stepName: step.id });
      const subResults = await Promise.all(
        step.steps.map(async (sub) => {
          const subCtx: WorkflowContext = {
            input: ctx.input,
            history: [...ctx.history],
            metadata: ctx.metadata,
            writer: ctx.writer,
          };
          const subStepResults: StepResult[] = [];
          const subCount = { n: stepCount.n };
          try {
            const out = await runSteps([sub], subCtx, subStepResults, subCount, maxSteps, skipIds, onProgress);
            return { out, subStepResults };
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            return { out: `[error: ${errMsg}]`, subStepResults };
          }
        })
      );

      const joined = subResults.map((r) => r.out).join("\n---\n");
      for (const { subStepResults } of subResults) {
        results.push(...subStepResults);
      }
      ctx.history.push({ stepId: step.id, output: joined });
      ctx.input = joined;
      lastOutput = joined;
      results.push({ stepId: step.id, output: joined });
      onProgress?.({ type: 'parallel-complete', stepName: step.id });
    }
  }

  return lastOutput;
}

export async function runWorkflow(
  def: WorkflowDefinition,
  input: string,
  metadata?: Record<string, unknown>,
  opts?: { onProgress?: (event: WorkflowProgressEvent) => void; writer?: WritableStreamDefaultWriter<string> }
): Promise<WorkflowResult> {
  const maxSteps = Math.min(def.maxSteps ?? MAX_STEPS_HARD_CAP, MAX_STEPS_HARD_CAP);
  const ctx: WorkflowContext = { input, history: [], metadata, writer: opts?.writer };
  const results: StepResult[] = [];
  const stepCount = { n: 0 };
  const start = Date.now();

  try {
    const output = await runSteps(def.steps, ctx, results, stepCount, maxSteps, new Set(), opts?.onProgress);
    return { status: "completed", output, stepResults: results, durationMs: Date.now() - start };
  } catch (err) {
    if (err instanceof SuspendError) {
      return {
        status: "suspended",
        suspendedAtStepId: findSuspendedStepId(def.steps, results),
        suspendData: err.data,
        completedSteps: results,
        durationMs: Date.now() - start,
      };
    }
    throw err;
  }
}

/**
 * Determines the id of the step that suspended by finding the first step
 * in the definition whose id does not appear in completed results.
 */
function findSuspendedStepId(steps: WorkflowStep[], completed: StepResult[]): string {
  const completedIds = new Set(completed.map((r) => r.stepId));
  return findFirstMissingId(steps, completedIds) ?? "unknown";
}

function findFirstMissingId(steps: WorkflowStep[], completedIds: Set<string>): string | undefined {
  for (const step of steps) {
    if (step.type === "condition") {
      const inner = findFirstMissingId(step.then, completedIds)
        ?? (step.else ? findFirstMissingId(step.else, completedIds) : undefined);
      if (inner) return inner;
    } else if (step.type === "parallel") {
      const inner = findFirstMissingId(step.steps, completedIds);
      if (inner) return inner;
    } else if (!completedIds.has(step.id)) {
      return step.id;
    }
  }
  return undefined;
}

export async function resumeWorkflow(
  workflow: WorkflowDefinition,
  partialResult: WorkflowSuspendedResult,
  resumeData: unknown,
  opts?: { onProgress?: (event: WorkflowProgressEvent) => void; writer?: WritableStreamDefaultWriter<string> }
): Promise<WorkflowResult> {
  const maxSteps = Math.min(
    workflow.maxSteps ?? MAX_STEPS_HARD_CAP,
    MAX_STEPS_HARD_CAP
  );

  // Rebuild context from completed steps
  const completedIds = new Set(partialResult.completedSteps.map((r) => r.stepId));

  // Seed history and input from already-completed steps
  const history = partialResult.completedSteps.map((r) => ({
    stepId: r.stepId,
    output: r.output,
  }));
  const lastCompleted = partialResult.completedSteps[partialResult.completedSteps.length - 1];
  const resumeInput = lastCompleted?.output ?? "";

  const ctx: WorkflowContext = {
    input: resumeInput,
    history,
    metadata: { resumeData },
    writer: opts?.writer,
  };

  const results: StepResult[] = [...partialResult.completedSteps];
  const stepCount = { n: 0 };
  const start = Date.now();

  try {
    const output = await runSteps(
      workflow.steps,
      ctx,
      results,
      stepCount,
      maxSteps,
      completedIds,
      opts?.onProgress
    );
    return { status: "completed", output, stepResults: results, durationMs: Date.now() - start };
  } catch (err) {
    if (err instanceof SuspendError) {
      return {
        status: "suspended",
        suspendedAtStepId: findSuspendedStepId(workflow.steps, results),
        suspendData: err.data,
        completedSteps: results,
        durationMs: Date.now() - start,
      };
    }
    throw err;
  }
}

/**
 * Creates a ReadableStream + WritableStreamDefaultWriter pair for workflow streaming.
 * Pass `writer` to `runWorkflow`; read `stream` in your HTTP handler or SSE response.
 *
 * @example
 * const { stream, writer } = createWorkflowStream();
 * const resultPromise = runWorkflow(def, input, {}, { writer });
 * return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
 */
export function createWorkflowStream(): {
  stream: ReadableStream<string>;
  writer: WritableStreamDefaultWriter<string>;
} {
  const { readable, writable } = new TransformStream<string, string>();
  return { stream: readable, writer: writable.getWriter() };
}
