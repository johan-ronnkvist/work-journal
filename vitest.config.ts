import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

/**
 * Unit test configuration
 *
 * Runs tests with jsdom and mocked browser APIs (like fake-indexeddb)
 * Fast execution for rapid feedback during development
 *
 * Usage: npm run test:unit
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/__tests__/**/*.spec.ts'],
      exclude: [...configDefaults.exclude, 'e2e/**', 'src/**/__integration__/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
