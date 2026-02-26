/**
 * Theme System
 *
 * Terminal theme only - monospace, sharp corners, structured aesthetic.
 */

import terminalTheme, {
  formatButtonText,
  formatLabelText,
  formatCardHeader,
  formatStatusText,
  terminalClasses,
} from './terminal';

import type { SemanticTokens } from '../tokens/semantic';

// THEME CONFIGURATION

export type ThemeName = 'terminal';

export const THEME_NAMES: ThemeName[] = ['terminal'];

export const DEFAULT_THEME: ThemeName = 'terminal';

// THEME REGISTRY

export const themes: Record<ThemeName, SemanticTokens> = {
  terminal: terminalTheme,
};

export const themeClasses = {
  terminal: terminalClasses,
};

// RE-EXPORTS

export { terminalTheme, terminalClasses };
export { formatButtonText, formatLabelText, formatCardHeader, formatStatusText };
export type { SemanticTokens };
