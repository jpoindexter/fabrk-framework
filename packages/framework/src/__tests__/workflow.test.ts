import { describe, it, expect, vi } from "vitest";
import {
  defineWorkflow,
  agentStep,
  toolStep,
  conditionStep,
  parallelStep,
  runWorkflow,
} from "../agents/workflow/index";

describe("helper factories", () => {
  it("agentStep produces correct shape", () => {
    const run = vi.fn();
    const step = agentStep("s1", run);
    expect(step).toEqual({ type: "agent", id: "s1", run });
  });

  it("toolStep produces correct shape", () => {
    const run = vi.fn();
    const step = toolStep("s2", run);
    expect(step).toEqual({ type: "tool", id: "s2", run });
  });

  it("conditionStep produces correct shape with else", () => {
    const cond = () => true;
    const thenSteps = [agentStep("t", vi.fn())];
    const elseSteps = [toolStep("e", vi.fn())];
    const step = conditionStep("c1", cond, thenSteps, elseSteps);
    expect(step).toMatchObject({ type: "condition", id: "c1", then: thenSteps, else: elseSteps });
  });

  it("parallelStep produces correct shape", () => {
    const steps = [agentStep("a", vi.fn()), toolStep("b", vi.fn())];
    const step = parallelStep("p1", steps);
    expect(step).toEqual({ type: "parallel", id: "p1", steps });
  });
});

describe("runWorkflow — linear", () => {
  it("returns input unchanged for empty workflow", async () => {
    const result = await runWorkflow({ name: "empty", steps: [] }, "hello");
    expect(result.output).toBe("hello");
    expect(result.stepResults).toHaveLength(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("runs steps in order and threads output", async () => {
    const order: string[] = [];
    const wf = defineWorkflow("linear", [
      agentStep("a", async (ctx) => { order.push("a"); return ctx.input + "-a"; }),
      toolStep("b", async (ctx) => { order.push("b"); return ctx.input + "-b"; }),
    ]);
    const result = await wf.run("start");
    expect(order).toEqual(["a", "b"]);
    expect(result.output).toBe("start-a-b");
  });

  it("each step receives previous step output as ctx.input", async () => {
    const seen: string[] = [];
    const wf = defineWorkflow("ctx-chain", [
      agentStep("s1", async (ctx) => { seen.push(ctx.input); return "step1"; }),
      agentStep("s2", async (ctx) => { seen.push(ctx.input); return "step2"; }),
    ]);
    await wf.run("initial");
    expect(seen).toEqual(["initial", "step1"]);
  });

  it("stepResults contain all step ids and outputs", async () => {
    const result = await runWorkflow(
      {
        name: "results",
        steps: [
          agentStep("x", async () => "out-x"),
          toolStep("y", async () => "out-y"),
        ],
      },
      "in"
    );
    expect(result.stepResults).toHaveLength(2);
    expect(result.stepResults[0]).toMatchObject({ stepId: "x", output: "out-x" });
    expect(result.stepResults[1]).toMatchObject({ stepId: "y", output: "out-y" });
  });

  it("durationMs is a non-negative number", async () => {
    const result = await runWorkflow({ name: "dur", steps: [agentStep("a", async () => "x")] }, "in");
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe("conditionStep", () => {
  it("runs then branch when condition is true", async () => {
    const thenFn = vi.fn(async () => "then-output");
    const result = await runWorkflow(
      {
        name: "cond-true",
        steps: [conditionStep("c", () => true, [agentStep("t", thenFn)])],
      },
      "in"
    );
    expect(thenFn).toHaveBeenCalledOnce();
    expect(result.output).toBe("then-output");
  });

  it("runs else branch when condition is false", async () => {
    const elseFn = vi.fn(async () => "else-output");
    const result = await runWorkflow(
      {
        name: "cond-false",
        steps: [conditionStep("c", () => false, [agentStep("t", vi.fn())], [agentStep("e", elseFn)])],
      },
      "in"
    );
    expect(elseFn).toHaveBeenCalledOnce();
    expect(result.output).toBe("else-output");
  });

  it("skips and preserves last output when condition is false and no else", async () => {
    const result = await runWorkflow(
      {
        name: "cond-skip",
        steps: [
          agentStep("pre", async () => "pre-out"),
          conditionStep("c", () => false, [agentStep("t", vi.fn())]),
        ],
      },
      "in"
    );
    expect(result.output).toBe("pre-out");
    const skipped = result.stepResults.find((r) => r.stepId === "c");
    expect(skipped?.skipped).toBe(true);
  });

  it("nested condition steps work", async () => {
    const innerFn = vi.fn(async () => "inner");
    const result = await runWorkflow(
      {
        name: "nested",
        steps: [
          conditionStep(
            "outer",
            () => true,
            [conditionStep("inner", () => true, [agentStep("leaf", innerFn)])]
          ),
        ],
      },
      "in"
    );
    expect(innerFn).toHaveBeenCalledOnce();
    expect(result.output).toBe("inner");
  });
});

describe("parallelStep", () => {
  it("runs all sub-steps and joins outputs with separator", async () => {
    const result = await runWorkflow(
      {
        name: "par",
        steps: [
          parallelStep("p", [
            agentStep("a", async () => "alpha"),
            toolStep("b", async () => "beta"),
          ]),
        ],
      },
      "in"
    );
    expect(result.output).toBe("alpha\n---\nbeta");
  });

  it("invokes all sub-step handlers", async () => {
    const fn1 = vi.fn(async () => "r1");
    const fn2 = vi.fn(async () => "r2");
    await runWorkflow(
      { name: "par-calls", steps: [parallelStep("p", [agentStep("a", fn1), agentStep("b", fn2)])] },
      "in"
    );
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it("one failing branch does not cancel sibling branches", async () => {
    const successFn = vi.fn(async () => "success-output");
    const result = await runWorkflow(
      {
        name: "par-error-isolation",
        steps: [
          parallelStep("p", [
            agentStep("ok", successFn),
            agentStep("fail", async () => { throw new Error("branch failure"); }),
          ]),
        ],
      },
      "in"
    );
    expect(successFn).toHaveBeenCalledOnce();
    expect(result.output).toContain("success-output");
    expect(result.output).toContain("[error: branch failure]");
  });

  it("failing branch output is joined with separator alongside successful branches", async () => {
    const result = await runWorkflow(
      {
        name: "par-error-join",
        steps: [
          parallelStep("p", [
            agentStep("a", async () => "alpha"),
            agentStep("b", async () => { throw new Error("boom"); }),
            agentStep("c", async () => "gamma"),
          ]),
        ],
      },
      "in"
    );
    const parts = result.output.split("\n---\n");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("alpha");
    expect(parts[1]).toBe("[error: boom]");
    expect(parts[2]).toBe("gamma");
  });
});

describe("maxSteps guard", () => {
  it("throws when workflow exceeds maxSteps", async () => {
    const steps = Array.from({ length: 5 }, (_, i) =>
      agentStep(`s${i}`, async () => `out${i}`)
    );
    await expect(
      runWorkflow({ name: "overflow", steps, maxSteps: 3 }, "in")
    ).rejects.toThrow("[fabrk] Workflow exceeded max steps (3)");
  });
});
