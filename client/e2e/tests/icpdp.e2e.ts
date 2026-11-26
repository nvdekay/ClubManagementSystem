import type { Locator } from '@playwright/test'

import { expect, test } from '../fixtures'

// Reads the number a "Label · 12" filter tab shows.
async function tabCount(tab: Locator): Promise<number> {
  const match = /·\s*(\d+)\s*$/.exec((await tab.textContent()) ?? '')
  if (!match) {
    throw new Error(`no count on tab "${await tab.textContent()}"`)
  }
  return Number(match[1])
}

test.describe('ICPDP officer workspace', () => {
  test.use({ role: 'officer' })

  test('dashboard greets the officer and links the review queues', async ({ page }) => {
    await page.goto('/icpdp')
    await expect(page.getByRole('heading', { level: 1, name: /^Hi, / })).toBeVisible()
    await expect(page.getByText('ICPDP workspace').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /School policy/ }).first()).toBeVisible()
  })

  test('event proposal queue opens a proposal review page', async ({ page }) => {
    await page.goto('/workspace/event-proposals')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Event proposal reviews' }),
    ).toBeVisible()
    // Opening a pending proposal claims it for this officer, then shows its review page.
    await page.getByRole('button', { name: /^Open/ }).first().click()
    await expect(page).toHaveURL(/\/workspace\/event-proposals\/[0-9a-f]{24}$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Event proposal')
  })

  test('compliance cases page through the server and show per-tab counts', async ({ page }) => {
    await page.goto('/workspace/violations')
    await expect(page.getByRole('heading', { level: 1, name: 'Compliance cases' })).toBeVisible()
    const tabs = page.getByRole('group', { name: 'Compliance cases' })
    const active = tabs.getByRole('button', { name: /^In progress · \d+$/ })
    const all = tabs.getByRole('button', { name: /^All · \d+$/ })
    await expect(active).toHaveAttribute('aria-pressed', 'true')

    // prepare-db.ts opens 22 cases, so "All" spans more than one page of 20.
    await all.click()
    await expect(all).toHaveAttribute('aria-pressed', 'true')
    const total = await tabCount(all)
    expect(total).toBeGreaterThan(20)
    expect(await tabCount(active)).toBeLessThanOrEqual(total)

    const cases = page.getByRole('link', { name: /Opened / })
    await expect(cases).toHaveCount(20)
    const pages = page.getByRole('navigation', { name: 'Case list pages' })
    await expect(pages.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await pages.getByRole('button', { name: 'Next page' }).click()
    await expect(pages.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(cases).toHaveCount(Math.min(total - 20, 20))

    // Switching tabs starts again from the first page.
    await tabs.getByRole('button', { name: /^Closed · \d+$/ }).click()
    await expect(cases).toHaveCount(
      Math.min(await tabCount(tabs.getByRole('button', { name: /^Closed · \d+$/ })), 20),
    )
  })

  test('event budgets queue filters by stage', async ({ page }) => {
    await page.goto('/workspace/budgets')
    await expect(page.getByRole('heading', { level: 1, name: 'Event budgets' })).toBeVisible()
    const tabs = page.getByRole('group', { name: 'Event budgets' })
    const budgets = page.getByRole('main').getByRole('listitem')
    await expect(tabs.getByRole('button', { name: /^All · \d+$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(budgets.first()).toBeVisible()

    const done = tabs.getByRole('button', { name: /^Completed \/ Cancelled · \d+$/ })
    await done.click()
    await expect(done).toHaveAttribute('aria-pressed', 'true')
    await expect(budgets).toHaveCount(Math.min(await tabCount(done), 20))
    await budgets.first().getByRole('link').click()
    await expect(page).toHaveURL(/\/workspace\/budgets\/[0-9a-f]{24}$/)
  })

  test('suspension requests list the pending HEBE request', async ({ page }) => {
    await page.goto('/workspace/suspension-requests')
    await expect(page.getByRole('heading', { level: 1, name: 'Suspension requests' })).toBeVisible()
    await expect(page.getByText(/E2E suspension request/).first()).toBeVisible()
  })

  test('complaint queue lists the complaints sent to ICPDP', async ({ page }) => {
    await page.goto('/workspace/complaint-review')
    await expect(page.getByRole('heading', { level: 1, name: 'Complaints' })).toBeVisible()
    // seed:demo files three complaints with ICPDP.
    await expect(page.getByRole('button', { name: 'Start review' })).toHaveCount(3)
  })

  test('policy editor switches between its sections', async ({ page }) => {
    await page.goto('/workspace/policy')
    await expect(page.getByRole('heading', { level: 1, name: 'School policy' })).toBeVisible()
    await page
      .getByRole('tablist', { name: 'School policy' })
      .getByRole('tab', { name: /New policy version/ })
      .click()
    const panel = page.getByRole('tabpanel')
    for (const section of [
      'Founding a club',
      'Club profile',
      'Events',
      'Academic year',
      'Reports',
      'Finance & refund',
    ]) {
      const tab = page.getByRole('tab', { name: section, exact: true })
      await tab.click()
      await expect(tab).toHaveAttribute('aria-selected', 'true')
      await expect(panel.getByRole('heading', { level: 3, name: section })).toBeVisible()
    }
  })

  test('periodic reports page filters reports and opens one for review', async ({ page }) => {
    await page.goto('/workspace/periodic-reports')
    await expect(page.getByRole('heading', { level: 1, name: 'Periodic reports' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Semester' })).toHaveText(/Summer 2026/)
    const tabs = page.getByRole('group', { name: 'Periodic reports' })
    const waiting = tabs.getByRole('button', { name: /^Waiting · \d+$/ })
    await waiting.click()
    await expect(waiting).toHaveAttribute('aria-pressed', 'true')
    const review = page.getByRole('link', { name: 'Review' })
    await expect(review).toHaveCount(await tabCount(waiting))
    await review.first().click()
    await expect(page).toHaveURL(/\/workspace\/periodic-reports\/[0-9a-f]{24}$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
