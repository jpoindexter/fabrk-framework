import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.{ts,tsx}', 'packages/*/e2e/**/*.test.{ts,tsx}'],
    // Component tests need jsdom — they run via packages/components/vitest.config.ts
    exclude: ['**/node_modules/**', '**/dist/**', 'packages/components/src/__tests__/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        '**/index.ts',
      ],
    },
  },
})
