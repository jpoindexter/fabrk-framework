import { describe, it, expect, vi } from "vitest";
import { createToolExecutor, type ToolExecutorHooks } from "../agents/tool-executor";
import type { ToolDefinition } from "../tools/define-tool";

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: "test-tool",
    description: "A test tool",
    schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    handler: async (input) => ({
      content: [{ type: "text", text: `Result for: ${input.query}` }],
    }),
    ...overrides,
  };
}

describe("Tool Lifecycle Hooks", () => {
  it("calls onBefore before tool execution", async () => {
    const order: string[] = [];
    const hooks: ToolExecutorHooks = {
      onBefore: () => { order.push("before"); },
    };
    const tool = makeTool({
      handler: async (input) => {
        order.push("execute");
        return { content: [{ type: "text", text: `${input.query}` }] };
      },
    });
    const executor = createToolExecutor([tool], hooks);
    await executor.execute("test-tool", { query: "hello" });
    expect(order).toEqual(["before", "execute"]);
  });

  it("calls onAfter after successful execution with duration", async () => {
    const afterSpy = vi.fn();
    const hooks: ToolExecutorHooks = {
      onAfter: afterSpy,
    };
    const executor = createToolExecutor([makeTool()], hooks);
    await executor.execute("test-tool", { query: "hello" });
    expect(afterSpy).toHaveBeenCalledOnce();
    expect(afterSpy.mock.calls[0][0]).toBe("test-tool");
    expect(afterSpy.mock.calls[0][1]).toEqual({ query: "hello" });
    expect(typeof afterSpy.mock.calls[0][2]).toBe("string"); // output
    expect(typeof afterSpy.mock.calls[0][3]).toBe("number"); // durationMs
    expect(afterSpy.mock.calls[0][3]).toBeGreaterThanOrEqual(0);
  });

  it("calls onTimeout when tool times out", async () => {
    const timeoutSpy = vi.fn();
    const hooks: ToolExecutorHooks = {
      onTimeout: timeoutSpy,
    };
    const slowTool = makeTool({
      handler: () => new Promise((resolve) =>
        setTimeout(() => resolve({ content: [{ type: "text", text: "done" }] }), 60_000)
      ),
    });
    const executor = createToolExecutor([slowTool], hooks);
    await expect(executor.execute("test-tool", { query: "slow" })).rejects.toThrow("timed out");
    expect(timeoutSpy).toHaveBeenCalledOnce();
    expect(timeoutSpy.mock.calls[0][0]).toBe("test-tool");
    expect(timeoutSpy.mock.calls[0][2]).toBe(30_000);
  }, 35_000);

  it("calls onError when tool throws", async () => {
    const errorSpy = vi.fn();
    const hooks: ToolExecutorHooks = {
      onError: errorSpy,
    };
    const failingTool = makeTool({
      handler: async () => { throw new Error("Tool broke"); },
    });
    const executor = createToolExecutor([failingTool], hooks);
    await expect(executor.execute("test-tool", { query: "fail" })).rejects.toThrow("Tool broke");
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0][0]).toBe("test-tool");
    expect(errorSpy.mock.calls[0][2]).toBeInstanceOf(Error);
  });

  it("hooks never break tool execution when they throw", async () => {
    const hooks: ToolExecutorHooks = {
      onBefore: () => { throw new Error("Hook failed"); },
      onAfter: () => { throw new Error("Hook failed"); },
    };
    const executor = createToolExecutor([makeTool()], hooks);
    const { output } = await executor.execute("test-tool", { query: "hello" });
    expect(output).toBe("Result for: hello");
  });

  it("per-tool hooks override executor-level hooks", async () => {
    const executorBefore = vi.fn();
    const toolBefore = vi.fn();

    const executorHooks: ToolExecutorHooks = {
      onBefore: executorBefore,
    };
    const tool = makeTool({
      hooks: { onBefore: toolBefore },
    });
    const executor = createToolExecutor([tool], executorHooks);
    await executor.execute("test-tool", { query: "hello" });

    expect(toolBefore).toHaveBeenCalledOnce();
    expect(executorBefore).not.toHaveBeenCalled();
  });

  it("executor hooks are used when tool has no hooks", async () => {
    const executorAfter = vi.fn();
    const hooks: ToolExecutorHooks = {
      onAfter: executorAfter,
    };
    const executor = createToolExecutor([makeTool()], hooks);
    await executor.execute("test-tool", { query: "hello" });
    expect(executorAfter).toHaveBeenCalledOnce();
  });

  it("async hooks are awaited", async () => {
    const order: string[] = [];
    const hooks: ToolExecutorHooks = {
      onBefore: async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push("async-before");
      },
    };
    const tool = makeTool({
      handler: async (input) => {
        order.push("execute");
        return { content: [{ type: "text", text: `${input.query}` }] };
      },
    });
    const executor = createToolExecutor([tool], hooks);
    await executor.execute("test-tool", { query: "hello" });
    expect(order).toEqual(["async-before", "execute"]);
  });

  it("works with no hooks provided", async () => {
    const executor = createToolExecutor([makeTool()]);
    const { output } = await executor.execute("test-tool", { query: "hello" });
    expect(output).toBe("Result for: hello");
  });

  it("onBefore and onAfter both fire on successful execution", async () => {
    const beforeSpy = vi.fn();
    const afterSpy = vi.fn();
    const hooks: ToolExecutorHooks = {
      onBefore: beforeSpy,
      onAfter: afterSpy,
    };
    const executor = createToolExecutor([makeTool()], hooks);
    await executor.execute("test-tool", { query: "hello" });
    expect(beforeSpy).toHaveBeenCalledOnce();
    expect(afterSpy).toHaveBeenCalledOnce();
  });

  it("onAfter is not called on error", async () => {
    const afterSpy = vi.fn();
    const errorSpy = vi.fn();
    const hooks: ToolExecutorHooks = {
      onAfter: afterSpy,
      onError: errorSpy,
    };
    const failingTool = makeTool({
      handler: async () => { throw new Error("fail"); },
    });
    const executor = createToolExecutor([failingTool], hooks);
    await expect(executor.execute("test-tool", { query: "fail" })).rejects.toThrow();
    expect(afterSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});
