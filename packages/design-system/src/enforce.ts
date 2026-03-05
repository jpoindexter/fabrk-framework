/**
 * Design system enforcement utilities.
 *
 * Provides `checkDesignTokens()` for validating that className strings use semantic
 * design tokens instead of hardcoded Tailwind color classes. Used by the FABRK Vite
 * plugin (dev-time warnings), the ESLint rule, and optional CI checks.
 */

export interface DesignTokenViolation {
  /** The full class name that violated the rule, including any responsive/state prefix. */
  class: string;
  /** Human-readable suggestion for a semantic replacement. */
  suggestion?: string;
}

// Tailwind named colors that must not appear in className strings.
const HARDCODED_COLORS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
];

// Tailwind utility prefixes that carry color information.
const COLOR_PREFIXES = [
  'bg', 'text', 'border', 'ring', 'fill', 'stroke',
  'outline', 'decoration', 'caret', 'divide',
  'from', 'via', 'to',
];

// Matches classes like bg-blue-500, text-gray-100, border-red-300, etc.
// Also matches arbitrary values: bg-[#ff0000].
const HARDCODED_CLASS_RE = new RegExp(
  `^(?:${COLOR_PREFIXES.join('|')})-(?:${HARDCODED_COLORS.join('|')})-(?:\\d+|\\[.+\\])$`
);

// Matches bare color specifiers: bg-white, text-black, border-white, etc.
const BARE_COLOR_RE = /^(bg|text|border|ring)-(white|black)$/;

// Semantic token suggestions per utility prefix.
const SUGGESTIONS: Partial<Record<string, string>> = {
  'bg-': 'use bg-background, bg-card, bg-muted, bg-primary, bg-secondary, bg-accent, bg-destructive',
  'text-': 'use text-foreground, text-muted-foreground, text-primary, text-destructive, text-success',
  'border-': 'use border-border, border-primary, border-input, border-destructive',
  'ring-': 'use ring-ring, ring-primary',
  'fill-': 'use fill-primary or a CSS variable',
  'stroke-': 'use stroke-primary or a CSS variable',
  'from-': 'use CSS variable gradients or semantic tokens',
  'via-': 'use CSS variable gradients or semantic tokens',
  'to-': 'use CSS variable gradients or semantic tokens',
};

/**
 * Check a className string for hardcoded Tailwind color classes.
 *
 * Strips responsive/state prefixes (e.g. `sm:`, `hover:`, `dark:`) before checking.
 * Returns an empty array when all classes are design-system compliant.
 *
 * @example
 * checkDesignTokens('bg-blue-500 text-white p-4')
 * // → [
 * //   { class: 'bg-blue-500', suggestion: 'use bg-primary, ...' },
 * //   { class: 'text-white',  suggestion: 'use text-foreground, ...' },
 * // ]
 */
export function checkDesignTokens(className: string): DesignTokenViolation[] {
  const violations: DesignTokenViolation[] = [];

  for (const cls of className.split(/\s+/)) {
    if (!cls) continue;

    // Strip all variant prefixes (sm:, hover:, focus:, dark:, group-hover:, etc.)
    const base = cls.replace(/^(?:[a-zA-Z0-9_-]+:)+/, '');

    if (HARDCODED_CLASS_RE.test(base) || BARE_COLOR_RE.test(base)) {
      const prefix = (base.match(/^[a-z]+/) ?? [''])[0] + '-';
      violations.push({ class: cls, suggestion: SUGGESTIONS[prefix] });
    }
  }

  return violations;
}

/**
 * Returns true when the given class string has no hardcoded color classes.
 */
export function isDesignSystemCompliant(className: string): boolean {
  return checkDesignTokens(className).length === 0;
}
