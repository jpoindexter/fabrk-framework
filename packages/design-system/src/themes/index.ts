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

// =============================================================================
// THEME CONFIGURATION
// =============================================================================

export type ThemeName = 'terminal';

export const THEME_NAMES: ThemeName[] = ['terminal'];

export const DEFAULT_THEME: ThemeName = 'terminal';

export const CURRENT_THEME: ThemeName = 'terminal';

// =============================================================================
// THEME REGISTRY
// =============================================================================

export const themes: Record<ThemeName, SemanticTokens> = {
  terminal: terminalTheme,
};

export const themeClasses = {
  terminal: terminalClasses,
};

// =============================================================================
// THEME ACCESS
// =============================================================================

/**
 * Get the active theme tokens (always terminal)
 */
export function getActiveTheme(): SemanticTokens {
  return terminalTheme;
}

/**
 * Get the active theme classes (always terminal)
 */
export function getActiveThemeClasses() {
  return terminalClasses;
}

// =============================================================================
// THEME UTILITIES
// =============================================================================

export interface ThemeUtils {
  formatButtonText: (text: string) => string;
  formatLabelText: (label: string) => string;
  formatCardHeader: (title: string, code?: string) => string;
  formatStatusText: (status: string) => string;
}

export const themeUtils: Record<ThemeName, ThemeUtils> = {
  terminal: {
    formatButtonText,
    formatLabelText,
    formatCardHeader,
    formatStatusText,
  },
};

/**
 * Get utilities for the active theme (always terminal)
 */
export function getActiveThemeUtils(): ThemeUtils {
  return themeUtils.terminal;
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export { terminalTheme, terminalClasses };
export { formatButtonText, formatLabelText, formatCardHeader, formatStatusText };
export type { SemanticTokens };
