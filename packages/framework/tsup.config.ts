import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/cli.ts',
    'src/fabrk.ts',
    'src/components.ts',
    'src/themes.ts',
    'src/client/use-agent.ts',
    'src/agents/define-agent.ts',
    'src/tools/define-tool.ts',
    'src/build/agents-md.ts',
  ],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  external: [
    'react',
    'react-dom',
    'vite',
    'vinext',
  ],
})
