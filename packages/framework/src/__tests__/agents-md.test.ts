import { describe, it, expect } from "vitest";
import { generateAgentsMd } from "../build/agents-md.js";

describe("generateAgentsMd", () => {
  it("generates markdown with agents table", () => {
    const md = generateAgentsMd({
      agents: [
        {
          name: "chat",
          route: "/api/agents/chat",
          model: "claude-sonnet-4-5-20250514",
          auth: "required",
          tools: ["search-docs"],
        },
        {
          name: "summarize",
          route: "/api/agents/summarize",
          model: "gpt-4o",
          auth: "none",
          tools: [],
        },
      ],
      tools: [{ name: "search-docs", description: "Search documentation" }],
      prompts: ["system.md", "rules.md"],
    });

    expect(md).toContain("# AGENTS.md");
    expect(md).toContain("chat");
    expect(md).toContain("/api/agents/chat");
    expect(md).toContain("claude-sonnet-4-5-20250514");
    expect(md).toContain("search-docs");
    expect(md).toContain("system.md");
  });

  it("handles empty state", () => {
    const md = generateAgentsMd({
      agents: [],
      tools: [],
      prompts: [],
    });

    expect(md).toContain("# AGENTS.md");
    expect(md).toContain("No agents defined");
  });

  it("includes tools table", () => {
    const md = generateAgentsMd({
      agents: [],
      tools: [
        { name: "search", description: "Search things" },
        { name: "fetch", description: "Fetch URLs" },
      ],
      prompts: [],
    });

    expect(md).toContain("search");
    expect(md).toContain("Search things");
    expect(md).toContain("fetch");
  });
});
