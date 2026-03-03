import { describe, it, expect } from "vitest";
import { defineStateGraph } from "../agents/workflow/state-graph";
import type { StateGraphEvent } from "../agents/workflow/state-graph";

async function collectEvents<S>(gen: AsyncGenerator<StateGraphEvent<S>>): Promise<StateGraphEvent<S>[]> {
  const events: StateGraphEvent<S>[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
}

describe("defineStateGraph", () => {
  it("single-node graph reaches END immediately", async () => {
    const graph = defineStateGraph({
      nodes: [
        {
          name: "only",
          run: async (_input, state) => ({ nextNode: "END", state, output: "done" }),
        },
      ],
      edges: [],
      initial: "only",
      initialState: {},
    });

    const events = await collectEvents(graph.run("start"));
    const types = events.map((e) => e.type);

    expect(types).toEqual(["node-enter", "node-exit", "done"]);
    expect(events[2].output).toBe("done");
  });

  it("two-node linear graph visits both nodes in order (A→B→END)", async () => {
    const visited: string[] = [];
    const graph = defineStateGraph<{ count: number }>({
      nodes: [
        {
          name: "A",
          run: async (_input, state) => {
            visited.push("A");
            return { nextNode: "B", state: { count: state.count + 1 }, output: "from-A" };
          },
        },
        {
          name: "B",
          run: async (_input, state) => {
            visited.push("B");
            return { nextNode: "END", state: { count: state.count + 1 }, output: "from-B" };
          },
        },
      ],
      edges: [],
      initial: "A",
      initialState: { count: 0 },
    });

    const events = await collectEvents(graph.run("go"));
    const types = events.map((e) => e.type);

    expect(visited).toEqual(["A", "B"]);
    expect(types).toEqual(["node-enter", "node-exit", "edge", "node-enter", "node-exit", "done"]);

    const edgeEvent = events.find((e) => e.type === "edge");
    expect(edgeEvent?.node).toBe("A");
    expect(edgeEvent?.nextNode).toBe("B");

    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent?.output).toBe("from-B");
  });

  it("cyclic graph loops correctly (A→B→A once, then END)", async () => {
    let loopCount = 0;
    const graph = defineStateGraph<{ loops: number }>({
      nodes: [
        {
          name: "A",
          run: async (_input, state) => {
            loopCount++;
            const next = state.loops >= 1 ? "END" : "B";
            return { nextNode: next, state: { loops: state.loops + 1 }, output: `A-${loopCount}` };
          },
        },
        {
          name: "B",
          run: async (_input, state) => {
            return { nextNode: "A", state, output: "B-pass" };
          },
        },
      ],
      edges: [],
      initial: "A",
      initialState: { loops: 0 },
    });

    const events = await collectEvents(graph.run("start"));
    const nodeEnters = events.filter((e) => e.type === "node-enter").map((e) => e.node);

    // A → B → A → END
    expect(nodeEnters).toEqual(["A", "B", "A"]);
    expect(events[events.length - 1].type).toBe("done");
  });

  it("maxCycles cap prevents infinite loops and yields error event", async () => {
    const graph = defineStateGraph({
      nodes: [
        {
          name: "loop",
          run: async (_input, state) => ({ nextNode: "loop", state, output: null }),
        },
      ],
      edges: [],
      initial: "loop",
      initialState: {},
      maxCycles: 3,
    });

    const events = await collectEvents(graph.run("start"));
    const errorEvent = events.find((e) => e.type === "error");

    expect(errorEvent).toBeDefined();
    expect(errorEvent?.error).toContain("Max cycles (3) exceeded");
  });

  it("conditional edge (function) routes based on output value", async () => {
    const graph = defineStateGraph<{ score: number }>({
      nodes: [
        {
          name: "evaluate",
          run: async (_input, state) => ({
            nextNode: "irrelevant", // edge fn will override
            state,
            output: state.score > 50 ? "pass" : "fail",
          }),
        },
        {
          name: "pass-node",
          run: async (_input, state) => ({ nextNode: "END", state, output: "passed" }),
        },
        {
          name: "fail-node",
          run: async (_input, state) => ({ nextNode: "END", state, output: "failed" }),
        },
      ],
      edges: [
        {
          from: "evaluate",
          to: (output) => (output === "pass" ? "pass-node" : "fail-node"),
        },
      ],
      initial: "evaluate",
      initialState: { score: 80 },
    });

    const events = await collectEvents(graph.run("check"));
    const nodeEnters = events.filter((e) => e.type === "node-enter").map((e) => e.node);

    expect(nodeEnters).toContain("evaluate");
    expect(nodeEnters).toContain("pass-node");
    expect(nodeEnters).not.toContain("fail-node");
  });

  it("conditional edge routes to fail-node when score is low", async () => {
    const graph = defineStateGraph<{ score: number }>({
      nodes: [
        {
          name: "evaluate",
          run: async (_input, state) => ({
            nextNode: "irrelevant",
            state,
            output: state.score > 50 ? "pass" : "fail",
          }),
        },
        {
          name: "pass-node",
          run: async (_input, state) => ({ nextNode: "END", state, output: "passed" }),
        },
        {
          name: "fail-node",
          run: async (_input, state) => ({ nextNode: "END", state, output: "failed" }),
        },
      ],
      edges: [
        {
          from: "evaluate",
          to: (output) => (output === "pass" ? "pass-node" : "fail-node"),
        },
      ],
      initial: "evaluate",
      initialState: { score: 20 },
    });

    const events = await collectEvents(graph.run("check"));
    const nodeEnters = events.filter((e) => e.type === "node-enter").map((e) => e.node);

    expect(nodeEnters).toContain("fail-node");
    expect(nodeEnters).not.toContain("pass-node");
  });

  it("state is threaded through all nodes", async () => {
    const graph = defineStateGraph<{ accumulator: number }>({
      nodes: [
        {
          name: "add-one",
          run: async (_input, state) => ({
            nextNode: "add-ten",
            state: { accumulator: state.accumulator + 1 },
            output: null,
          }),
        },
        {
          name: "add-ten",
          run: async (_input, state) => ({
            nextNode: "END",
            state: { accumulator: state.accumulator + 10 },
            output: state.accumulator + 10,
          }),
        },
      ],
      edges: [],
      initial: "add-one",
      initialState: { accumulator: 0 },
    });

    const events = await collectEvents(graph.run(null));
    const doneEvent = events.find((e) => e.type === "done");

    expect(doneEvent?.state).toEqual({ accumulator: 11 });
    expect(doneEvent?.output).toBe(11);
  });

  it("node-enter event fired before each node execution", async () => {
    const executionOrder: string[] = [];
    const graph = defineStateGraph({
      nodes: [
        {
          name: "A",
          run: async (_input, state) => {
            executionOrder.push("run-A");
            return { nextNode: "END", state, output: null };
          },
        },
      ],
      edges: [],
      initial: "A",
      initialState: {},
    });

    const events: Array<StateGraphEvent<{}>> = [];
    for await (const event of graph.run("x")) {
      if (event.type === "node-enter") {
        // Record that we saw the enter before the run
        executionOrder.push(`enter-${event.node}`);
      }
      events.push(event);
    }

    // enter must appear before run in the execution log
    expect(executionOrder.indexOf("enter-A")).toBeLessThan(executionOrder.indexOf("run-A"));
  });

  it("node-exit event fired after each node execution with output", async () => {
    const graph = defineStateGraph({
      nodes: [
        {
          name: "produce",
          run: async (_input, state) => ({
            nextNode: "END",
            state,
            output: { value: 42 },
          }),
        },
      ],
      edges: [],
      initial: "produce",
      initialState: {},
    });

    const events = await collectEvents(graph.run(null));
    const exitEvent = events.find((e) => e.type === "node-exit");

    expect(exitEvent).toBeDefined();
    expect(exitEvent?.node).toBe("produce");
    expect(exitEvent?.output).toEqual({ value: 42 });
  });

  it("edge event fired for each transition between nodes (not to END)", async () => {
    const graph = defineStateGraph({
      nodes: [
        {
          name: "A",
          run: async (_input, state) => ({ nextNode: "B", state, output: null }),
        },
        {
          name: "B",
          run: async (_input, state) => ({ nextNode: "END", state, output: null }),
        },
      ],
      edges: [],
      initial: "A",
      initialState: {},
    });

    const events = await collectEvents(graph.run("go"));
    const edgeEvents = events.filter((e) => e.type === "edge");

    // Only one edge transition (A→B), not the terminal B→END
    expect(edgeEvents).toHaveLength(1);
    expect(edgeEvents[0].node).toBe("A");
    expect(edgeEvents[0].nextNode).toBe("B");
  });

  it("done event contains final state and output", async () => {
    const graph = defineStateGraph<{ result: string }>({
      nodes: [
        {
          name: "finalize",
          run: async (_input, _state) => ({
            nextNode: "END",
            state: { result: "finished" },
            output: "final-output",
          }),
        },
      ],
      edges: [],
      initial: "finalize",
      initialState: { result: "" },
    });

    const events = await collectEvents(graph.run(null));
    const doneEvent = events.find((e) => e.type === "done");

    expect(doneEvent).toBeDefined();
    expect(doneEvent?.state).toEqual({ result: "finished" });
    expect(doneEvent?.output).toBe("final-output");
  });

  it("cycles counter increments correctly across node visits", async () => {
    const graph = defineStateGraph<{ n: number }>({
      nodes: [
        {
          name: "A",
          run: async (_input, state) => ({
            nextNode: state.n < 2 ? "A" : "END",
            state: { n: state.n + 1 },
            output: null,
          }),
        },
      ],
      edges: [],
      initial: "A",
      initialState: { n: 0 },
    });

    const events = await collectEvents(graph.run(null));
    const enterEvents = events.filter((e) => e.type === "node-enter");

    // cycles should increment: 0, 1, 2
    expect(enterEvents.map((e) => e.cycles)).toEqual([0, 1, 2]);
  });
});
