import { describe, it, expect } from "vitest";
import { defineSupervisor } from "../agents/orchestration/supervisor";

const HANDLER_FACTORY = async (_name: string) => async (_req: Request) =>
  new Response("ok");

const BASE_CONFIG = {
  name: "super",
  model: "gpt-4o",
  agents: [
    { name: "agent-a", description: "Does A" },
    { name: "agent-b", description: "Does B" },
  ],
  handlerFactory: HANDLER_FACTORY,
};

describe("defineSupervisor — strategy prompts", () => {
  it("router strategy sets single-delegation system prompt", () => {
    const def = defineSupervisor({ ...BASE_CONFIG, strategy: "router" });
    expect(def.systemPrompt).toContain("routing supervisor");
    expect(def.systemPrompt).toContain("Only delegate once per request");
  });

  it("planner strategy sets multi-step system prompt", () => {
    const def = defineSupervisor({ ...BASE_CONFIG, strategy: "planner" });
    expect(def.systemPrompt).toContain("planning supervisor");
    expect(def.systemPrompt).toContain("Break the user's request into steps");
  });

  it("custom systemPrompt is appended after strategy prompt", () => {
    const def = defineSupervisor({
      ...BASE_CONFIG,
      strategy: "router",
      systemPrompt: "Always respond in Spanish.",
    });
    expect(def.systemPrompt).toContain("routing supervisor");
    expect(def.systemPrompt).toContain("Always respond in Spanish.");
    // Custom part comes after the strategy part
    const stratIdx = def.systemPrompt!.indexOf("routing supervisor");
    const customIdx = def.systemPrompt!.indexOf("Always respond in Spanish.");
    expect(customIdx).toBeGreaterThan(stratIdx);
  });

  it("no custom systemPrompt — only strategy text", () => {
    const def = defineSupervisor({ ...BASE_CONFIG, strategy: "planner" });
    // Should not have extraneous separator if no custom prompt
    expect(def.systemPrompt!.trim()).not.toContain("\n\nundefined");
  });
});

describe("defineSupervisor — maxDelegations", () => {
  it("uses default of 5 when not specified", () => {
    const def = defineSupervisor({ ...BASE_CONFIG, strategy: "router" });
    expect(def.maxDelegations).toBe(5);
  });

  it("caps maxDelegations at 10 regardless of input", () => {
    const def = defineSupervisor({
      ...BASE_CONFIG,
      strategy: "router",
      maxDelegations: 999,
    });
    expect(def.maxDelegations).toBe(10);
  });

  it("respects a value below the cap", () => {
    const def = defineSupervisor({
      ...BASE_CONFIG,
      strategy: "planner",
      maxDelegations: 3,
    });
    expect(def.maxDelegations).toBe(3);
  });
});

describe("defineSupervisor — shape", () => {
  it("exposes toolDefinitions for each registered agent", () => {
    const def = defineSupervisor({ ...BASE_CONFIG, strategy: "router" });
    expect(def.toolDefinitions).toHaveLength(2);
    expect(def.toolDefinitions[0].name).toBe("agent-a");
    expect(def.toolDefinitions[1].name).toBe("agent-b");
  });

  it("tools list contains agent names", () => {
    const def = defineSupervisor({ ...BASE_CONFIG, strategy: "router" });
    expect(def.tools).toContain("agent-a");
    expect(def.tools).toContain("agent-b");
  });

  it("stream defaults to true and auth to none", () => {
    const def = defineSupervisor({ ...BASE_CONFIG, strategy: "router" });
    expect(def.stream).toBe(true);
    expect(def.auth).toBe("none");
  });
});
