import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      all: true,
      include: [
        'src/utils/**/*.ts',
        'src/config.ts',
      ],
      exclude: [
        '**/*.d.ts',
        'dist/**',
        'node_modules/**',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
      reportsDirectory: 'coverage',
      reporter: ['text-summary', 'html', 'lcov'],
    },
  },
});

