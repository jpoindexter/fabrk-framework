import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanSkills } from "../skills/scanner";

let tmpDir: string;

function setup(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-skills-test-"));
  return tmpDir;
}

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

describe("scanSkills", () => {
  it("returns empty array when skills dir does not exist", () => {
    const root = setup();
    expect(scanSkills(root)).toEqual([]);
  });

  it("finds .ts and .js skill files", () => {
    const root = setup();
    const skillsDir = path.join(root, "skills");
    fs.mkdirSync(skillsDir);
    fs.writeFileSync(path.join(skillsDir, "my-skill.ts"), "");
    fs.writeFileSync(path.join(skillsDir, "another.js"), "");

    const result = scanSkills(root);

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.name).sort()).toEqual(["another", "my-skill"]);
  });

  it("ignores non-script files (.md, .json, .css)", () => {
    const root = setup();
    const skillsDir = path.join(root, "skills");
    fs.mkdirSync(skillsDir);
    fs.writeFileSync(path.join(skillsDir, "README.md"), "");
    fs.writeFileSync(path.join(skillsDir, "config.json"), "");
    fs.writeFileSync(path.join(skillsDir, "styles.css"), "");

    expect(scanSkills(root)).toEqual([]);
  });

  it("ignores directories inside skills/", () => {
    const root = setup();
    const skillsDir = path.join(root, "skills");
    fs.mkdirSync(skillsDir);
    fs.mkdirSync(path.join(skillsDir, "nested"));
    fs.writeFileSync(path.join(skillsDir, "nested", "inner.ts"), "");

    expect(scanSkills(root)).toEqual([]);
  });

  it("extracts name from filename without extension", () => {
    const root = setup();
    const skillsDir = path.join(root, "skills");
    fs.mkdirSync(skillsDir);
    fs.writeFileSync(path.join(skillsDir, "docs-search.tsx"), "");

    const result = scanSkills(root);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("docs-search");
    expect(result[0].filePath).toBe(path.join(skillsDir, "docs-search.tsx"));
  });

  it("returns empty when skills dir is empty", () => {
    const root = setup();
    fs.mkdirSync(path.join(root, "skills"));

    expect(scanSkills(root)).toEqual([]);
  });
});
