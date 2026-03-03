import { describe, it, expect, vi } from "vitest";
import { defineAgentNetwork } from "../agents/network";
import type { NetworkContext } from "../agents/network";

function mockAgent(name: string) {
  return {
    execute: vi.fn(async (input: string) => `${name}: processed "${input}"`),
  };
}

describe("defineAgentNetwork", () => {
  it("router returning END immediately stops loop (hops=0, output=input)", async () => {
    const network = defineAgentNetwork({
      agents: { alpha: mockAgent("alpha") },
      router: async () => "END",
    });

    const result = await network.run("hello");
    expect(result.hops).toBe(0);
    expect(result.output).toBe("hello");
    expect(result.history).toHaveLength(0);
  });

  it("single-hop routing reaches correct agent and returns its output", async () => {
    const alpha = mockAgent("alpha");
    let calls = 0;
    const network = defineAgentNetwork({
      agents: { alpha },
      router: async () => {
        // Route to alpha on first call, then END
        if (calls++ === 0) return "alpha";
        return "END";
      },
    });

    const result = await network.run("initial input");
    expect(result.hops).toBe(1);
    expect(result.output).toBe('alpha: processed "initial input"');
    expect(result.history).toHaveLength(1);
    expect(result.history[0].agent).toBe("alpha");
    expect(result.history[0].input).toBe("initial input");
    expect(result.history[0].output).toBe('alpha: processed "initial input"');
  });

  it("multi-hop routing passes output as next input", async () => {
    const alpha = mockAgent("alpha");
    const beta = mockAgent("beta");
    const agents = ["alpha", "beta", "END"];
    let idx = 0;

    const network = defineAgentNetwork({
      agents: { alpha, beta },
      router: async () => agents[idx++],
    });

    const result = await network.run("start");
    expect(result.hops).toBe(2);
    expect(result.history[0].agent).toBe("alpha");
    expect(result.history[0].input).toBe("start");
    expect(result.history[1].agent).toBe("beta");
    // beta receives alpha's output as input
    expect(result.history[1].input).toBe('alpha: processed "start"');
    expect(result.output).toBe('beta: processed "alpha: processed "start""');
  });

  it("maxHops cap prevents infinite loops", async () => {
    const alpha = mockAgent("alpha");
    const network = defineAgentNetwork({
      agents: { alpha },
      router: async () => "alpha", // always route to alpha, never END
      maxHops: 3,
    });

    const result = await network.run("loop");
    expect(result.hops).toBe(3);
    expect(result.history).toHaveLength(3);
  });

  it("history contains all agent outputs in order", async () => {
    const alpha = mockAgent("alpha");
    const beta = mockAgent("beta");
    const gamma = mockAgent("gamma");
    const sequence = ["alpha", "beta", "gamma", "END"];
    let idx = 0;

    const network = defineAgentNetwork({
      agents: { alpha, beta, gamma },
      router: async () => sequence[idx++],
    });

    const result = await network.run("start");
    expect(result.history).toHaveLength(3);
    expect(result.history[0].agent).toBe("alpha");
    expect(result.history[1].agent).toBe("beta");
    expect(result.history[2].agent).toBe("gamma");
  });

  it("NetworkContext.previousAgent tracks last agent name", async () => {
    const alpha = mockAgent("alpha");
    const beta = mockAgent("beta");
    const previousAgents: Array<string | undefined> = [];
    const sequence = ["alpha", "beta", "END"];
    let idx = 0;

    const network = defineAgentNetwork({
      agents: { alpha, beta },
      router: async (_input, context) => {
        previousAgents.push(context.previousAgent);
        return sequence[idx++];
      },
    });

    await network.run("start");
    expect(previousAgents[0]).toBeUndefined(); // first call — no previous agent
    expect(previousAgents[1]).toBe("alpha");   // after alpha runs
    expect(previousAgents[2]).toBe("beta");    // after beta runs (END check)
  });

  it("NetworkContext.iteration increments per hop", async () => {
    const alpha = mockAgent("alpha");
    const iterations: number[] = [];
    const sequence = ["alpha", "alpha", "END"];
    let idx = 0;

    const network = defineAgentNetwork({
      agents: { alpha },
      router: async (_input, context) => {
        iterations.push(context.iteration);
        return sequence[idx++];
      },
    });

    await network.run("start");
    expect(iterations[0]).toBe(0);
    expect(iterations[1]).toBe(1);
    expect(iterations[2]).toBe(2);
  });

  it("router receives updated context on each call", async () => {
    const alpha = mockAgent("alpha");
    const capturedContexts: NetworkContext[] = [];
    const sequence = ["alpha", "alpha", "END"];
    let idx = 0;

    const network = defineAgentNetwork({
      agents: { alpha },
      router: async (_input, context) => {
        capturedContexts.push({ ...context, history: [...context.history] });
        return sequence[idx++];
      },
    });

    await network.run("start");
    // First router call: empty history, iteration 0
    expect(capturedContexts[0].history).toHaveLength(0);
    expect(capturedContexts[0].iteration).toBe(0);
    // Second router call: one entry in history
    expect(capturedContexts[1].history).toHaveLength(1);
    expect(capturedContexts[1].iteration).toBe(1);
    // Third router call (END decision): two entries in history
    expect(capturedContexts[2].history).toHaveLength(2);
    expect(capturedContexts[2].iteration).toBe(2);
  });

  it("throws when router names an agent not in the network", async () => {
    const network = defineAgentNetwork({
      agents: {},
      router: async () => "nonexistent",
    });

    await expect(network.run("hello")).rejects.toThrow('Agent "nonexistent" not found in network');
  });

  it("default maxHops is 10", async () => {
    const alpha = mockAgent("alpha");
    const network = defineAgentNetwork({
      agents: { alpha },
      router: async () => "alpha",
      // no maxHops specified
    });

    const result = await network.run("start");
    expect(result.hops).toBe(10);
  });
});
