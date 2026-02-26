/**
 * Shared chart theme colors
 *
 * Single source of truth for all chart color references.
 * Uses CSS custom properties so colors update automatically with theme switching.
 */
export const CHART_COLORS = {
  chart: [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))',
  ],
  muted: 'hsl(var(--muted-foreground))',
  border: 'hsl(var(--border))',
}
