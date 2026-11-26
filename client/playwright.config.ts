import { defineConfig, devices } from '@playwright/test'

import {
  clientDir,
  clientPort,
  clientUrl,
  serveBuild,
  serverDir,
  serverEnv,
  serverPort,
} from './e2e/setup/env'

// E2E_REUSE_SERVERS=1 runs against a stack that is already up (e.g. while writing tests) and
// keeps its database; see e2e/README.md.
const reuseServers = Boolean(process.env.E2E_REUSE_SERVERS)

// End-to-end UI tests: `npm run test:e2e` (not part of `npm run check`). See e2e/README.md.
export default defineConfig({
  testDir: './e2e/tests',
  // *.e2e.ts, so the client's vitest run (*.test.ts) never picks these files up.
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/setup/global-setup.ts',
  globalTeardown: './e2e/setup/global-teardown.ts',
  outputDir: './e2e/test-results',
  // The suite shares one seeded database; tests that write keep to their own records.
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: './e2e/playwright-report', open: 'never' }]],
  use: {
    baseURL: clientUrl,
    locale: 'en-US',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Rebuild and seed the e2e database, then start the API against it. With E2E_SERVE_BUILD the
      // client is built first and served by the API itself (real CSP), so no vite preview runs.
      command: `${serveBuild ? `npm run build -w client --silent && ` : ''}node --import tsx ${clientDir}/e2e/setup/prepare-db.ts && node --import tsx src/main.ts`,
      cwd: serverDir,
      env: serverEnv(),
      url: `http://localhost:${serverPort}/api/v1/health`,
      timeout: 180_000,
      reuseExistingServer: reuseServers,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    ...(serveBuild
      ? []
      : [
          {
            // The production build, served by vite preview with the same /api proxy as the dev server
            // (vite.config.ts reads PORT, and a process env value wins over the root .env).
            command: `npx vite build --logLevel warn && npx vite preview --port ${clientPort} --strictPort`,
            cwd: clientDir,
            env: { PORT: String(serverPort) },
            url: clientUrl,
            timeout: 180_000,
            reuseExistingServer: reuseServers,
            stdout: 'ignore' as const,
            stderr: 'pipe' as const,
          },
        ]),
  ],
})
