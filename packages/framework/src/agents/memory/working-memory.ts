import type { ThreadMessage } from './types.js';

export interface WorkingMemoryConfig {
  template: (messages: ThreadMessage[]) => string;
  /** If true, WM content is computed once at session start and not updated mid-session */
  readOnly?: boolean;
  /** Message window scope for working memory population */
  scope?: 'session' | 'full';
}

export function buildWorkingMemory(
  messages: ThreadMessage[],
  config: WorkingMemoryConfig,
): string {
  return config.template(messages);
}
