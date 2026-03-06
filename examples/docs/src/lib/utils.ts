/** Server-safe class merging — avoids importing @fabrk/core (client-only) in RSC pages. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
