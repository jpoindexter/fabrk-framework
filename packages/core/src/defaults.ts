import type { FabrkConfigInput } from './types'

export function isDev(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any).process?.env?.NODE_ENV
    return !env || env === 'development' || env === 'test'
  } catch {
    return true
  }
}

export function applyDevDefaults(config: FabrkConfigInput): FabrkConfigInput {
  if (!isDev()) return config

  return {
    ...config,
    email: config.email ?? { adapter: 'console' as const },
    storage: config.storage ?? { adapter: 'local' as const },
    security: config.security ?? {
      csrf: { enabled: true },
      csp: { enabled: true },
      rateLimit: { enabled: true },
      auditLog: { enabled: false },
    },
    notifications: config.notifications ?? { enabled: true, persistToDb: false },
    featureFlags: config.featureFlags ?? { enabled: true },
    jobs: config.jobs ?? { enabled: true },
  }
}
