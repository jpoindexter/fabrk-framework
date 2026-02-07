import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  design: {
    theme: 'terminal',
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
