/**
 * Hashmark CSS Preset
 *
 * Complete CSS variable set for the Hashmark aesthetic:
 * zinc grays, emerald accent, amber warnings, sharp corners, monospace.
 *
 * Use generateHashmarkCss() to get the full CSS string, or import
 * hashmarkVariables for programmatic access.
 */

// =============================================================================
// CSS VARIABLE VALUES
// =============================================================================

export const hashmarkVariables = {
  // Base
  '--background': '#09090b',
  '--foreground': '#fafafa',

  // Card (elevated surface)
  '--card': '#18181b',
  '--card-foreground': '#fafafa',

  // Popover (menus, dropdowns)
  '--popover': '#18181b',
  '--popover-foreground': '#fafafa',

  // Primary (main action — emerald)
  '--primary': '#10b981',
  '--primary-foreground': '#ecfdf5',

  // Secondary (subtle surface)
  '--secondary': '#27272a',
  '--secondary-foreground': '#fafafa',

  // Muted (subdued)
  '--muted': '#18181b',
  '--muted-foreground': '#a1a1aa',

  // Accent (same as primary for hashmark)
  '--accent': '#10b981',
  '--accent-foreground': '#ecfdf5',

  // Destructive (errors, danger)
  '--destructive': '#ef4444',
  '--destructive-foreground': '#fafafa',

  // Border
  '--border': '#27272a',
  '--input': '#27272a',
  '--ring': '#10b981',

  // Radius (terminal = sharp)
  '--radius': '0rem',

  // Status: success (emerald)
  '--success': '#10b981',
  '--success-foreground': '#ecfdf5',

  // Status: warning (amber)
  '--warning': '#f59e0b',
  '--warning-foreground': '#09090b',

  // Status: info (blue)
  '--info': '#3b82f6',
  '--info-foreground': '#fafafa',

  // Chart colors (for FABRK chart components)
  '--chart-1': '#10b981',
  '--chart-2': '#3b82f6',
  '--chart-3': '#f59e0b',
  '--chart-4': '#8b5cf6',
  '--chart-5': '#ef4444',
} as const;

// =============================================================================
// CSS GENERATOR
// =============================================================================

/**
 * Generate the full CSS for the Hashmark preset.
 *
 * @param format - 'v3' for Tailwind v3 (@layer base), 'v4' for Tailwind v4 (@theme inline)
 * @returns CSS string ready to paste into globals.css
 */
export function generateHashmarkCss(format: 'v3' | 'v4' = 'v4'): string {
  const vars = Object.entries(hashmarkVariables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  if (format === 'v4') {
    const themeVars = [
      '  --color-background: var(--background);',
      '  --color-foreground: var(--foreground);',
      '  --color-card: var(--card);',
      '  --color-card-foreground: var(--card-foreground);',
      '  --color-popover: var(--popover);',
      '  --color-popover-foreground: var(--popover-foreground);',
      '  --color-primary: var(--primary);',
      '  --color-primary-foreground: var(--primary-foreground);',
      '  --color-secondary: var(--secondary);',
      '  --color-secondary-foreground: var(--secondary-foreground);',
      '  --color-muted: var(--muted);',
      '  --color-muted-foreground: var(--muted-foreground);',
      '  --color-accent: var(--accent);',
      '  --color-accent-foreground: var(--accent-foreground);',
      '  --color-destructive: var(--destructive);',
      '  --color-destructive-foreground: var(--destructive-foreground);',
      '  --color-border: var(--border);',
      '  --color-input: var(--input);',
      '  --color-ring: var(--ring);',
      '  --color-success: var(--success);',
      '  --color-success-foreground: var(--success-foreground);',
      '  --color-warning: var(--warning);',
      '  --color-warning-foreground: var(--warning-foreground);',
      '  --color-info: var(--info);',
      '  --color-info-foreground: var(--info-foreground);',
      '  --color-chart-1: var(--chart-1);',
      '  --color-chart-2: var(--chart-2);',
      '  --color-chart-3: var(--chart-3);',
      '  --color-chart-4: var(--chart-4);',
      '  --color-chart-5: var(--chart-5);',
      '  --font-mono: var(--font-geist-mono);',
      '  --font-sans: var(--font-geist-sans);',
      '  --font-body: var(--font-mono);',
      '  --radius-sm: calc(var(--radius) + 2px);',
      '  --radius-md: calc(var(--radius) + 4px);',
      '  --radius-lg: calc(var(--radius) + 6px);',
      '  --radius-xl: calc(var(--radius) + 8px);',
      '  --radius-dynamic: var(--radius);',
    ].join('\n');

    return `@import "tailwindcss";

:root {
${vars}
}

@theme inline {
${themeVars}
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-mono), ui-monospace, monospace;
}

::selection {
  background: var(--accent);
  color: var(--background);
}
`;
  }

  // Tailwind v3 format
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
${vars}
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: ui-monospace, monospace;
  }
}
`;
}

export default hashmarkVariables;
