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
})
