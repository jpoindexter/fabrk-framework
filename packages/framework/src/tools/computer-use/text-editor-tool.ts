import type { ToolDefinition } from '../define-tool.js';
import { textResult } from '../define-tool.js';

export type TextEditorCommand = 'view' | 'create' | 'str_replace' | 'insert' | 'undo_edit';

export interface TextEditorExecuteOptions {
  command: TextEditorCommand;
  path: string;
  fileText?: string;
  oldStr?: string;
  newStr?: string;
  insertLine?: number;
  viewRange?: [number, number];
}

export interface TextEditorToolOptions {
  onExecute?: (opts: TextEditorExecuteOptions) => Promise<string>;
}

/** Creates a TextEditor tool compatible with Anthropic's computer_use_20250124 API. */
export function defineTextEditorTool(options?: TextEditorToolOptions): ToolDefinition {
  return {
    name: 'str_replace_based_edit_tool',
    description: 'View and edit files using string replacement, creation, and insertion commands.',
    schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'One of: view, create, str_replace, insert, undo_edit',
        },
        path: {
          type: 'string',
          description: 'Absolute path to the file.',
        },
        file_text: {
          type: 'string',
          description: 'Content for the create command.',
        },
        old_str: {
          type: 'string',
          description: 'The exact string to replace (for str_replace).',
        },
        new_str: {
          type: 'string',
          description: 'The replacement string (for str_replace).',
        },
        insert_line: {
          type: 'number',
          description: 'Line number to insert after (for insert).',
        },
        view_range: {
          type: 'array',
          description: '[start_line, end_line] range for view command.',
        },
      },
      required: ['command', 'path'],
    },
    handler: async (input) => {
      const command = input.command as TextEditorCommand;
      const path = input.path as string;
      if (!options?.onExecute) {
        return textResult('[text_editor tool: no executor configured]');
      }
      try {
        const output = await options.onExecute({
          command,
          path,
          fileText: input.file_text as string | undefined,
          oldStr: input.old_str as string | undefined,
          newStr: input.new_str as string | undefined,
          insertLine: input.insert_line as number | undefined,
          viewRange: input.view_range as [number, number] | undefined,
        });
        return textResult(output);
      } catch (err) {
        return textResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}
