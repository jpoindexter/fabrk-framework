import type { DefineAgentOptions } from "../agents/define-agent";
import type { SkillDefinition } from "./define-skill";
import type { ToolDefinition } from "../tools/define-tool";

export interface AppliedAgentOptions extends DefineAgentOptions {
  /** Tool definitions injected by skills (merged with scanned tools at runtime) */
  skillToolDefinitions?: ToolDefinition[];
}

export function applySkill(
  agent: DefineAgentOptions,
  skill: SkillDefinition
): AppliedAgentOptions {
  const existingTools = agent.tools ?? [];
  const skillToolNames = skill.tools.map((t) => t.name);
  const existingSkillTools = (agent as AppliedAgentOptions).skillToolDefinitions ?? [];

  // Skill prompt prepends to agent prompt (agent's explicit prompt takes precedence)
  const systemPrompt = agent.systemPrompt
    ? `${skill.systemPrompt}\n\n${agent.systemPrompt}`
    : skill.systemPrompt;

  return {
    ...agent,
    systemPrompt,
    tools: [...existingTools, ...skillToolNames],
    skillToolDefinitions: [...existingSkillTools, ...skill.tools],
    // Preserve agent model, or use skill default
    model: agent.model || skill.defaultModel || agent.model,
  };
}

export function composeSkills(
  agent: DefineAgentOptions,
  skills: SkillDefinition[]
): AppliedAgentOptions {
  return skills.reduce<AppliedAgentOptions>(
    (acc, skill) => applySkill(acc, skill),
    agent
  );
}
