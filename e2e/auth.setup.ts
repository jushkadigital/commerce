import { test } from '@playwright/test'

test.describe('authentication', () => {
  test('setup', async ({ page }) => {
    const base = process.env.BACKEND_URL || 'http://localhost:9000'
    const email = process.env.ADMIN_EMAIL || 'admin@medusa-test.com'
    const password = process.env.ADMIN_PASSWORD || 'supersecret'

    // Navigate to login page
    await page.goto(`${base}/app/login`)

    // Fill credentials - selectors may need adjustment to match app
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)

    // Submit the login form
    await page.click('button[type="submit"]')

    // Wait for navigation elements that appear after successful login
    await page.waitForSelector('nav a[href="/app/orders"], a[href="/app/products"]', { timeout: 10000 })

    // Save storage state for reuse in tests
    await page.context().storageState({ path: 'e2e/.auth/admin.json' })
  })
})
