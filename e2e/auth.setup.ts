import { test, expect } from '@playwright/test'

test.describe('authentication', () => {
  test('setup', async ({ page }) => {
    const email = process.env.ADMIN_EMAIL || 'admin@medusa-test.com'
    const password = process.env.ADMIN_PASSWORD || 'supersecret'

    await page.goto('/app/login')

    const emailInput = page.getByRole('textbox', { name: 'Email' }).or(page.locator('input[name="email"]'))
    const passwordInput = page.getByPlaceholder('Password').or(page.locator('input[name="password"]'))
    const continueButton = page.getByRole('button', { name: 'Continue with Email' }).or(page.locator('button[type="submit"]'))

    await expect(emailInput).toBeVisible({ timeout: 10000 })
    await emailInput.click()
    await emailInput.fill('')
    await emailInput.pressSequentially(email)

    await expect(passwordInput).toBeVisible({ timeout: 10000 })
    await passwordInput.click()
    await passwordInput.fill('')
    await passwordInput.pressSequentially(password)
    await page.keyboard.press('Tab')

    await expect(continueButton).toBeEnabled({ timeout: 10000 })

    // Submit the login form
    await continueButton.click()

    await page.waitForURL(
      (url) => url.pathname.startsWith('/app/') && url.pathname !== '/app/login',
      { timeout: 15000 }
    )

    // Save storage state for reuse in tests
    await page.context().storageState({ path: 'e2e/.auth/admin.json' })
  })
})
