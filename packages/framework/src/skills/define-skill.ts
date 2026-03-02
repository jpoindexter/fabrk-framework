import type { ToolDefinition } from "../tools/define-tool";

export interface SkillDefinition {
  name: string;
  description: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  defaultModel?: string;
}

export interface DefineSkillOptions {
  name: string;
  description: string;
  systemPrompt: string;
  tools?: ToolDefinition[];
  defaultModel?: string;
}

export function defineSkill(options: DefineSkillOptions): SkillDefinition {
  return {
    name: options.name,
    description: options.description,
    systemPrompt: options.systemPrompt,
    tools: options.tools ?? [],
    defaultModel: options.defaultModel,
  };
}
