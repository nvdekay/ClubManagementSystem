import { expect, test } from '../fixtures'

test.describe('student workspace', () => {
  test.use({ role: 'student' })

  test('workspace home greets the student and links the student tools', async ({ page }) => {
    await page.goto('/student')
    await expect(page.getByRole('heading', { level: 1, name: /^Hi, / })).toBeVisible()
    await expect(page.getByRole('link', { name: /Club applications/ }).first()).toBeVisible()
  })

  test('club applications list loads and offers a new application', async ({ page }) => {
    await page.goto('/workspace/applications')
    await expect(page.getByRole('heading', { level: 1, name: 'Club applications' })).toBeVisible()
    // Empty on a fresh database; the wizard test below may already have saved a draft.
    await expect(
      page
        .getByText('You have no club applications yet.')
        .or(page.getByRole('main').getByText('Draft').first()),
    ).toBeVisible()
    await page.getByRole('link', { name: 'New club application' }).click()
    await expect(page).toHaveURL(/\/workspace\/applications\/new$/)
  })

  test('application wizard keeps a typed co-founder email across steps', async ({ page }) => {
    await page.goto('/workspace/applications/new')
    await page
      .getByRole('textbox', { name: /^Club name/ })
      .fill(`E2E Wizard Club ${test.info().workerIndex}-${Date.now()}`)
    await page.getByRole('combobox', { name: 'Field' }).click()
    await page.getByRole('option').nth(1).click()

    // Only step 1 opens before the first save; saving creates the draft and moves the URL to it.
    await expect(page.getByRole('button', { name: /Founders & roles/ })).toBeDisabled()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('button', { name: /Founders & roles/ })).toHaveAttribute(
      'aria-current',
      'step',
    )
    await expect(page).toHaveURL(/\/workspace\/applications\/[0-9a-f]{24}$/)
    const email = page.getByRole('textbox', { name: 'Co-founder email' })
    await email.fill('someone.not.added@fpt.edu.vn')

    await page.getByRole('button', { name: /Attachments/ }).click()
    await expect(page.getByRole('button', { name: /Attachments/ })).toHaveAttribute(
      'aria-current',
      'step',
    )
    await expect(email).toBeHidden()

    await page.getByRole('button', { name: /Founders & roles/ }).click()
    await expect(email).toHaveValue('someone.not.added@fpt.edu.vn')
  })
})
