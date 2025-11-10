import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      all: true,
      include: [
        'src/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        'dist/**',
        'node_modules/**',
        'src/types.ts', // Type definitions only
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
      reportsDirectory: 'coverage',
      reporter: ['text-summary', 'html', 'lcov', 'json'],
    },
  },
});

