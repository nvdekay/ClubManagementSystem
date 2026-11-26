import { expect, test } from '../fixtures'
import { hebeClubId } from '../setup/env'

test.describe('club member', () => {
  test.use({ role: 'member' })

  test('my clubs lists HEBE and opens its member space', async ({ page }) => {
    await page.goto('/workspace/clubs')
    const club = page
      .getByRole('main')
      .getByRole('link', { name: /HEBE Club/ })
      .first()
    await expect(club).toBeVisible()
    await club.click()
    await expect(page).toHaveURL(new RegExp(`/workspace/clubs/${hebeClubId}$`))
    await expect(page.getByRole('heading', { level: 1, name: /HEBE Club/ })).toBeVisible()
  })
})

test.describe('session expiry', () => {
  test.use({ role: 'student' })

  test('a 401 after the session cookie is gone sends the user to /login', async ({
    page,
    context,
    pageIssues,
  }) => {
    // The request that discovers the expired session is answered 401 on purpose.
    pageIssues.allow(/status of 401 \(Unauthorized\)/)
    await page.goto('/student')
    await expect(page.getByRole('heading', { level: 1, name: /^Hi, / })).toBeVisible()

    await context.clearCookies({ name: 'ucms_session' })
    // Client-side navigation: the page is not reloaded, the next API call gets the 401.
    await page.getByRole('link', { name: /^My club proposals/ }).click()
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fworkspace%2Fapplications/)
  })
})
