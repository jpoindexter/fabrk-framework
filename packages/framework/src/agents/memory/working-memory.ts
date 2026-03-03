import type { ThreadMessage } from './types.js';

export interface WorkingMemoryConfig {
  template: (messages: ThreadMessage[]) => string;
  /** 'full' uses all messages, 'session' is an alias for the same — default 'full' */
  scope?: 'session' | 'full';
  /** If true, WM content is computed once at session start and not updated mid-session */
  readOnly?: boolean;
}

export function buildWorkingMemory(
  messages: ThreadMessage[],
  config: WorkingMemoryConfig,
): string {
  // Both scope values use the same messages array — scope is a semantic label for callers
  const subset = config.scope === 'session' ? messages : messages;
  return config.template(subset);
}
