import fs from "node:fs";
import path from "node:path";
import type { SkillDefinition } from "./define-skill";

const SKILL_EXTENSIONS = new Set([".ts", ".js", ".tsx", ".jsx"]);

export interface ScannedSkill {
  name: string;
  filePath: string;
}

export function scanSkills(root: string): ScannedSkill[] {
  const skillsDir = path.join(root, "skills");
  if (!fs.existsSync(skillsDir)) return [];

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skills: ScannedSkill[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!SKILL_EXTENSIONS.has(ext)) continue;

    skills.push({
      name: path.basename(entry.name, ext),
      filePath: path.join(skillsDir, entry.name),
    });
  }

  return skills;
}

export async function loadSkillDefinitions(
  scanned: ScannedSkill[]
): Promise<SkillDefinition[]> {
  const skills: SkillDefinition[] = [];

  for (const entry of scanned) {
    try {
      const mod = await import(/* @vite-ignore */ entry.filePath);
      const skillDef: SkillDefinition = mod.default ?? mod;

      if (
        typeof skillDef?.name === "string" &&
        typeof skillDef?.description === "string" &&
        typeof skillDef?.systemPrompt === "string"
      ) {
        skills.push(skillDef);
      } else {
        console.warn(`[fabrk] Skill "${entry.name}" has invalid shape, skipping`);
      }
    } catch (err) {
      console.warn(`[fabrk] Failed to load skill "${entry.name}":`, err);
    }
  }

  return skills;
}
