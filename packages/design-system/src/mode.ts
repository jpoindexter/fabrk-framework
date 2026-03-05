import { terminalClasses } from './themes';

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

  color: {
    bg: {
      base: string;
      surface: string;
      surfaceRaised: string;
      elevated: string;
      accent: string;
      accentMuted: string;
      accentHover: string;
      primarySubtle: string;
      primaryLight: string;
      successSubtle: string;
      danger: string;
      dangerMuted: string;
      success: string;
      successMuted: string;
      warning: string;
      warningMuted: string;
      info: string;
      infoMuted: string;
      muted: string;
      mutedSubtle: string;
      mutedLight: string;
      mutedMedium: string;
      secondary: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
      accent: string;
      danger: string;
      dangerOnColor: string;
      success: string;
      successOnColor: string;
      warning: string;
      warningOnColor: string;
      info: string;
      infoOnColor: string;
    };
    border: {
      default: string;
      focus: string;
      accent: string;
      danger: string;
      success: string;
      warning: string;
      accentSubtle: string;
      mutedSubtle: string;
    };
    icon: {
      primary: string;
      secondary: string;
      muted: string;
      accent: string;
      danger: string;
      success: string;
      warning: string;
      info: string;
    };
  };

  spacing: {
    button: { sm: string; md: string; lg: string };
    input: string;
    card: string;
    badge: { sm: string; md: string };
  };

  typography: {
    display: { xl: string; l: string; m: string; s: string };
    headline: { l: string; m: string; s: string };
    title: { l: string; m: string; s: string };
    body: { l: string; m: string; s: string };
    label: { l: string; m: string; s: string };
    code: { l: string; m: string; s: string };
    caption: string;
    button: string;
    micro: string;
    caps: string;
    input: string;
  };

  sizing: {
    panel: string;
    panelSm: string;
    sidebar: string;
    auth: string;
    dropdown: string;
    select: string;
    dropdownHeight: string;
    textareaHeight: string;
    touch: string;
  };

  sketch: {
    border: string;
    hLine: string;
    container: string;
    itemHover: string;
  };

  icon: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
  };

  zIndex: {
    banner: string;
    modal: string;
  };

  state: {
    hover: {
      bg: string;
      text: string;
      card: string;
      cardSubtle: string;
      surface: string;
      surfaceSubtle: string;
      listItem: string;
      link: string;
      linkOpacity: string;
      textPrimary: string;
      textAccent: string;
      textWarning: string;
      textDanger: string;
      border: string;
      borderAccent: string;
      borderWarning: string;
      opacity: string;
      bgInverse: string;
      textInverse: string;
    };
    groupHover: {
      textPrimary: string;
      bgInverse: string;
      textInverse: string;
    };
    focus: {
      ring: string;
      layer: string;
    };
    pressed: {
      layer: string;
    };
    disabled: {
      opacity: string;
      cursor: string;
      layer: string;
    };
    selected: {
      layer: string;
    };
    completed: {
      opacity: string;
    };
    muted: { opacity: string };
    subtle: { opacity: string };
    secondary: { opacity: string };
  };
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

  color: {
    bg: {
      base: 'bg-background',
      surface: 'bg-card',
      surfaceRaised: 'bg-card',
      elevated: 'bg-popover',
      accent: 'bg-accent',
      accentMuted: 'bg-accent/10',
      accentHover: 'bg-accent/90',
      primarySubtle: 'bg-primary/5',
      primaryLight: 'bg-primary/10',
      successSubtle: 'bg-success/20',
      danger: 'bg-destructive',
      dangerMuted: 'bg-destructive/10',
      success: 'bg-success',
      successMuted: 'bg-success/10',
      warning: 'bg-warning',
      warningMuted: 'bg-warning/10',
      info: 'bg-info',
      infoMuted: 'bg-info/10',
      muted: 'bg-muted',
      mutedSubtle: 'bg-muted/20',
      mutedLight: 'bg-muted/30',
      mutedMedium: 'bg-muted/50',
      secondary: 'bg-secondary',
    },
    text: {
      primary: 'text-foreground',
      secondary: 'text-card-foreground',
      muted: 'text-muted-foreground',
      inverse: 'text-accent-foreground',
      accent: 'text-accent',
      danger: 'text-destructive',
      dangerOnColor: 'text-destructive-foreground',
      success: 'text-success',
      successOnColor: 'text-success-foreground',
      warning: 'text-warning',
      warningOnColor: 'text-warning-foreground',
      info: 'text-info',
      infoOnColor: 'text-info-foreground',
    },
    border: {
      default: 'border-border',
      focus: 'border-ring',
      accent: 'border-primary',
      danger: 'border-destructive',
      success: 'border-success',
      warning: 'border-warning',
      accentSubtle: 'border-primary/30',
      mutedSubtle: 'border-muted-foreground/30',
    },
    icon: {
      primary: 'text-foreground',
      secondary: 'text-card-foreground',
      muted: 'text-muted-foreground',
      accent: 'text-accent',
      danger: 'text-destructive',
      success: 'text-success',
      warning: 'text-warning',
      info: 'text-info',
    },
  },

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

  state: {
    hover: {
      bg: 'hover:bg-muted',
      text: 'hover:text-foreground',
      card: 'hover:bg-muted',
      cardSubtle: 'hover:bg-muted/50',
      surface: 'hover:bg-muted',
      surfaceSubtle: 'hover:bg-muted/50',
      listItem: 'hover:bg-muted',
      link: 'hover:text-foreground',
      linkOpacity: 'hover:opacity-70',
      textPrimary: 'hover:text-foreground',
      textAccent: 'hover:text-foreground',
      textWarning: 'hover:text-warning',
      textDanger: 'hover:text-destructive',
      border: 'hover:border-foreground',
      borderAccent: 'hover:border-foreground',
      borderWarning: 'hover:border-warning',
      opacity: 'hover:opacity-80',
      bgInverse: 'hover:bg-foreground',
      textInverse: 'hover:text-background',
    },
    groupHover: {
      textPrimary: 'group-hover:text-foreground',
      bgInverse: 'group-hover:bg-foreground',
      textInverse: 'group-hover:text-background',
    },
    focus: {
      ring: 'focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2',
      layer: 'focus:bg-muted',
    },
    pressed: {
      layer: 'active:bg-muted',
    },
    disabled: {
      opacity: 'disabled:opacity-40',
      cursor: 'disabled:cursor-not-allowed',
      layer: 'disabled:bg-muted/50',
    },
    selected: {
      layer: 'bg-muted',
    },
    completed: {
      opacity: 'opacity-60',
    },
    muted: { opacity: 'opacity-50' },
    subtle: { opacity: 'opacity-40' },
    secondary: { opacity: 'opacity-70' },
  },
};
