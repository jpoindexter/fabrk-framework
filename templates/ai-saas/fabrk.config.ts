import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  ai: {
    costTracking: true,
    validation: 'strict',
    providers: ['claude', 'openai'],
    budget: {
      daily: 50,
      monthly: 1000,
    },
  },
  design: {
    theme: 'terminal',
    radius: 'sharp',
  },
  notifications: {
    enabled: true,
  },
})
