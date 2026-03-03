export interface WorkflowContext {
  input: string;
  history: Array<{ stepId: string; output: string }>;
  metadata?: Record<string, unknown>;
}

export interface StepResult {
  stepId: string;
  output: string;
  skipped?: boolean;
}

export type StepHandler = (ctx: WorkflowContext) => Promise<string>;

export interface AgentStep {
  type: "agent";
  id: string;
  run: StepHandler;
}

export interface ToolStep {
  type: "tool";
  id: string;
  run: StepHandler;
}

export interface ConditionStep {
  type: "condition";
  id: string;
  condition: (ctx: WorkflowContext) => boolean;
  then: WorkflowStep[];
  else?: WorkflowStep[];
}

export interface ParallelStep {
  type: "parallel";
  id: string;
  steps: WorkflowStep[];
}

export type WorkflowStep = AgentStep | ToolStep | ConditionStep | ParallelStep;

export interface WorkflowDefinition {
  name: string;
  steps: WorkflowStep[];
  maxSteps?: number;
}

export interface WorkflowResult {
  output: string;
  stepResults: StepResult[];
  durationMs: number;
}
