import { expect, test } from '../fixtures'
import { hebeClubId } from '../setup/env'

const eventsUrl = `/club/${hebeClubId}/events`
// An Upcoming HEBE event from seed:demo, weeks away, so every leader operation is offered.
const upcomingEvent = 'Đêm diễn HEBE Club #9'

test.describe('club leader workspace (HEBE)', () => {
  test.use({ role: 'leader' })

  test('club events page switches between events, attendance and feedback', async ({ page }) => {
    await page.goto(eventsUrl)
    await expect(page.getByRole('heading', { level: 1, name: 'Club events' })).toBeVisible()
    await expect(page.getByRole('button', { name: upcomingEvent })).toBeVisible()

    const modes = page.getByRole('navigation', { name: 'Club events' })
    await modes.getByRole('link', { name: 'Registration & attendance' }).click()
    await expect(page).toHaveURL(new RegExp(`/club/${hebeClubId}/event-attendance`))
    await expect(
      page.getByRole('heading', { level: 1, name: 'Registration & attendance' }),
    ).toBeVisible()

    await modes.getByRole('link', { name: 'Event feedback' }).click()
    await expect(page).toHaveURL(new RegExp(`/club/${hebeClubId}/event-feedback`))
    await expect(page.getByRole('heading', { level: 1, name: 'Event feedback' })).toBeVisible()

    await modes.getByRole('link', { name: 'Club events' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Club events' })).toBeVisible()
  })

  test('selecting an event opens an operation dialog that closes again', async ({ page }) => {
    await page.goto(eventsUrl)
    await page.getByRole('textbox', { name: 'Search events' }).fill('#9')
    await page.getByRole('button', { name: upcomingEvent }).click()
    await expect(page).toHaveURL(/[?&]event=[0-9a-f]{24}/)

    await page.getByRole('button', { name: 'Reschedule' }).click()
    const dialog = page.getByRole('dialog', { name: 'Reschedule' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Close' }).first().click()
    await expect(dialog).toBeHidden()
  })

  test('event proposal page asks before discarding an imported document', async ({
    page,
    pageIssues,
  }) => {
    // Known issue: paginating the official template, pagedjs (inside the isolated preview frame)
    // throws "Cannot read properties of null (reading 'getAttribute')" from its findElement
    // helper a few times. The preview still finishes and shows every page; the fix belongs in
    // pagedjs, not in this app.
    pageIssues.allow(/reading 'getAttribute'\).*\/assets\/proposalPreview-/)
    await page.goto(`${eventsUrl}/new`)
    await expect(page.getByRole('heading', { level: 1, name: 'New proposal' })).toBeVisible()

    // Import the official template: reading a .docx is what makes the page dirty.
    const template = await page.request.get('/api/v1/events/proposal-template/download')
    expect(template.ok()).toBe(true)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'proposal.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: await template.body(),
    })
    // The document viewer paginates the template in its own frame.
    await expect(page.getByText(/^Page 1 \/ \d+$/)).toBeVisible({ timeout: 30_000 })

    const back = page.getByRole('link', { name: 'Back to club events' })
    await back.click()
    const confirm = page.getByRole('dialog', { name: 'Discard changes?' })
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Cancel' }).last().click()
    await expect(confirm).toBeHidden()
    await expect(page).toHaveURL(new RegExp(`${eventsUrl}/new$`))

    await back.click()
    await page
      .getByRole('dialog', { name: 'Discard changes?' })
      .getByRole('button', { name: 'Leave page' })
      .click()
    await expect(page).toHaveURL(new RegExp(`${eventsUrl}$`))
  })
})
