/**
 * Internal utility: resolve an environment variable from globalThis.process.env.
 * Works in Node.js, edge runtimes, and browser builds (returns '' when absent).
 */
export function resolveEnv(key: string): string {
  const g = globalThis as Record<string, unknown>
  const proc = g.process as { env?: Record<string, string> } | undefined
  return proc?.env?.[key] || ''
}
