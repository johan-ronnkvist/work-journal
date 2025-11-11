import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

/**
 * Integration test configuration
 *
 * Runs tests in a real browser using Playwright
 * Tests browser-specific APIs like IndexedDB with actual implementations
 * Slower than unit tests but catches real browser compatibility issues
 *
 * Usage: npm run test:integration
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'integration',
      include: ['src/**/__integration__/**/*.spec.ts'],
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),

      // Use real browser via Playwright
      browser: {
        enabled: true,
        name: 'chromium',
        provider: 'playwright',
        headless: true,

        // Browser-specific configuration
        screenshotFailures: false,
      },

      // Longer timeout for real browser operations
      testTimeout: 10000,
      hookTimeout: 10000,
    },
  }),
)
