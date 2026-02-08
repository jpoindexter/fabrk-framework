'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ThemeName } from '../themes';
import { DEFAULT_THEME, THEME_NAMES } from '../themes';

// =============================================================================
// CONTEXT TYPES
// =============================================================================

// Color themes correspond to CRT phosphor palettes in globals.css
export type ColorThemeName =
  | 'amber'
  | 'green'
  | 'blue'
  | 'red'
  | 'purple'
  | 'gameboy'
  | 'c64'
  | 'gbpocket'
  | 'vic20'
  | 'atari'
  | 'spectrum'
  | 'bw'
  // Futuristic themes
  | 'cyberpunk'
  | 'phosphor'
  | 'holographic'
  | 'navigator'
  | 'blueprint'
  | 'infrared';

const ALL_THEMES = [
  // Standard CRT
  'amber',
  'green',
  'blue',
  'red',
  'purple',
  // Retro Computer
  'gameboy',
  'c64',
  'gbpocket',
  'vic20',
  'atari',
  'spectrum',
  // Futuristic
  'cyberpunk',
  'phosphor',
  'holographic',
  'navigator',
  'blueprint',
  'infrared',
  // Light
  'bw',
] as const;

// Dark themes for system dark mode (all terminal themes are dark)
const DARK_THEMES: ColorThemeName[] = [
  // Standard CRT
  'amber',
  'green',
  'blue',
  'red',
  'purple',
  // Retro Computer
  'gameboy',
  'c64',
  'gbpocket',
  'vic20',
  'atari',
  'spectrum',
  // Futuristic
  'cyberpunk',
  'phosphor',
  'holographic',
  'navigator',
  'blueprint',
  'infrared',
];

// Light theme for system light mode
const LIGHT_THEME: ColorThemeName = 'bw';

// Get a random dark theme
function getRandomDarkTheme(): ColorThemeName {
  return DARK_THEMES[Math.floor(Math.random() * DARK_THEMES.length)];
}

// =============================================================================

export interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  colorTheme: ColorThemeName;
  setColorTheme: (theme: ColorThemeName) => void;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
  defaultColorTheme?: ColorThemeName;
  storageKey?: string;
  storageKeyPrefix?: string;
  persist?: boolean;
}

export interface ThemeScriptProps {
  storageKey?: string;
  storageKeyPrefix?: string;
  defaultColorTheme?: ColorThemeName;
  nonce?: string;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  defaultColorTheme = 'green',
  storageKey,
  storageKeyPrefix = 'design-system',
  persist = true,
}: ThemeProviderProps) {
  const colorKey = storageKey || 'theme';
  const legacyColorKey = storageKey || `${storageKeyPrefix}-color-theme`;

  const [theme, setThemeState] = useState<ThemeName>(defaultTheme);
  const [colorTheme, setColorThemeState] = useState<ColorThemeName>(defaultColorTheme);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount, or detect system preference
  useEffect(() => {
    if (!persist) {
      setMounted(true);
      return;
    }

    const storedColor = localStorage.getItem(colorKey) || localStorage.getItem(legacyColorKey);

    if (storedColor && ALL_THEMES.includes(storedColor as ColorThemeName)) {
      // User has a stored preference - use it
      setColorThemeState(storedColor as ColorThemeName);
    } else {
      // No stored preference - detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = prefersDark ? getRandomDarkTheme() : LIGHT_THEME;
      setColorThemeState(systemTheme);
      // Don't persist system-detected theme until user explicitly changes it
    }

    setMounted(true);
  }, [colorKey, legacyColorKey, persist]);

  // Update localStorage and DOM when theme changes
  useEffect(() => {
    if (!mounted) return;

    if (persist) {
      localStorage.setItem(colorKey, colorTheme);
    }

    document.documentElement.setAttribute('data-theme', colorTheme);
  }, [colorTheme, colorKey, mounted, persist]);

  const setTheme = (newTheme: ThemeName) => {
    if (THEME_NAMES.includes(newTheme)) {
      setThemeState(newTheme);
    }
  };

  const setColorTheme = (newTheme: ColorThemeName) => {
    if (ALL_THEMES.includes(newTheme)) {
      setColorThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        colorTheme,
        setColorTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

export function useOptionalThemeContext(): ThemeContextValue | null {
  return useContext(ThemeContext);
}

// =============================================================================
// SCRIPT FOR SSR FLASH PREVENTION
// =============================================================================

/**
 * Inline script to prevent flash of unstyled content
 * Add this to <head> before any stylesheets
 */
export function ThemeScript({
  storageKey,
  storageKeyPrefix = 'design-system',
  defaultColorTheme = 'green',
  nonce,
}: ThemeScriptProps) {
  const colorKey = storageKey || 'theme';
  const legacyColorKey = storageKey || `${storageKeyPrefix}-color-theme`;

  const script = `
    (function() {
      try {
        var colorTheme = localStorage.getItem('${colorKey}') || localStorage.getItem('${legacyColorKey}');
        var validThemes = [
          'amber', 'green', 'blue', 'red', 'purple',
          'gameboy', 'c64', 'gbpocket', 'vic20', 'atari', 'spectrum',
          'cyberpunk', 'phosphor', 'holographic', 'navigator', 'blueprint', 'infrared',
          'bw'
        ];
        var darkThemes = [
          'amber', 'green', 'blue', 'red', 'purple',
          'gameboy', 'c64', 'gbpocket', 'vic20', 'atari', 'spectrum',
          'cyberpunk', 'phosphor', 'holographic', 'navigator', 'blueprint', 'infrared'
        ];

        if (colorTheme && validThemes.includes(colorTheme)) {
          document.documentElement.setAttribute('data-theme', colorTheme);
        } else {
          // No stored preference - detect system preference
          var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            // Pick a random dark theme
            var randomDark = darkThemes[Math.floor(Math.random() * darkThemes.length)];
            document.documentElement.setAttribute('data-theme', randomDark);
          } else {
            // Light mode - use B&W theme
            document.documentElement.setAttribute('data-theme', 'bw');
          }
        }
      } catch (e) {
        document.documentElement.setAttribute('data-theme', '${defaultColorTheme}');
      }
    })();
  `;

  return (
    <script nonce={nonce} dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />
  );
}

export default ThemeProvider;
