import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  external: ['react', '@fabrk/design-system'],
  banner: {
    js: '"use client";',
  },
  sourcemap: true,
})
