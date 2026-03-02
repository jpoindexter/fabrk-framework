import { describe, it, expect } from "vitest";
import {
  setSkills,
  setThreadCount,
  setMaxDelegationDepth,
  setMCPExposed,
  recordToolCall,
} from "../dashboard/vite-plugin";
import { generateAgentsMd, type AgentsMdInput } from "../build/agents-md";

describe("Dashboard data", () => {
  it("recordToolCall tracks tool executions", () => {
    // Smoke test — recordToolCall doesn't throw
    expect(() =>
      recordToolCall({
        timestamp: Date.now(),
        agent: "test-agent",
        tool: "web-search",
        durationMs: 150,
        iteration: 0,
      })
    ).not.toThrow();
  });

  it("setSkills / setThreadCount / setMaxDelegationDepth / setMCPExposed do not throw", () => {
    expect(() => setSkills(3)).not.toThrow();
    expect(() => setThreadCount(10)).not.toThrow();
    expect(() => setMaxDelegationDepth(2)).not.toThrow();
    expect(() => setMCPExposed(true)).not.toThrow();
  });
});

describe("AGENTS.md generation", () => {
  it("includes skills section", () => {
    const input: AgentsMdInput = {
      agents: [],
      tools: [],
      skills: [
        { name: "docs-search", description: "Search docs", tools: ["search"] },
      ],
      prompts: [],
    };

    const md = generateAgentsMd(input);
    expect(md).toContain("## Skills");
    expect(md).toContain("### docs-search");
    expect(md).toContain("Search docs");
    expect(md).toContain("**Tools:** search");
  });

  it("includes tool schemas", () => {
    const input: AgentsMdInput = {
      agents: [],
      tools: [
        {
          name: "web-search",
          description: "Search the web",
          schema: { type: "object", properties: { query: { type: "string" } } },
        },
      ],
      skills: [],
      prompts: [],
    };

    const md = generateAgentsMd(input);
    expect(md).toContain("```json");
    expect(md).toContain('"query"');
  });

  it("includes MCP exposure status", () => {
    const input: AgentsMdInput = {
      agents: [],
      tools: [],
      skills: [],
      prompts: [],
      mcp: { exposed: true, consumed: ["filesystem-server"] },
    };

    const md = generateAgentsMd(input);
    expect(md).toContain("## MCP");
    expect(md).toContain("**Exposed:** yes");
    expect(md).toContain("**Consuming:** filesystem-server");
  });

  it("includes agent skills, memory, and delegation info", () => {
    const input: AgentsMdInput = {
      agents: [
        {
          name: "supervisor",
          route: "/api/agents/supervisor",
          model: "gpt-4o",
          auth: "required",
          tools: ["web-search"],
          skills: ["docs-search"],
          memory: true,
          agents: ["worker-1", "worker-2"],
        },
      ],
      tools: [],
      skills: [],
      prompts: [],
    };

    const md = generateAgentsMd(input);
    expect(md).toContain("**Skills:** docs-search");
    expect(md).toContain("**Memory:** enabled");
    expect(md).toContain("**Delegates to:** worker-1, worker-2");
  });
});

describe("Public exports", () => {
  it("exports memory APIs", async () => {
    const mod = await import("../index");
    expect(mod.setMemoryStore).toBeTypeOf("function");
    expect(mod.getMemoryStore).toBeTypeOf("function");
    expect(mod.InMemoryMemoryStore).toBeTypeOf("function");
  });

  it("exports orchestration APIs", async () => {
    const mod = await import("../index");
    expect(mod.agentAsTool).toBeTypeOf("function");
    expect(mod.defineSupervisor).toBeTypeOf("function");
    expect(mod.detectCircularDeps).toBeTypeOf("function");
  });

  it("exports MCP APIs", async () => {
    const mod = await import("../index");
    expect(mod.createMCPServer).toBeTypeOf("function");
    expect(mod.connectMCPServer).toBeTypeOf("function");
    expect(mod.startStdioServer).toBeTypeOf("function");
    expect(mod.createStdioClient).toBeTypeOf("function");
  });

  it("exports skill APIs", async () => {
    const mod = await import("../index");
    expect(mod.defineSkill).toBeTypeOf("function");
    expect(mod.applySkill).toBeTypeOf("function");
    expect(mod.composeSkills).toBeTypeOf("function");
    expect(mod.scanSkills).toBeTypeOf("function");
    expect(mod.docsSearch).toBeTypeOf("function");
  });

  it("exports agent loop and tool executor", async () => {
    const mod = await import("../index");
    expect(mod.runAgentLoop).toBeTypeOf("function");
    expect(mod.createToolExecutor).toBeTypeOf("function");
  });
});
