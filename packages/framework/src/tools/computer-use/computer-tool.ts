import type { ToolDefinition } from '../define-tool.js';

export type ComputerAction =
  | 'screenshot'
  | 'left_click'
  | 'right_click'
  | 'middle_click'
  | 'double_click'
  | 'scroll'
  | 'key'
  | 'type'
  | 'wait';

export interface ComputerToolOptions {
  displayWidth?: number;
  displayHeight?: number;
  onScreenshot?: () => Promise<string>; // returns base64 PNG
  onAction?: (action: ComputerAction, params: Record<string, unknown>) => Promise<void>;
}

/** Creates a Computer tool compatible with Anthropic's computer_use_20250124 API. */
export function defineComputerTool(options?: ComputerToolOptions): ToolDefinition {
  const width = options?.displayWidth ?? 1920;
  const height = options?.displayHeight ?? 1080;

  return {
    name: 'computer',
    description: `Control a computer with ${width}x${height} display. Take screenshots, click, type, scroll.`,
    schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'The action to perform: screenshot, left_click, right_click, middle_click, double_click, scroll, key, type, wait',
        },
        coordinate: {
          type: 'array',
          description: '[x, y] pixel coordinate for click/scroll actions.',
        },
        text: {
          type: 'string',
          description: 'Text to type or key sequence to press.',
        },
        duration: {
          type: 'number',
          description: 'Duration in ms for wait action.',
        },
        scroll_direction: {
          type: 'string',
          description: 'Scroll direction: up, down, left, right.',
        },
        scroll_distance: {
          type: 'number',
          description: 'Scroll distance in pixels.',
        },
      },
      required: ['action'],
    },
    handler: async (input) => {
      const action = input.action as ComputerAction;
      if (action === 'screenshot') {
        if (!options?.onScreenshot) {
          return { content: [{ type: 'text', text: '[computer tool: screenshot not configured]' }] };
        }
        try {
          const base64 = await options.onScreenshot();
          return { content: [{ type: 'text', text: base64 }] };
        } catch (err) {
          return { content: [{ type: 'text', text: `Screenshot error: ${err instanceof Error ? err.message : String(err)}` }] };
        }
      }

      if (!options?.onAction) {
        return { content: [{ type: 'text', text: `[computer tool: action '${action}' not configured]` }] };
      }

      const params: Record<string, unknown> = {};
      if (input.coordinate) params.coordinate = input.coordinate;
      if (input.text) params.text = input.text;
      if (input.duration) params.duration = input.duration;
      if (input.scroll_direction) params.scrollDirection = input.scroll_direction;
      if (input.scroll_distance) params.scrollDistance = input.scroll_distance;

      try {
        await options.onAction(action, params);
        return { content: [{ type: 'text', text: `Action '${action}' completed` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Action error: ${err instanceof Error ? err.message : String(err)}` }] };
      }
    },
  };
}
