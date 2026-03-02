import type { DefineAgentOptions } from "../agents/define-agent";
import type { SkillDefinition } from "./define-skill";

export function applySkill(
  agent: DefineAgentOptions,
  skill: SkillDefinition
): DefineAgentOptions {
  const existingTools = agent.tools ?? [];
  const skillToolNames = skill.tools.map((t) => t.name);

  // Skill prompt prepends to agent prompt (agent's explicit prompt takes precedence)
  const systemPrompt = agent.systemPrompt
    ? `${skill.systemPrompt}\n\n${agent.systemPrompt}`
    : skill.systemPrompt;

  return {
    ...agent,
    systemPrompt,
    tools: [...existingTools, ...skillToolNames],
    // Preserve agent model, or use skill default
    model: agent.model || skill.defaultModel || agent.model,
  };
}

export function composeSkills(
  agent: DefineAgentOptions,
  skills: SkillDefinition[]
): DefineAgentOptions {
  return skills.reduce<DefineAgentOptions>(
    (acc, skill) => applySkill(acc, skill),
    agent
  );
}
