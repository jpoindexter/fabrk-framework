export interface PromptTemplate<T extends Record<string, string> = Record<string, string>> {
  template: string;
  defaults: T;
  render(variables?: Partial<T>): string;
  variables(): string[];
}

export function createPromptTemplate<T extends Record<string, string>>(
  template: string,
  defaults: T = {} as T
): PromptTemplate<T> {
  return {
    template,
    defaults,

    render(variables?: Partial<T>): string {
      const merged = { ...defaults, ...variables };
      let result = template;
      for (const [key, value] of Object.entries(merged)) {
        // Escape regex special characters in key to prevent regex injection
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g'), () => value);
      }
      return result;
    },

    variables(): string[] {
      const matches = template.matchAll(/\{\{\s*(\w+)\s*\}\}/g);
      return [...new Set([...matches].map((m) => m[1]))];
    },
  };
}

export function composePrompts(...sections: (string | null | undefined | false)[]): string {
  return sections
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join('\n\n');
}

export function createMessagePair(
  systemTemplate: string | PromptTemplate,
  userMessage: string,
  variables?: Record<string, string>
): Array<{ role: 'system' | 'user'; content: string }> {
  const systemContent = typeof systemTemplate === 'string'
    ? systemTemplate
    : systemTemplate.render(variables);

  return [
    { role: 'system' as const, content: systemContent },
    { role: 'user' as const, content: userMessage },
  ];
}
