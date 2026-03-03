import { describe, it, expect, vi } from "vitest";
import { runWorkflow, resumeWorkflow } from "../agents/workflow/runner";
import { agentStep, toolStep, parallelStep, suspendableStep } from "../agents/workflow/define-workflow";
import type { WorkflowProgressEvent } from "../agents/workflow/types";

function getProgressEvents(mockFn: ReturnType<typeof vi.fn>): WorkflowProgressEvent[] {
  return mockFn.mock.calls.map((args) => args[0] as WorkflowProgressEvent);
}

describe("workflow progress events", () => {
  it("onProgress called with step-start before each step runs", async () => {
    const order: string[] = [];
    const onProgress = vi.fn((evt: WorkflowProgressEvent) => {
      if (evt.type === "step-start") order.push(`progress:${evt.stepName}`);
    });

    const steps = [
      agentStep("s1", async () => {
        order.push("run:s1");
        return "out1";
      }),
      agentStep("s2", async () => {
        order.push("run:s2");
        return "out2";
      }),
    ];

    await runWorkflow({ name: "test", steps }, "input", undefined, { onProgress });

    // step-start for s1 must appear before run:s1
    expect(order.indexOf("progress:s1")).toBeLessThan(order.indexOf("run:s1"));
    // step-start for s2 must appear before run:s2
    expect(order.indexOf("progress:s2")).toBeLessThan(order.indexOf("run:s2"));
  });

  it("onProgress called with step-complete after each step with output", async () => {
    const onProgress = vi.fn();

    const steps = [
      agentStep("alpha", async () => "result-alpha"),
      agentStep("beta", async () => "result-beta"),
    ];

    await runWorkflow({ name: "test", steps }, "go", undefined, { onProgress });

    const completes = getProgressEvents(onProgress).filter((e) => e.type === "step-complete");

    expect(completes).toHaveLength(2);
    expect(completes[0].stepName).toBe("alpha");
    expect(completes[0].output).toBe("result-alpha");
    expect(completes[1].stepName).toBe("beta");
    expect(completes[1].output).toBe("result-beta");
  });

  it("onProgress called with step-error when step throws", async () => {
    const onProgress = vi.fn();

    const steps = [
      agentStep("failing-step", async () => {
        throw new Error("step blew up");
      }),
    ];

    await expect(
      runWorkflow({ name: "test", steps }, "go", undefined, { onProgress })
    ).rejects.toThrow("step blew up");

    const errors = getProgressEvents(onProgress).filter((e) => e.type === "step-error");

    expect(errors).toHaveLength(1);
    expect(errors[0].stepName).toBe("failing-step");
    expect(errors[0].error).toContain("step blew up");
  });

  it("no progress calls when onProgress not provided (backward compat)", async () => {
    // Verify existing 3-arg signature still works without opts
    const steps = [
      agentStep("x", async () => "out"),
    ];

    const result = await runWorkflow({ name: "test", steps }, "in");
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.output).toBe("out");
    }
  });

  it("durationMs is a non-negative number for completed steps", async () => {
    const onProgress = vi.fn();

    const steps = [
      agentStep("timed", async () => "timed-output"),
    ];

    await runWorkflow({ name: "test", steps }, "start", undefined, { onProgress });

    const completes = getProgressEvents(onProgress).filter((e) => e.type === "step-complete");

    expect(completes).toHaveLength(1);
    expect(typeof completes[0].durationMs).toBe("number");
    expect(completes[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("durationMs is a non-negative number for errored steps", async () => {
    const onProgress = vi.fn();

    const steps = [
      agentStep("errored", async () => {
        throw new Error("boom");
      }),
    ];

    await expect(
      runWorkflow({ name: "test", steps }, "start", undefined, { onProgress })
    ).rejects.toThrow();

    const errors = getProgressEvents(onProgress).filter((e) => e.type === "step-error");

    expect(errors).toHaveLength(1);
    expect(typeof errors[0].durationMs).toBe("number");
    expect(errors[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("parallel-start and parallel-complete events fired around parallel step", async () => {
    const onProgress = vi.fn();

    const steps = [
      parallelStep("par", [
        agentStep("p1", async () => "r1"),
        agentStep("p2", async () => "r2"),
      ]),
    ];

    await runWorkflow({ name: "test", steps }, "go", undefined, { onProgress });

    const events = getProgressEvents(onProgress);
    const types = events.map((e) => e.type);

    expect(types).toContain("parallel-start");
    expect(types).toContain("parallel-complete");

    const parallelStart = events.findIndex((e) => e.type === "parallel-start");
    const parallelComplete = events.findIndex((e) => e.type === "parallel-complete");
    expect(parallelStart).toBeLessThan(parallelComplete);
  });

  it("parallel step events include the step id as stepName", async () => {
    const onProgress = vi.fn();

    const steps = [
      parallelStep("my-parallel", [
        agentStep("sub1", async () => "r1"),
      ]),
    ];

    await runWorkflow({ name: "test", steps }, "go", undefined, { onProgress });

    const events = getProgressEvents(onProgress);
    const parallelStartEvt = events.find((e) => e.type === "parallel-start");
    const parallelCompleteEvt = events.find((e) => e.type === "parallel-complete");

    expect(parallelStartEvt?.stepName).toBe("my-parallel");
    expect(parallelCompleteEvt?.stepName).toBe("my-parallel");
  });

  it("resumeWorkflow also emits progress events for resumed steps", async () => {
    const onProgress = vi.fn();

    // step-b suspends on first call, completes on resume (resumeData present in ctx.metadata)
    const steps = [
      agentStep("step-a", async () => "out-a"),
      suspendableStep("step-b", async (ctx, control) => {
        if (!ctx.metadata?.resumeData) {
          control.suspend({ waiting: true });
        }
        return "out-b-resumed";
      }),
      agentStep("step-c", async () => "out-c"),
    ];

    const def = { name: "resumable", steps };
    const suspendResult = await runWorkflow(def, "go");
    expect(suspendResult.status).toBe("suspended");

    if (suspendResult.status !== "suspended") return;

    // Resume: step-b completes this time, then step-c runs
    await resumeWorkflow(def, suspendResult, { ok: true }, { onProgress });

    const events = getProgressEvents(onProgress);
    const starts = events.filter((e) => e.type === "step-start").map((e) => e.stepName);
    const completes = events.filter((e) => e.type === "step-complete").map((e) => e.stepName);

    expect(starts).toContain("step-b");
    expect(starts).toContain("step-c");
    expect(completes).toContain("step-b");
    expect(completes).toContain("step-c");
    // step-a was already completed, should NOT be re-run
    expect(starts).not.toContain("step-a");
  });

  it("step-start called with correct stepName from toolStep", async () => {
    const onProgress = vi.fn();

    const steps = [
      toolStep("my-tool", async () => "tool-result"),
    ];

    await runWorkflow({ name: "test", steps }, "in", undefined, { onProgress });

    const starts = getProgressEvents(onProgress).filter((e) => e.type === "step-start");

    expect(starts).toHaveLength(1);
    expect(starts[0].stepName).toBe("my-tool");
  });

  it("events emitted in correct order: start → complete", async () => {
    const emitted: string[] = [];
    const onProgress = (evt: WorkflowProgressEvent) => {
      emitted.push(`${evt.type}:${evt.stepName}`);
    };

    const steps = [
      agentStep("first", async () => "f"),
      agentStep("second", async () => "s"),
    ];

    await runWorkflow({ name: "test", steps }, "x", undefined, { onProgress });

    expect(emitted).toEqual([
      "step-start:first",
      "step-complete:first",
      "step-start:second",
      "step-complete:second",
    ]);
  });
});
