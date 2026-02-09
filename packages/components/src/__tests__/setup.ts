import '@testing-library/jest-dom/vitest'

// Mock ResizeObserver for recharts ResponsiveContainer
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
