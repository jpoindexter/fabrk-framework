import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/cli.ts',
    'src/fabrk.ts',
    'src/components.ts',
    'src/themes.ts',
    'src/client/use-agent.ts',
    'src/client/navigation.ts',
    'src/client/link.tsx',
    'src/client/image.tsx',
    'src/client/dynamic.ts',
    'src/client/script.ts',
    'src/agents/define-agent.ts',
    'src/tools/define-tool.ts',
    'src/build/agents-md.ts',
    'src/runtime/worker-entry.ts',
  ],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  external: [
    'react',
    'react-dom',
    'react-server-dom-webpack',
    'vite',
    '@vitejs/plugin-rsc',
    'rsc-html-stream',
  ],
})
