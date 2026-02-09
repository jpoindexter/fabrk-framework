/**
 * CSS Presets
 *
 * Pre-built CSS variable sets for different project aesthetics.
 * These provide the CSS variables that FABRK components need to work.
 *
 * Usage:
 * ```ts
 * import { generateHashmarkCss, hashmarkVariables } from '@fabrk/design-system';
 *
 * // Get full CSS string for Tailwind v4 project
 * const css = generateHashmarkCss('v4');
 *
 * // Or access individual variable values
 * console.log(hashmarkVariables['--accent']); // '#10b981'
 * ```
 */

export {
  hashmarkVariables,
  generateHashmarkCss,
} from './hashmark';

export type { } from './hashmark';
