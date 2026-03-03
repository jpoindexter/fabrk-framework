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

export interface SuspendableStepContext {
  suspend: (data: unknown) => never;
}

export interface SuspendableAgentStep {
  type: "suspendable-agent";
  id: string;
  suspendSchema?: Record<string, unknown>;
  resumeSchema?: Record<string, unknown>;
  run: (ctx: WorkflowContext, control: SuspendableStepContext) => Promise<string | void>;
}

export interface SuspendableToolStep {
  type: "suspendable-tool";
  id: string;
  suspendSchema?: Record<string, unknown>;
  resumeSchema?: Record<string, unknown>;
  run: (ctx: WorkflowContext, control: SuspendableStepContext) => Promise<string | void>;
}

export type WorkflowStep =
  | AgentStep
  | ToolStep
  | ConditionStep
  | ParallelStep
  | SuspendableAgentStep
  | SuspendableToolStep;

export interface WorkflowDefinition {
  name: string;
  steps: WorkflowStep[];
  maxSteps?: number;
}

export interface WorkflowSuspendedResult {
  status: "suspended";
  suspendedAtStepId: string;
  suspendData: unknown;
  completedSteps: StepResult[];
  durationMs: number;
}

export type WorkflowResult =
  | { status: "completed"; output: string; stepResults: StepResult[]; durationMs: number }
  | WorkflowSuspendedResult;

export interface WorkflowProgressEvent {
  type: 'step-start' | 'step-complete' | 'step-error' | 'parallel-start' | 'parallel-complete';
  stepName: string;
  output?: unknown;
  error?: string;
  durationMs?: number;
}
