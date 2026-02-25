/**
 * Prompt Template System
 *
 * Create reusable, type-safe prompt templates with variable interpolation.
 *
 * @example
 * ```ts
 * import { createPromptTemplate, composePrompts } from '@fabrk/ai'
 *
 * const systemPrompt = createPromptTemplate(
 *   'You are a {{role}} assistant. Respond in {{language}}.',
 *   { role: 'helpful', language: 'English' }
 * )
 *
 * // Render with defaults
 * systemPrompt.render() // "You are a helpful assistant. Respond in English."
 *
 * // Override specific variables
 * systemPrompt.render({ language: 'Spanish' })
 * ```
 */

export interface PromptTemplate<T extends Record<string, string> = Record<string, string>> {
  /** The raw template string */
  template: string;
  /** Default variable values */
  defaults: T;
  /** Render the template with optional variable overrides */
  render(variables?: Partial<T>): string;
  /** Get all variable names in the template */
  variables(): string[];
}

/**
 * Create a reusable prompt template with variable interpolation
 * Uses {{variableName}} syntax for placeholders
 */
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

/**
 * Compose multiple prompt sections into a single prompt
 */
export function composePrompts(...sections: (string | null | undefined | false)[]): string {
  return sections
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join('\n\n');
}

/**
 * Create a system/user message pair from templates
 */
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
