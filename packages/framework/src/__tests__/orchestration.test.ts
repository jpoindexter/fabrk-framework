import { describe, it, expect } from "vitest";
import { agentAsTool, detectCircularDeps, checkDelegationDepth } from "../agents/orchestration/agent-tool";
import { defineSupervisor } from "../agents/orchestration/supervisor";

describe("Agent Orchestration", () => {
  describe("agentAsTool", () => {
    it("wraps an agent as a tool definition", () => {
      const tool = agentAsTool(
        { name: "search-agent", description: "Searches the web" },
        async () => async () => new Response("unused")
      );

      expect(tool.name).toBe("search-agent");
      expect(tool.description).toBe("Searches the web");
      expect(tool.schema.type).toBe("object");
      expect(typeof tool.handler).toBe("function");
    });

    it("calls the agent handler and returns tool result", async () => {
      const tool = agentAsTool(
        { name: "echo-agent", description: "Echoes messages" },
        async () => async (req: Request) => {
          const body = await req.json();
          const msg = body.messages?.[0]?.content ?? "";
          return new Response(JSON.stringify({ content: `Echo: ${msg}` }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      );

      const result = await tool.handler({ message: "hello" });
      expect((result.content[0] as { text: string }).text).toBe("Echo: hello");
    });

    it("handles agent errors gracefully", async () => {
      const tool = agentAsTool(
        { name: "fail-agent", description: "Always fails" },
        async () => async () =>
          new Response(JSON.stringify({ error: "Agent down" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
      );

      const result = await tool.handler({ message: "hi" });
      expect((result.content[0] as { text: string }).text).toContain("Error:");
    });
  });

  describe("detectCircularDeps", () => {
    it("detects direct circular dependency", () => {
      const errors = detectCircularDeps([
        { name: "a", agents: [{ name: "b" }] },
        { name: "b", agents: [{ name: "a" }] },
      ]);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("Circular"))).toBe(true);
    });

    it("returns empty for acyclic graph", () => {
      const errors = detectCircularDeps([
        { name: "a", agents: [{ name: "b" }] },
        { name: "b", agents: [{ name: "c" }] },
        { name: "c" },
      ]);
      expect(errors.filter((e) => e.includes("a"))).toHaveLength(0);
    });

    it("detects self-reference", () => {
      const errors = detectCircularDeps([
        { name: "a", agents: [{ name: "a" }] },
      ]);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("checkDelegationDepth", () => {
    it("returns null when under limit", () => {
      const req = new Request("http://localhost/api/agents/test", {
        headers: { "X-Fabrk-Delegation-Depth": "2" },
      });
      expect(checkDelegationDepth(req)).toBeNull();
    });

    it("returns error when at limit", () => {
      const req = new Request("http://localhost/api/agents/test", {
        headers: { "X-Fabrk-Delegation-Depth": "5" },
      });
      const result = checkDelegationDepth(req);
      expect(result).toContain("Maximum delegation depth");
    });

    it("treats missing header as depth 0", () => {
      const req = new Request("http://localhost/api/agents/test");
      expect(checkDelegationDepth(req)).toBeNull();
    });
  });

  describe("defineSupervisor", () => {
    it("creates an agent definition with agent tools", () => {
      const def = defineSupervisor({
        name: "orchestrator",
        model: "gpt-4o",
        agents: [
          { name: "search", description: "Search agent" },
          { name: "code", description: "Code agent" },
        ],
        strategy: "router",
        handlerFactory: async () => async () => new Response(""),
      });

      expect(def.model).toBe("gpt-4o");
      expect(def.tools).toHaveLength(2);
      expect(def.tools).toContain("search");
      expect(def.tools).toContain("code");
      expect(def.systemPrompt).toContain("routing supervisor");
    });

    it("uses planner strategy prompt", () => {
      const def = defineSupervisor({
        name: "planner",
        model: "gpt-4o",
        agents: [{ name: "worker", description: "Worker" }],
        strategy: "planner",
        handlerFactory: async () => async () => new Response(""),
      });

      expect(def.systemPrompt).toContain("planning supervisor");
    });
  });
});
