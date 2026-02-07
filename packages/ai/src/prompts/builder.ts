/**
 * Prompt Builder
 *
 * Fluent API for building complex prompts with sections,
 * context injection, and formatting rules.
 *
 * @example
 * ```ts
 * import { PromptBuilder } from '@fabrk/ai'
 *
 * const prompt = new PromptBuilder()
 *   .system('You are a coding assistant.')
 *   .context('The user is building a Next.js app.')
 *   .instruction('Generate a login form component.')
 *   .constraint('Use TypeScript')
 *   .constraint('Follow accessibility best practices')
 *   .outputFormat('Return only the code, no explanations.')
 *   .build()
 * ```
 */

export interface BuiltPrompt {
  system: string;
  user: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

export class PromptBuilder {
  private systemParts: string[] = [];
  private contextParts: string[] = [];
  private instructions: string[] = [];
  private constraints: string[] = [];
  private examples: Array<{ input: string; output: string }> = [];
  private outputFormatStr = '';
  private userMessage = '';

  /** Add a system prompt section */
  system(content: string): this {
    this.systemParts.push(content);
    return this;
  }

  /** Add context information */
  context(content: string): this {
    this.contextParts.push(content);
    return this;
  }

  /** Set the main instruction */
  instruction(content: string): this {
    this.instructions.push(content);
    return this;
  }

  /** Add a constraint or rule */
  constraint(content: string): this {
    this.constraints.push(content);
    return this;
  }

  /** Add a few-shot example */
  example(input: string, output: string): this {
    this.examples.push({ input, output });
    return this;
  }

  /** Set the output format description */
  outputFormat(format: string): this {
    this.outputFormatStr = format;
    return this;
  }

  /** Set the user message */
  user(message: string): this {
    this.userMessage = message;
    return this;
  }

  /** Build the final prompt */
  build(): BuiltPrompt {
    const systemSections: string[] = [];

    // System prompt
    if (this.systemParts.length > 0) {
      systemSections.push(this.systemParts.join('\n'));
    }

    // Context
    if (this.contextParts.length > 0) {
      systemSections.push('## Context\n' + this.contextParts.join('\n'));
    }

    // Instructions
    if (this.instructions.length > 0) {
      systemSections.push(
        '## Instructions\n' +
          this.instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')
      );
    }

    // Constraints
    if (this.constraints.length > 0) {
      systemSections.push(
        '## Constraints\n' +
          this.constraints.map((c) => `- ${c}`).join('\n')
      );
    }

    // Examples
    if (this.examples.length > 0) {
      const exampleStr = this.examples
        .map(
          (e, i) =>
            `### Example ${i + 1}\nInput: ${e.input}\nOutput: ${e.output}`
        )
        .join('\n\n');
      systemSections.push('## Examples\n' + exampleStr);
    }

    // Output format
    if (this.outputFormatStr) {
      systemSections.push('## Output Format\n' + this.outputFormatStr);
    }

    const systemContent = systemSections.join('\n\n');
    const userContent = this.userMessage || this.instructions[0] || '';

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (systemContent) {
      messages.push({ role: 'system', content: systemContent });
    }
    if (userContent) {
      messages.push({ role: 'user', content: userContent });
    }

    return {
      system: systemContent,
      user: userContent,
      messages,
    };
  }
}
