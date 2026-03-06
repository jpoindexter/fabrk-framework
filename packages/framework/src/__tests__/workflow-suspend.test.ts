import { describe, it, expect } from "vitest";
import { defineWorkflow, agentStep, suspendableStep } from "../agents/workflow/define-workflow";
import { resumeWorkflow } from "../agents/workflow/runner";

describe("workflow suspend/resume", () => {
  it("suspendable step can suspend with data", async () => {
    const wf = defineWorkflow("test", [
      suspendableStep("approval", async (_ctx, { suspend }) => {
        suspend({ needsApproval: true, amount: 100 });
      }),
    ]);
    const result = await wf.run("process payment");
    expect(result.status).toBe("suspended");
    if (result.status === "suspended") {
      expect(result.suspendedAtStepId).toBe("approval");
       
      expect((result.suspendData as any).amount).toBe(100);
      expect(result.completedSteps).toHaveLength(0);
    }
  });

  it("workflow resumes from suspended state and continues", async () => {
    const wf = defineWorkflow("test", [
      agentStep("first", async () => "step1 done"),
      suspendableStep("approval", async (ctx, { suspend }) => {
        if (!ctx.metadata?.resumeData) {
          suspend({ waiting: true });
        }
        return `approved with: ${JSON.stringify(ctx.metadata?.resumeData)}`;
      }),
      agentStep("last", async (ctx) => `final: ${ctx.history.find(h => h.stepId === "approval")?.output}`),
    ]);

    // First run — suspends at approval
    const suspended = await wf.run("start");
    expect(suspended.status).toBe("suspended");
    if (suspended.status !== "suspended") throw new Error("expected suspended");

    // Resume with approval data
    const resumed = await resumeWorkflow(wf, suspended, { approved: true, by: "admin" });
    expect(resumed.status).toBe("completed");
    if (resumed.status === "completed") {
      expect(resumed.output).toContain("final:");
      expect(resumed.stepResults.find(s => s.stepId === "first")?.output).toBe("step1 done");
    }
  });

  it("resumed workflow passes resumeData in context metadata", async () => {
    let capturedResumeData: unknown;
    const wf = defineWorkflow("test", [
      suspendableStep("check", async (ctx, { suspend }) => {
        if (!ctx.metadata?.resumeData) suspend({ paused: true });
        capturedResumeData = ctx.metadata?.resumeData;
        return "continued";
      }),
    ]);
    const suspended = await wf.run("go");
    expect(suspended.status).toBe("suspended");
    if (suspended.status !== "suspended") return;
    await resumeWorkflow(wf, suspended, { token: "abc123" });
     
    expect((capturedResumeData as any).token).toBe("abc123");
  });

  it("non-suspendable steps still work normally after adding union type", async () => {
    const wf = defineWorkflow("test", [
      agentStep("a", async () => "result-a"),
      agentStep("b", async (ctx) => `result-b after ${ctx.history[0]?.output}`),
    ]);
    const result = await wf.run("input");
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.output).toBe("result-b after result-a");
    }
  });

  it("completedSteps reflects all steps run before suspension", async () => {
    const wf = defineWorkflow("test", [
      agentStep("step1", async () => "out1"),
      agentStep("step2", async () => "out2"),
      suspendableStep("gate", async (_ctx, { suspend }) => {
        suspend({ reason: "awaiting-review" });
      }),
      agentStep("step4", async () => "out4"),
    ]);
    const result = await wf.run("go");
    expect(result.status).toBe("suspended");
    if (result.status === "suspended") {
      expect(result.suspendedAtStepId).toBe("gate");
      expect(result.completedSteps).toHaveLength(2);
      expect(result.completedSteps[0]).toMatchObject({ stepId: "step1", output: "out1" });
      expect(result.completedSteps[1]).toMatchObject({ stepId: "step2", output: "out2" });
    }
  });

  it("steps after suspension are skipped during resume and then run", async () => {
    const calls: string[] = [];
    const wf = defineWorkflow("test", [
      agentStep("pre", async () => { calls.push("pre"); return "pre-out"; }),
      suspendableStep("gate", async (ctx, { suspend }) => {
        if (!ctx.metadata?.resumeData) {
          calls.push("gate-suspend");
          suspend({ waiting: true });
        }
        calls.push("gate-resume");
        return "gate-out";
      }),
      agentStep("post", async () => { calls.push("post"); return "post-out"; }),
    ]);

    const suspended = await wf.run("start");
    expect(suspended.status).toBe("suspended");
    if (suspended.status !== "suspended") return;

    calls.length = 0;
    const resumed = await resumeWorkflow(wf, suspended, { ok: true });
    expect(resumed.status).toBe("completed");
    // pre is skipped (already completed), gate and post run
    expect(calls).toEqual(["gate-resume", "post"]);
    if (resumed.status === "completed") {
      expect(resumed.output).toBe("post-out");
    }
  });

  it("suspendData is correctly stored on the result", async () => {
    const wf = defineWorkflow("test", [
      suspendableStep("approval", async (_ctx, { suspend }) => {
        suspend({ requestId: "req-42", amount: 999, currency: "USD" });
      }),
    ]);
    const result = await wf.run("pay");
    expect(result.status).toBe("suspended");
    if (result.status === "suspended") {
      const data = result.suspendData as Record<string, unknown>;
      expect(data.requestId).toBe("req-42");
      expect(data.amount).toBe(999);
      expect(data.currency).toBe("USD");
    }
  });

  it("durationMs is present and non-negative on suspended result", async () => {
    const wf = defineWorkflow("test", [
      suspendableStep("s", async (_ctx, { suspend }) => {
        suspend({});
      }),
    ]);
    const result = await wf.run("go");
    expect(result.status).toBe("suspended");
    if (result.status === "suspended") {
      expect(typeof result.durationMs).toBe("number");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});
