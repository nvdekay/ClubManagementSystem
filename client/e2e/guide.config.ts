// Captures the screenshots of the user guide (docs/04-user-guide/images) from the real app:
// `npm run guide:screenshots`. Not part of `npm run test:e2e` or `npm run check`; see guide/README.md.
// It reuses the e2e stack (seeded throwaway database, minted sessions, built client) on its own
// database and ports, set in guide/defaults.ts before the shared env is read.
import './guide/defaults'

import { defineConfig, devices } from '@playwright/test'

import baseConfig from '../playwright.config'
import { clientUrl } from './setup/env'

export default defineConfig({
  ...baseConfig,
  testDir: './guide',
  testMatch: '**/*.guide.ts',
  globalSetup: './guide/global-setup.ts',
  globalTeardown: './setup/global-teardown.ts',
  outputDir: './test-results/guide',
  // Some captures act on shared records (claim a review, open a dialog); one worker keeps the order.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    ...baseConfig.use,
    baseURL: clientUrl,
    locale: 'vi-VN',
    trace: 'retain-on-failure',
    screenshot: 'off',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'guide',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
      },
    },
  ],
})
