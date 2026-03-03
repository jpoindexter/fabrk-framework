import type { ToolDefinition } from '../define-tool.js';

export interface BashToolOptions {
  /** Called to actually execute the bash command. Must be provided in production. */
  onExecute?: (command: string) => Promise<string>;
  /** Timeout in ms for command execution (default: 30000) */
  timeoutMs?: number;
}

/** Creates a Bash tool compatible with Anthropic's computer_use_20250124 API. */
export function defineBashTool(options?: BashToolOptions): ToolDefinition {
  return {
    name: 'bash',
    description: 'Execute bash commands in a shell. Returns stdout+stderr combined.',
    schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The bash command to execute.',
        },
        restart: {
          type: 'boolean',
          description: 'If true, restart the shell session before executing.',
        },
      },
      required: ['command'],
    },
    handler: async (input) => {
      const command = input.command as string;
      if (!command || typeof command !== 'string') {
        return { content: [{ type: 'text', text: 'Error: command must be a non-empty string' }] };
      }
      if (!options?.onExecute) {
        return { content: [{ type: 'text', text: '[bash tool: no executor configured]' }] };
      }
      try {
        const output = await options.onExecute(command);
        return { content: [{ type: 'text', text: output }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    },
  };
}
