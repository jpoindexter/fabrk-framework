import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadPrompt, interpolatePrompt } from "../prompts/loader.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("interpolatePrompt", () => {
  it("replaces {{variable}} placeholders", () => {
    const result = interpolatePrompt("Hello {{name}}, welcome to {{app}}!", {
      name: "Jason",
      app: "FABRK",
    });
    expect(result).toBe("Hello Jason, welcome to FABRK!");
  });

  it("handles missing variables gracefully (leaves as-is)", () => {
    const result = interpolatePrompt("Hello {{name}}, your role is {{role}}", {
      name: "Jason",
    });
    expect(result).toBe("Hello Jason, your role is {{role}}");
  });

  it("handles empty variables object", () => {
    const result = interpolatePrompt("Hello {{name}}", {});
    expect(result).toBe("Hello {{name}}");
  });

  it("replaces multiple occurrences of same variable", () => {
    const result = interpolatePrompt("{{x}} and {{x}} again", { x: "hi" });
    expect(result).toBe("hi and hi again");
  });
});

describe("loadPrompt", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-prompts-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("loads a prompt file from disk", async () => {
    const promptsDir = path.join(tmpDir, "prompts");
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptsDir, "system.md"),
      "You are a helpful assistant."
    );

    const result = await loadPrompt(tmpDir, "system.md");
    expect(result).toBe("You are a helpful assistant.");
  });

  it("resolves {{> partial}} includes", async () => {
    const promptsDir = path.join(tmpDir, "prompts");
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptsDir, "system.md"),
      "You are an assistant.\n{{> rules.md}}\nBe helpful."
    );
    fs.writeFileSync(
      path.join(promptsDir, "rules.md"),
      "- Follow instructions\n- Be concise"
    );

    const result = await loadPrompt(tmpDir, "system.md");
    expect(result).toBe(
      "You are an assistant.\n- Follow instructions\n- Be concise\nBe helpful."
    );
  });

  it("handles missing partial gracefully", async () => {
    const promptsDir = path.join(tmpDir, "prompts");
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptsDir, "system.md"),
      "Hello {{> missing.md}} world"
    );

    const result = await loadPrompt(tmpDir, "system.md");
    expect(result).toBe("Hello {{> missing.md}} world");
  });

  it("handles nested partials", async () => {
    const promptsDir = path.join(tmpDir, "prompts");
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptsDir, "system.md"),
      "Start\n{{> middle.md}}\nEnd"
    );
    fs.writeFileSync(
      path.join(promptsDir, "middle.md"),
      "Middle {{> leaf.md}}"
    );
    fs.writeFileSync(path.join(promptsDir, "leaf.md"), "LEAF");

    const result = await loadPrompt(tmpDir, "system.md");
    expect(result).toBe("Start\nMiddle LEAF\nEnd");
  });
});
