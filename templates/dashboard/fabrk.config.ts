import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  framework: {
    runtime: 'nextjs',
    typescript: true,
    srcDir: 'src',
  },
  theme: {
    system: 'terminal',
    colorScheme: 'green',
    radius: 'sharp',
  },
  notifications: {
    enabled: true,
  },
  teams: {
    enabled: true,
    maxMembers: 50,
  },
  featureFlags: {
    enabled: true,
  },
})
