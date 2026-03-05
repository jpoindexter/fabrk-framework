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

  system(content: string): this {
    this.systemParts.push(content);
    return this;
  }

  context(content: string): this {
    this.contextParts.push(content);
    return this;
  }

  instruction(content: string): this {
    this.instructions.push(content);
    return this;
  }

  constraint(content: string): this {
    this.constraints.push(content);
    return this;
  }

  example(input: string, output: string): this {
    this.examples.push({ input, output });
    return this;
  }

  outputFormat(format: string): this {
    this.outputFormatStr = format;
    return this;
  }

  user(message: string): this {
    this.userMessage = message;
    return this;
  }

  build(): BuiltPrompt {
    const systemSections: string[] = [];

    if (this.systemParts.length > 0) {
      systemSections.push(this.systemParts.join('\n'));
    }

    if (this.contextParts.length > 0) {
      systemSections.push('## Context\n' + this.contextParts.join('\n'));
    }

    if (this.instructions.length > 0) {
      systemSections.push(
        '## Instructions\n' +
          this.instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')
      );
    }

    if (this.constraints.length > 0) {
      systemSections.push(
        '## Constraints\n' +
          this.constraints.map((c) => `- ${c}`).join('\n')
      );
    }

    if (this.examples.length > 0) {
      const exampleStr = this.examples
        .map(
          (e, i) =>
            `### Example ${i + 1}\nInput: ${e.input}\nOutput: ${e.output}`
        )
        .join('\n\n');
      systemSections.push('## Examples\n' + exampleStr);
    }

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
