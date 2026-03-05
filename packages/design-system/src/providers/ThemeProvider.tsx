'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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

// Light theme for system light mode
const LIGHT_THEME: ColorThemeName = 'bw';

export interface ThemeContextValue {
  colorTheme: ColorThemeName;
  setColorTheme: (theme: ColorThemeName) => void;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
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

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  defaultColorTheme = 'green',
  storageKey,
  storageKeyPrefix = 'design-system',
  persist = true,
}: ThemeProviderProps) {
  const colorKey = storageKey ?? 'theme';
  // legacyColorKey is only needed when storageKey is not provided (migration from old key name).
  // When storageKey IS provided, both keys would resolve to the same string — avoid the double read.
  const legacyColorKey: string | null = storageKey ? null : `${storageKeyPrefix}-color-theme`;

  const [colorTheme, setColorThemeState] = useState<ColorThemeName>(defaultColorTheme);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount, or detect system preference
  useEffect(() => {
    if (!persist) {
      setMounted(true);
      return;
    }

    const storedColor =
      localStorage.getItem(colorKey) ||
      (legacyColorKey ? localStorage.getItem(legacyColorKey) : null);

    if (storedColor && ALL_THEMES.includes(storedColor as ColorThemeName)) {
      setColorThemeState(storedColor as ColorThemeName);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = prefersDark ? defaultColorTheme : LIGHT_THEME;
      setColorThemeState(systemTheme);
    }

    setMounted(true);
  }, [colorKey, legacyColorKey, persist, defaultColorTheme]);

  useEffect(() => {
    if (!mounted) return;

    if (persist) {
      localStorage.setItem(colorKey, colorTheme);
    }

    document.documentElement.setAttribute('data-theme', colorTheme);
  }, [colorTheme, colorKey, mounted, persist]);

  const setColorTheme = (newTheme: ColorThemeName) => {
    if (ALL_THEMES.includes(newTheme)) {
      setColorThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        colorTheme,
        setColorTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

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

/**
 * Escape a string for safe interpolation inside a single-quoted JS string
 * within a script tag. Prevents injection via storage key props.
 */
function escapeScriptString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/<\/script/gi, '<\\/script');
}

/**
 * Inline script to prevent flash of unstyled content.
 * Add this to head before any stylesheets.
 *
 * Security: All interpolated props are escaped via escapeScriptString
 * to prevent script injection. defaultColorTheme is validated against
 * the known theme list.
 */
export function ThemeScript({
  storageKey,
  storageKeyPrefix = 'design-system',
  defaultColorTheme = 'green',
  nonce,
}: ThemeScriptProps) {
  // Validate defaultColorTheme against known theme names
  const safeDefaultColorTheme = ALL_THEMES.includes(defaultColorTheme)
    ? defaultColorTheme
    : 'green';

  const colorKey = storageKey ?? 'theme';
  // legacyColorKey is only needed when storageKey is not provided (migration from old key name).
  // When storageKey IS provided, both keys would resolve to the same string — avoid the double read.
  const legacyColorKey: string | null = storageKey ? null : `${storageKeyPrefix}-color-theme`;

  const escapedColorKey = escapeScriptString(colorKey);
  const escapedLegacyColorKey = legacyColorKey ? escapeScriptString(legacyColorKey) : null;
  const escapedDefault = escapeScriptString(safeDefaultColorTheme);

  // All interpolated values are escaped above — safe for inline script context
  const script = `
    (function() {
      try {
        var colorTheme = localStorage.getItem('${escapedColorKey}')${escapedLegacyColorKey ? ` || localStorage.getItem('${escapedLegacyColorKey}')` : ''};
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
          var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            document.documentElement.setAttribute('data-theme', '${escapedDefault}');
          } else {
            document.documentElement.setAttribute('data-theme', 'bw');
          }
        }
      } catch (e) {
        document.documentElement.setAttribute('data-theme', '${escapedDefault}');
      }
    })();
  `;

  return (
    <script nonce={nonce} dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />
  );
}

export default ThemeProvider;
