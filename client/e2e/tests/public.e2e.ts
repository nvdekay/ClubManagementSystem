import { expect, test } from '../fixtures'
import { hebeClubId } from '../setup/env'

test.describe('public area (signed out)', () => {
  test('home page renders the hero and the club strip', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: /Find your people\.\s*Find your passion\./ }),
    ).toBeVisible()
    await expect(page.locator('#clubs-strip-title')).toBeVisible()
  })

  test('club directory searches and opens a club', async ({ page }) => {
    await page.goto('/clubs')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Clubs and communities' }),
    ).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search clubs' }).fill('HEBE')
    const card = page.getByRole('link', { name: /HEBE Club/ }).first()
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(new RegExp(`/clubs/${hebeClubId}$`))
    await expect(page.getByRole('heading', { level: 1, name: 'HEBE Club' })).toBeVisible()
  })

  test('club detail of an unknown club says it is unavailable', async ({ page, pageIssues }) => {
    // The API answers 404 for the missing club; Chrome logs that response as a console error.
    pageIssues.allow(/status of 404/)
    await page.goto('/clubs/ffffffffffffffffffffffff')
    await expect(page.getByRole('alert')).toHaveText('This page is unavailable.')
    await expect(page.getByRole('link', { name: 'Back to clubs' })).toBeVisible()
  })

  test('an unknown public URL shows the 404 page', async ({ page }) => {
    await page.goto('/no-such-page')
    await expect(
      page.getByRole('heading', { level: 1, name: 'This page is unavailable.' }),
    ).toBeVisible()
  })
})
