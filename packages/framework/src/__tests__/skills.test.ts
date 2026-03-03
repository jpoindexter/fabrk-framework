import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { defineSkill } from "../skills/define-skill";
import { applySkill, composeSkills } from "../skills/apply-skill";
import { docsSearch } from "../skills/builtins/docs-search";
import type { DefineAgentOptions } from "../agents/define-agent";
import type { ToolDefinition } from "../tools/define-tool";

function makeTool(name: string): ToolDefinition {
  return {
    name,
    description: `Tool: ${name}`,
    schema: { type: "object", properties: {} },
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
  };
}

describe("Skills", () => {
  describe("defineSkill", () => {
    it("creates a skill with correct shape", () => {
      const skill = defineSkill({
        name: "test-skill",
        description: "A test skill",
        systemPrompt: "You are a test assistant.",
        tools: [makeTool("helper")],
        defaultModel: "gpt-4o",
      });

      expect(skill.name).toBe("test-skill");
      expect(skill.description).toBe("A test skill");
      expect(skill.systemPrompt).toBe("You are a test assistant.");
      expect(skill.tools).toHaveLength(1);
      expect(skill.defaultModel).toBe("gpt-4o");
    });

    it("defaults tools to empty array", () => {
      const skill = defineSkill({
        name: "minimal",
        description: "Minimal skill",
        systemPrompt: "Be helpful.",
      });
      expect(skill.tools).toEqual([]);
    });
  });

  describe("applySkill", () => {
    it("merges skill tools and prepends system prompt", () => {
      const agent: DefineAgentOptions = {
        model: "gpt-4o",
        tools: ["existing-tool"],
        systemPrompt: "You are my agent.",
      };

      const skill = defineSkill({
        name: "search",
        description: "Search skill",
        systemPrompt: "You have search capabilities.",
        tools: [makeTool("web-search")],
      });

      const result = applySkill(agent, skill);
      expect(result.tools).toContain("existing-tool");
      expect(result.tools).toContain("web-search");
      expect(result.systemPrompt).toContain("You have search capabilities.");
      expect(result.systemPrompt).toContain("You are my agent.");
      // Skill prompt comes first
      expect((result.systemPrompt as string).indexOf("search")).toBeLessThan(
        (result.systemPrompt as string).indexOf("my agent")
      );
    });

    it("agent's explicit prompt takes precedence via ordering", () => {
      const agent: DefineAgentOptions = {
        model: "gpt-4o",
        systemPrompt: "Agent-specific instructions.",
      };

      const skill = defineSkill({
        name: "base",
        description: "Base skill",
        systemPrompt: "General skill context.",
      });

      const result = applySkill(agent, skill);
      // Agent prompt is appended after skill prompt
      expect(result.systemPrompt).toBe(
        "General skill context.\n\nAgent-specific instructions."
      );
    });
  });

  describe("composeSkills", () => {
    it("applies multiple skills in order", () => {
      const agent: DefineAgentOptions = {
        model: "gpt-4o",
        tools: [],
      };

      const skill1 = defineSkill({
        name: "s1",
        description: "Skill 1",
        systemPrompt: "S1 context.",
        tools: [makeTool("t1")],
      });

      const skill2 = defineSkill({
        name: "s2",
        description: "Skill 2",
        systemPrompt: "S2 context.",
        tools: [makeTool("t2")],
      });

      const result = composeSkills(agent, [skill1, skill2]);
      expect(result.tools).toContain("t1");
      expect(result.tools).toContain("t2");
      expect(result.systemPrompt).toContain("S1 context");
      expect(result.systemPrompt).toContain("S2 context");
    });
  });

  describe("docsSearch built-in skill", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-docs-"));
      fs.writeFileSync(
        path.join(tmpDir, "getting-started.md"),
        "# Getting Started\n\nInstall with npm install fabrk"
      );
      fs.writeFileSync(
        path.join(tmpDir, "api-reference.md"),
        "# API Reference\n\nThe defineAgent function creates an agent."
      );
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true });
    });

    it("creates a valid skill definition", () => {
      const skill = docsSearch({ dir: tmpDir });
      expect(skill.name).toBe("docs-search");
      expect(skill.tools).toHaveLength(1);
      expect(skill.tools[0].name).toBe("docs-search");
    });

    it("searches markdown files and returns results", async () => {
      const skill = docsSearch({ dir: tmpDir });
      const tool = skill.tools[0];
      const result = await tool.handler({ query: "install" });
      expect((result.content[0] as { text: string }).text).toContain("getting-started.md");
      expect((result.content[0] as { text: string }).text).toContain("install");
    });

    it("returns no results for non-matching query", async () => {
      const skill = docsSearch({ dir: tmpDir });
      const tool = skill.tools[0];
      const result = await tool.handler({ query: "zyxwvutsrqp" });
      expect((result.content[0] as { text: string }).text).toContain("No results found");
    });

    it("handles non-existent directory", async () => {
      const skill = docsSearch({ dir: "/tmp/nonexistent-dir-xyz" });
      const tool = skill.tools[0];
      const result = await tool.handler({ query: "test" });
      expect((result.content[0] as { text: string }).text).toContain("not found");
    });
  });
});
