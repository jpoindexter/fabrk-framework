import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
  StepResult,
} from "./types";

const MAX_STEPS_HARD_CAP = 50;

async function runSteps(
  steps: WorkflowStep[],
  ctx: WorkflowContext,
  results: StepResult[],
  stepCount: { n: number },
  maxSteps: number
): Promise<string> {
  let lastOutput = ctx.input;

  for (const step of steps) {
    if (stepCount.n >= maxSteps) {
      throw new Error(`[fabrk] Workflow exceeded max steps (${maxSteps})`);
    }
    stepCount.n++;

    if (step.type === "agent" || step.type === "tool") {
      const output = await step.run(ctx);
      ctx.history.push({ stepId: step.id, output });
      ctx.input = output;
      lastOutput = output;
      results.push({ stepId: step.id, output });
    } else if (step.type === "condition") {
      const branch = step.condition(ctx) ? step.then : (step.else ?? []);
      if (branch.length === 0) {
        results.push({ stepId: step.id, output: lastOutput, skipped: true });
      } else {
        lastOutput = await runSteps(branch, ctx, results, stepCount, maxSteps);
      }
    } else if (step.type === "parallel") {
      const subResults = await Promise.all(
        step.steps.map(async (sub) => {
          const subCtx: WorkflowContext = {
            input: ctx.input,
            history: [...ctx.history],
            metadata: ctx.metadata,
          };
          const subStepResults: StepResult[] = [];
          const subCount = { n: stepCount.n };
          const out = await runSteps([sub], subCtx, subStepResults, subCount, maxSteps);
          return { out, subStepResults };
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
    }
  }

  return lastOutput;
}

export async function runWorkflow(
  def: WorkflowDefinition,
  input: string,
  metadata?: Record<string, unknown>
): Promise<WorkflowResult> {
  const maxSteps = Math.min(def.maxSteps ?? MAX_STEPS_HARD_CAP, MAX_STEPS_HARD_CAP);
  const ctx: WorkflowContext = { input, history: [], metadata };
  const results: StepResult[] = [];
  const stepCount = { n: 0 };
  const start = Date.now();

  const output = await runSteps(def.steps, ctx, results, stepCount, maxSteps);

  return { output, stepResults: results, durationMs: Date.now() - start };
}
