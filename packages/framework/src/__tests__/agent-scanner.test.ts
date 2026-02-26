import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { scanAgents } from "../agents/scanner.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("scanAgents", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-agents-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("discovers agents from agents/ directory", () => {
    const agentDir = path.join(tmpDir, "agents", "chat");
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentDir, "agent.ts"),
      'export default { model: "claude-sonnet-4-5-20250514" }'
    );

    const agents = scanAgents(tmpDir);
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("chat");
    expect(agents[0].filePath).toContain("agents/chat/agent.ts");
  });

  it("discovers multiple agents", () => {
    for (const name of ["chat", "summarize", "extract"]) {
      const dir = path.join(tmpDir, "agents", name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "agent.ts"), "export default {}");
    }

    const agents = scanAgents(tmpDir);
    expect(agents).toHaveLength(3);
    expect(agents.map((a) => a.name).sort()).toEqual([
      "chat",
      "extract",
      "summarize",
    ]);
  });

  it("returns empty array when no agents/ dir", () => {
    const agents = scanAgents(tmpDir);
    expect(agents).toEqual([]);
  });

  it("generates correct route pattern", () => {
    const agentDir = path.join(tmpDir, "agents", "summarize");
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, "agent.ts"), "export default {}");

    const agents = scanAgents(tmpDir);
    expect(agents[0].routePattern).toBe("/api/agents/summarize");
  });
});
