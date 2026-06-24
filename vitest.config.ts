import { defineConfig } from 'vitest/config'

// Scoped to colocated unit tests under src/. The Playwright e2e specs in e2e/
// are intentionally excluded so the two runners never collide.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
  },
})
