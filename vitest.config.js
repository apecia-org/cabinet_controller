/**
 * Vitest Configuration
 * Configuration for unit and integration tests
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.js'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
