import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowResult,
  WorkflowContext,
  SuspendableAgentStep,
  SuspendableStepContext,
} from "./types";
import { runWorkflow } from "./runner";

export function defineWorkflow(
  name: string,
  steps: WorkflowStep[],
  opts?: { maxSteps?: number }
): WorkflowDefinition & { run: (input: string, metadata?: Record<string, unknown>) => Promise<WorkflowResult> } {
  const def: WorkflowDefinition = { name, steps, maxSteps: opts?.maxSteps };
  return {
    ...def,
    run: (input, metadata) => runWorkflow(def, input, metadata),
  };
}

export function agentStep(id: string, run: (ctx: WorkflowContext) => Promise<string>): WorkflowStep {
  return { type: "agent", id, run };
}

export function toolStep(id: string, run: (ctx: WorkflowContext) => Promise<string>): WorkflowStep {
  return { type: "tool", id, run };
}

export function conditionStep(
  id: string,
  condition: (ctx: WorkflowContext) => boolean,
  then: WorkflowStep[],
  elseSteps?: WorkflowStep[]
): WorkflowStep {
  return { type: "condition", id, condition, then, else: elseSteps };
}

export function parallelStep(id: string, steps: WorkflowStep[]): WorkflowStep {
  return { type: "parallel", id, steps };
}

export function suspendableStep(
  id: string,
  run: (ctx: WorkflowContext, control: SuspendableStepContext) => Promise<string | void>,
  opts?: { suspendSchema?: Record<string, unknown>; resumeSchema?: Record<string, unknown> }
): SuspendableAgentStep {
  return { type: "suspendable-agent", id, run, ...opts };
}
