import { terminalClasses } from './themes';
import type {
  ModeColor, ModeColorBg, ModeColorBorder, ModeColorIcon, ModeColorText,
  ModeIcon, ModeSizing, ModeSketch, ModeSpacing, ModeTypography, ModeZIndex,
} from './mode-types';
import type { ModeState } from './mode-state';
import { modeStateTokens } from './mode-state';
import { modeColorTokens } from './mode-colors';

// Re-export all sub-interfaces for consumers
export type {
  ModeColor, ModeColorBg, ModeColorBorder, ModeColorIcon, ModeColorText,
  ModeIcon, ModeSizing, ModeSketch, ModeSpacing, ModeTypography, ModeZIndex,
} from './mode-types';
export type { ModeState, ModeStateHover, ModeStateGroupHover } from './mode-state';

/**
 * Mode configuration — maps theme tokens to Tailwind classes.
 * Extended token system covering colors, spacing, typography, sizing, icons, and states.
 */
export interface ModeConfig {
  radius: string;
  font: string;
  shadow: string;
  buttonPrefix: string;
  labelFormat: 'brackets' | 'plain';
  cardHeader: 'bracketed' | 'simple' | 'minimal';
  textTransform: 'uppercase' | 'normal';
  inputStyle: string;
  borderWidth: string;
  color: ModeColor;
  spacing: ModeSpacing;
  typography: ModeTypography;
  sizing: ModeSizing;
  sketch: ModeSketch;
  icon: ModeIcon;
  zIndex: ModeZIndex;
  state: ModeState;
}

/**
 * Current mode configuration — used by 100+ components.
 * Maps the theme system to Tailwind utility classes.
 */
export const mode: ModeConfig = {
  radius: terminalClasses.radius,
  font: terminalClasses.font,
  shadow: 'shadow-sm',
  buttonPrefix: '',
  labelFormat: 'brackets',
  cardHeader: 'bracketed',
  textTransform: 'uppercase',
  inputStyle: terminalClasses.input,
  borderWidth: 'border',

  color: modeColorTokens,

  spacing: {
    button: { sm: 'px-2 py-1', md: 'px-4 py-2', lg: 'px-6 py-4' },
    input: 'px-4 py-2',
    card: 'p-4',
    badge: { sm: 'px-2 py-0.5', md: 'px-2 py-1' },
  },

  typography: {
    display: { xl: 'text-display-xl', l: 'text-display-l', m: 'text-display-m', s: 'text-display-s' },
    headline: { l: 'text-headline-l', m: 'text-headline-m', s: 'text-headline-s' },
    title: { l: 'text-title-l', m: 'text-title-m', s: 'text-title-s' },
    body: { l: 'text-body-l', m: 'text-body-m', s: 'text-body-s' },
    label: { l: 'text-label-l', m: 'text-label-m', s: 'text-label-s' },
    code: { l: 'text-code-l', m: 'text-code-m', s: 'text-code-s' },
    caption: 'text-caption text-muted-foreground',
    button: 'text-label-m font-medium',
    micro: 'text-2xs',
    caps: 'uppercase tracking-caps',
    input: 'text-body-m',
  },

  sizing: {
    panel: 'h-panel',
    panelSm: 'h-panel-sm',
    sidebar: 'w-sidebar',
    auth: 'max-w-auth',
    dropdown: 'min-w-dropdown',
    select: 'min-w-select',
    dropdownHeight: 'max-h-dropdown',
    textareaHeight: 'max-h-textarea',
    touch: 'min-h-touch min-w-touch',
  },

  sketch: {
    border: 'border-border',
    hLine: 'border-b border-border',
    container: 'bg-transparent border border-border',
    itemHover: 'hover:bg-muted transition-colors',
  },

  icon: {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  },

  zIndex: {
    banner: 'z-banner',
    modal: 'z-modal',
  },

  state: modeStateTokens,
};
