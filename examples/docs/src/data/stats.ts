/**
 * Single source of truth for all dynamic framework stats shown in the docs site.
 * Update these values here — they propagate to the homepage, sidebar, and mobile nav.
 *
 * FRAMEWORK_VERSION is injected at build time from packages/core/package.json
 * via next.config.mjs so it never goes stale.
 */

export const FRAMEWORK_VERSION =
  process.env.NEXT_PUBLIC_FRAMEWORK_VERSION ?? '0.3.0'

export const STATS = {
  version: FRAMEWORK_VERSION,
  packages: 13,
  components: '109+',
  themes: 18,
  tests: 3221,
} as const
