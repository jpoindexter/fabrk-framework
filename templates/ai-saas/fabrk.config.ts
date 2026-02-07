import { defineFabrkConfig } from '@fabrk/config'

export default defineFabrkConfig({
  framework: {
    runtime: 'nextjs',
    typescript: true,
    srcDir: 'src',
  },
  ai: {
    costTracking: true,
    validation: 'strict',
    providers: ['claude', 'openai'],
    budget: {
      daily: 50,
      monthly: 1000,
    },
  },
  theme: {
    system: 'terminal',
    colorScheme: 'green',
    radius: 'sharp',
  },
  notifications: {
    enabled: true,
  },
})
