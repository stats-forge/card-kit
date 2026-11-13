import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom costs more than the tests it hosts; vmThreads builds it once per worker, isolation intact
    pool: 'vmThreads',
    environment: 'jsdom',
    include: ['./tests/*.spec.ts'],
    setupFiles: ['./tests/_setup.ts'],
    coverage: {
      // every source file, so one no test imports counts as uncovered rather than unseen
      include: ['src/**/*.ts'],
      // floors just under what the suite reaches, so a drop fails CI
      thresholds: { lines: 96, statements: 96, functions: 97, branches: 86 },
    },
  },
});
