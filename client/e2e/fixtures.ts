// Shared test API for every spec: import { test, expect } from '../fixtures'.
// - Each test gets its own client IP (X-Forwarded-For), so the server's per-IP rate limits never
//   leak from one test into the next (the e2e server runs with TRUST_PROXY=1).
// - The page is English and light-themed before any app script runs; the Google Fonts stylesheet
//   is answered empty, so a run never depends on the network.
// - Every page error, console error and failed script/style load fails the test, unless the test
//   declared it expected with `pageIssues.allow(/pattern/)`.
// - `test.use({ role: 'officer' })` signs the browser in with that role's minted session.
import { createHash } from 'node:crypto'

import { test as base, expect } from '@playwright/test'

import { storageStatePath, type Role } from './setup/env'

interface PageIssues {
  /** Marks console errors or failed requests that match as expected for this test. */
  allow(pattern: RegExp): void
}

interface Fixtures {
  role: Role | null
  pageIssues: PageIssues
}

export const test = base.extend<Fixtures>({
  role: [null, { option: true }],
  storageState: async ({ role }, use) => {
    await use(role ? storageStatePath(role) : { cookies: [], origins: [] })
  },
  context: async ({ context }, use, testInfo) => {
    const digest = createHash('sha256').update(testInfo.testId).digest()
    const ip = `10.${digest[0]}.${digest[1]}.${(digest[2]! % 254) + 1}`
    // Only API calls carry the header: on a cross-origin request it would trigger a CORS preflight.
    await context.route('**/api/v1/**', (route) =>
      route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': ip } }),
    )
    // Keep the run hermetic: the web font stylesheet is served empty, so no font is fetched.
    await context.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
    )
    await use(context)
  },
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('locale', 'en')
        window.localStorage.setItem('theme', 'light')
      } catch {
        // Storage can be unavailable on an opaque origin; the defaults are English and light.
      }
    })
    await use(page)
  },
  pageIssues: [
    async ({ page, role }, use) => {
      // A signed-out visitor's session probe is answered 401 by design.
      const allowed: RegExp[] = role ? [] : [/status of 401 .*\/api\/v1\/auth\/me\)$/]
      const issues: string[] = []
      function record(issue: string) {
        if (!allowed.some((pattern) => pattern.test(issue))) {
          issues.push(issue)
        }
      }
      page.on('pageerror', (error) =>
        record(`page error: ${error.message} ${error.stack?.split('\n')[1]?.trim() ?? ''}`),
      )
      page.on('console', (message) => {
        if (message.type() === 'error') {
          record(`console error: ${message.text()} (${message.location().url})`)
        }
      })
      page.on('requestfailed', (request) => {
        // A navigation away cancels in-flight requests; that is not a broken page.
        if (request.failure()?.errorText === 'net::ERR_ABORTED') {
          return
        }
        record(`request failed: ${request.url()} ${request.failure()?.errorText ?? ''}`)
      })
      page.on('response', (response) => {
        const type = response.request().resourceType()
        if (response.status() >= 400 && (type === 'script' || type === 'stylesheet')) {
          record(`chunk load failed: ${response.status()} ${response.url()}`)
        }
      })
      await use({ allow: (pattern) => allowed.push(pattern) })
      expect(issues, 'console errors, page errors or failed loads').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
