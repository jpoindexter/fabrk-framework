/**
 * Chart Color Fallback System
 *
 * Provides fallback colors for chart libraries that require hex values
 * before CSS variables are available. Centralizes the 10 instances of
 * hardcoded chart colors found during design system audit.
 *
 * Usage:
 * ```tsx
 * import { getChartColors } from '@fabrk/design-system';
 *
 * const colors = getChartColors();
 * // Returns CSS variables if available, fallbacks otherwise
 * ```
 */

/**
 * Fallback hex colors for charts (used before CSS variables load)
 * These match the default Green CRT theme
 */
export const CHART_FALLBACK_COLORS = [
  '#6366f1', // Indigo (chart-1 equivalent)
  '#8b5cf6', // Purple (chart-2 equivalent)
  '#22c55e', // Green (chart-3 equivalent)
  '#eab308', // Yellow (chart-4 equivalent)
  '#ef4444', // Red (chart-5 equivalent)
  '#64748b', // Slate (chart-6 equivalent)
  '#3b82f6', // Blue (chart-7 equivalent)
  '#f97316', // Orange (chart-8 equivalent)
  '#10b981', // Emerald (chart-9 equivalent)
] as const;

/**
 * Get chart colors from CSS variables, with fallback to hex
 *
 * @returns Array of color values (CSS vars if available, hex as fallback)
 */
export function getChartColors(): string[] {
  // Server-side: return fallbacks
  if (typeof window === 'undefined') {
    return [...CHART_FALLBACK_COLORS];
  }

  try {
    // Try to get CSS variables from document root
    const style = getComputedStyle(document.documentElement);

    const cssVarColors = [
      style.getPropertyValue('--chart-1').trim(),
      style.getPropertyValue('--chart-2').trim(),
      style.getPropertyValue('--chart-3').trim(),
      style.getPropertyValue('--chart-4').trim(),
      style.getPropertyValue('--chart-5').trim(),
      style.getPropertyValue('--chart-6').trim(),
      style.getPropertyValue('--chart-7').trim(),
      style.getPropertyValue('--chart-8').trim(),
      style.getPropertyValue('--chart-9').trim(),
    ];

    // Check if we got valid CSS variables (all have OKLCH values)
    const hasValidCSSVars = cssVarColors.every((color) => color && color.includes('%'));

    if (hasValidCSSVars) {
      // Wrap OKLCH values in oklch()
      return cssVarColors.map((color) => `oklch(${color})`);
    }

    // Fallback to hex colors if CSS vars not ready
    return [...CHART_FALLBACK_COLORS];
  } catch {
    // On error, return fallback colors
    return [...CHART_FALLBACK_COLORS];
  }
}

/**
 * Get a specific chart color by index
 *
 * @param index - Color index (0-8)
 * @returns Color value (CSS var if available, hex as fallback)
 */
export function getChartColor(index: number): string {
  const colors = getChartColors();
  return colors[index % colors.length] || CHART_FALLBACK_COLORS[0];
}

/**
 * Get chart colors as CSS variable references
 * Useful for Tailwind classes
 *
 * @returns Array of CSS variable references
 */
export function getChartColorVars(): string[] {
  return [
    'oklch(var(--chart-1))',
    'oklch(var(--chart-2))',
    'oklch(var(--chart-3))',
    'oklch(var(--chart-4))',
    'oklch(var(--chart-5))',
    'oklch(var(--chart-6))',
    'oklch(var(--chart-7))',
    'oklch(var(--chart-8))',
    'oklch(var(--chart-9))',
  ];
}
