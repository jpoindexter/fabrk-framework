import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanAgents } from "../agents/scanner.js";
import { defineAgent } from "../agents/define-agent.js";
import { createAgentHandler } from "../agents/route-handler.js";
import { scanTools } from "../tools/scanner.js";
import { defineTool, textResult } from "../tools/define-tool.js";
import { loadPrompt, interpolatePrompt } from "../prompts/loader.js";
import { generateAgentsMd } from "../build/agents-md.js";

describe("E2E integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-e2e-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("full agent flow: scan → define → handle → respond", async () => {
    // Create agent file
    const agentDir = path.join(tmpDir, "agents", "chat");
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentDir, "agent.ts"),
      "export default { model: 'test-model' }"
    );

    // Scan
    const agents = scanAgents(tmpDir);
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("chat");

    // Define
    const agentDef = defineAgent({
      model: "test-model",
      tools: ["search"],
      auth: "none",
    });

    // Handle
    const handler = createAgentHandler({
      ...agentDef,
      _llmCall: async (msgs) => ({
        content: `Echo: ${msgs[msgs.length - 1].content}`,
        usage: { promptTokens: 5, completionTokens: 10 },
        cost: 0.001,
      }),
    });

    const req = new Request("http://localhost/api/agents/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toBe("Echo: Hello");
    expect(data.cost).toBe(0.001);
  });

  it("full tool flow: scan → define → execute", async () => {
    // Create tool file
    const toolsDir = path.join(tmpDir, "tools");
    fs.mkdirSync(toolsDir, { recursive: true });
    fs.writeFileSync(
      path.join(toolsDir, "search.ts"),
      "export default {}"
    );

    // Scan
    const tools = scanTools(tmpDir);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("search");

    // Define and execute
    const tool = defineTool({
      name: "search",
      description: "Search docs",
      schema: {
        type: "object" as const,
        properties: { query: { type: "string" } },
        required: ["query"],
      },
      handler: async (input) =>
        textResult(`Found: ${input.query}`),
    });

    const result = await tool.handler({ query: "react hooks" });
    expect(result.content[0].text).toBe("Found: react hooks");
  });

  it("full prompt flow: load → interpolate → include partials", async () => {
    const promptsDir = path.join(tmpDir, "prompts");
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptsDir, "system.md"),
      "You are {{role}}.\n{{> rules.md}}"
    );
    fs.writeFileSync(
      path.join(promptsDir, "rules.md"),
      "- Be helpful\n- Be concise"
    );

    // Load with partials resolved
    const template = await loadPrompt(tmpDir, "system.md");
    expect(template).toContain("- Be helpful");

    // Interpolate variables
    const result = interpolatePrompt(template, { role: "an AI assistant" });
    expect(result).toBe(
      "You are an AI assistant.\n- Be helpful\n- Be concise"
    );
  });

  it("generates AGENTS.md from scanned state", () => {
    const md = generateAgentsMd({
      agents: [
        {
          name: "chat",
          route: "/api/agents/chat",
          model: "claude-sonnet-4-5-20250514",
          auth: "required",
          tools: ["search"],
        },
      ],
      tools: [{ name: "search", description: "Search documentation" }],
      prompts: ["system.md"],
    });

    expect(md).toContain("# AGENTS.md");
    expect(md).toContain("chat");
    expect(md).toContain("claude-sonnet-4-5-20250514");
    expect(md).toContain("search");
    expect(md).toContain("system.md");
  });
});
