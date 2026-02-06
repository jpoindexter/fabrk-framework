/**
 * Terminal Theme
 *
 * Sharp edges, monospace typography, uppercase text.
 * Developer tools, CLI-inspired aesthetic.
 */

import { primitives } from '../tokens/primitives';
import type { SemanticTokens } from '../tokens/semantic';

export const terminalTheme: SemanticTokens = {
  color: {
    bg: {
      base: primitives.colors.gray[950],
      surface: primitives.colors.gray[900],
      surfaceRaised: primitives.colors.gray[800],
      surfaceSunken: primitives.colors.gray[950],
      muted: primitives.colors.gray[800],
      accent: primitives.colors.primary[600],
      accentMuted: primitives.colors.primary[950],
      accentHover: primitives.colors.primary[500],
      danger: primitives.colors.red[600],
      dangerMuted: primitives.colors.red[950],
      success: primitives.colors.green[600],
      successMuted: primitives.colors.green[950],
      warning: primitives.colors.amber[500],
      warningMuted: primitives.colors.amber[950],
      info: primitives.colors.blue[600],
      infoMuted: primitives.colors.blue[950],
    },
    text: {
      primary: primitives.colors.gray[50],
      secondary: primitives.colors.gray[300],
      muted: primitives.colors.gray[500],
      disabled: primitives.colors.gray[600],
      inverse: primitives.colors.gray[950],
      accent: primitives.colors.primary[400],
      accentHover: primitives.colors.primary[300],
      danger: primitives.colors.red[400],
      dangerOnColor: primitives.colors.gray[50], // Text on danger background
      success: primitives.colors.green[400],
      successOnColor: primitives.colors.gray[50], // Text on success background
      warning: primitives.colors.amber[400],
      warningOnColor: primitives.colors.gray[950], // Dark text on amber
      info: primitives.colors.blue[400],
      infoOnColor: primitives.colors.gray[50], // Text on info background
    },
    border: {
      default: primitives.colors.gray[800],
      muted: primitives.colors.gray[900],
      strong: primitives.colors.gray[700],
      accent: primitives.colors.primary[500],
      danger: primitives.colors.red[500],
      success: primitives.colors.green[500],
      warning: primitives.colors.amber[500], // Warning border
      focus: primitives.colors.primary[400],
    },
    icon: {
      primary: primitives.colors.gray[50],
      secondary: primitives.colors.gray[300],
      muted: primitives.colors.gray[500],
      accent: primitives.colors.primary[400],
      danger: primitives.colors.red[400],
      success: primitives.colors.green[400],
      warning: primitives.colors.amber[400],
      info: primitives.colors.blue[400],
    },
  },
  radius: {
    button: primitives.radius.none,
    input: primitives.radius.none,
    card: primitives.radius.none,
    modal: primitives.radius.none,
    badge: primitives.radius.sm,
    avatar: primitives.radius.none,
  },
  shadow: {
    card: primitives.shadow.none,
    dropdown: primitives.shadow.sm,
    modal: primitives.shadow.md,
    button: primitives.shadow.none,
  },
  font: {
    body: primitives.fontFamily.mono,
    heading: primitives.fontFamily.mono,
    code: primitives.fontFamily.mono,
    ui: primitives.fontFamily.mono,
  },
  textTransform: {
    button: 'uppercase',
    label: 'uppercase',
    heading: 'uppercase',
  },
  spacing: {
    component: {
      paddingXs: primitives.space[1],
      paddingSm: primitives.space[2],
      paddingMd: primitives.space[4],
      paddingLg: primitives.space[6],
      paddingXl: primitives.space[8],
      gapXs: primitives.space[1],
      gapSm: primitives.space[2],
      gapMd: primitives.space[4],
      gapLg: primitives.space[6],
    },
    section: {
      sm: primitives.space[8],
      md: primitives.space[12],
      lg: primitives.space[16],
      xl: primitives.space[24],
    },
    page: {
      padding: primitives.space[6],
    },
  },
  typography: {
    display: {
      fontSize: primitives.fontSize['5xl'],
      fontWeight: primitives.fontWeight.bold,
      lineHeight: primitives.lineHeight.tight,
      letterSpacing: primitives.letterSpacing.tight,
    },
    h1: {
      fontSize: primitives.fontSize['4xl'],
      fontWeight: primitives.fontWeight.bold,
      lineHeight: primitives.lineHeight.tight,
      letterSpacing: primitives.letterSpacing.tight,
    },
    h2: {
      fontSize: primitives.fontSize['3xl'],
      fontWeight: primitives.fontWeight.bold,
      lineHeight: primitives.lineHeight.snug,
      letterSpacing: primitives.letterSpacing.tight,
    },
    h3: {
      fontSize: primitives.fontSize['2xl'],
      fontWeight: primitives.fontWeight.semibold,
      lineHeight: primitives.lineHeight.snug,
      letterSpacing: primitives.letterSpacing.normal,
    },
    h4: {
      fontSize: primitives.fontSize.xl,
      fontWeight: primitives.fontWeight.semibold,
      lineHeight: primitives.lineHeight.normal,
      letterSpacing: primitives.letterSpacing.normal,
    },
    h5: {
      fontSize: primitives.fontSize.lg,
      fontWeight: primitives.fontWeight.medium,
      lineHeight: primitives.lineHeight.normal,
      letterSpacing: primitives.letterSpacing.normal,
    },
    h6: {
      fontSize: primitives.fontSize.base,
      fontWeight: primitives.fontWeight.medium,
      lineHeight: primitives.lineHeight.normal,
      letterSpacing: primitives.letterSpacing.normal,
    },
    body: {
      l: {
        fontSize: primitives.fontSize.lg,
        fontWeight: primitives.fontWeight.normal,
        lineHeight: primitives.lineHeight.relaxed,
        letterSpacing: primitives.letterSpacing.normal,
      },
      m: {
        fontSize: primitives.fontSize.base,
        fontWeight: primitives.fontWeight.normal,
        lineHeight: primitives.lineHeight.relaxed,
        letterSpacing: primitives.letterSpacing.normal,
      },
      s: {
        fontSize: primitives.fontSize.sm,
        fontWeight: primitives.fontWeight.normal,
        lineHeight: primitives.lineHeight.relaxed,
        letterSpacing: primitives.letterSpacing.normal,
      },
    },
    label: {
      fontSize: primitives.fontSize.sm,
      fontWeight: primitives.fontWeight.medium,
      lineHeight: primitives.lineHeight.normal,
      letterSpacing: primitives.letterSpacing.wide,
    },
    caption: {
      fontSize: primitives.fontSize.xs,
      fontWeight: primitives.fontWeight.normal,
      lineHeight: primitives.lineHeight.normal,
      letterSpacing: primitives.letterSpacing.normal,
    },
    code: {
      m: {
        fontSize: primitives.fontSize.sm,
        fontWeight: primitives.fontWeight.normal,
        lineHeight: primitives.lineHeight.normal,
        letterSpacing: primitives.letterSpacing.normal,
      },
      s: {
        fontSize: primitives.fontSize.xs,
        fontWeight: primitives.fontWeight.normal,
        lineHeight: primitives.lineHeight.normal,
        letterSpacing: primitives.letterSpacing.normal,
      },
    },
  },
  state: {
    hover: {
      bgOpacity: '0.08',
      borderOpacity: '0.5',
      opacity: '0.90',
    },
    active: {
      bgOpacity: '0.12',
      borderOpacity: '0.7',
    },
    focus: {
      ringWidth: '2px',
      ringOffset: '2px',
    },
    disabled: {
      opacity: '0.38', // WCAG-compliant disabled opacity
    },
    completed: {
      opacity: '0.60',
    },
    muted: {
      opacity: '0.50',
    },
    subtle: {
      opacity: '0.40',
    },
    secondary: {
      opacity: '0.70',
    },
  },
};

// =============================================================================
// TERMINAL THEME UTILITIES
// =============================================================================

/**
 * Format text for terminal style buttons
 * Example: "Save Changes" → "> SAVE_CHANGES"
 */
export function formatButtonText(text: string): string {
  return `> ${text.toUpperCase()}`;
}

/**
 * Format text for terminal style labels
 * Example: "Email" → "[EMAIL]:"
 */
export function formatLabelText(label: string): string {
  return `[${label.toUpperCase()}]:`;
}

/**
 * Format card header for terminal style
 * Example: ("Settings", "00") → "[ [0x00] SETTINGS ]"
 */
export function formatCardHeader(title: string, code?: string): string {
  const hexCode = code ? `[0x${code}] ` : '';
  return `[ ${hexCode}${title.toUpperCase()} ]`;
}

/**
 * Format status text for terminal style
 * Example: "Active" → "[ACTIVE]"
 */
export function formatStatusText(status: string): string {
  return `[${status.toUpperCase()}]`;
}

// =============================================================================
// TERMINAL TAILWIND CLASSES
// =============================================================================

export const terminalClasses = {
  radius: 'rounded-dynamic',
  font: 'font-body',
  text: 'uppercase',
  cardHeader: 'font-mono text-xs text-muted-foreground',
  label: 'font-mono text-xs text-muted-foreground uppercase',
  button: 'rounded-dynamic font-mono uppercase',
  input: 'rounded-dynamic font-mono border-border',
  card: 'rounded-dynamic border border-border',
  badge: 'rounded-dynamic font-mono text-xs uppercase',
} as const;

export default terminalTheme;
