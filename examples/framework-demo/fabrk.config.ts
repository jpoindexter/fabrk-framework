import { defineFabrkConfig } from '@fabrk/framework/fabrk'

export default defineFabrkConfig({
  ai: {
    defaultModel: 'claude-sonnet-4-5',
    budget: { daily: 5.00, perSession: 0.50 },
  },
  security: {
    csrf: true,
    csp: true,
  },
})
