/**
 * State sub-interface for ModeConfig — hover, focus, pressed, disabled, etc.
 */

export interface ModeStateHover {
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
}

export interface ModeStateGroupHover {
  textPrimary: string;
  bgInverse: string;
  textInverse: string;
}

export interface ModeState {
  hover: ModeStateHover;
  groupHover: ModeStateGroupHover;
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
}

/** State token values for the default terminal theme. */
export const modeStateTokens: ModeState = {
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
};
