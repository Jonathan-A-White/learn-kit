import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'learn-kit/graph': fileURLToPath(new URL('./packages/graph/src/index.ts', import.meta.url)),
      'learn-kit/drill': fileURLToPath(new URL('./packages/drill/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/*/tests/**/*.test.{ts,tsx}', 'tests/*.test.ts', 'scripts/*.test.mjs'],
  },
});
