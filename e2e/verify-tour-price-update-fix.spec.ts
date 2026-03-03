import { test, expect } from '@playwright/test'

test.describe('Tour price update via dashboard UI', () => {
  test('navigates to tours list, opens first tour edit modal, updates prices in pricing step, and verifies persistence', async ({ page }) => {
    await page.goto('/app/tours')
    await page.waitForLoadState('networkidle')
    console.log('Loaded tours page')

    // Open first tour for editing
    const firstRowActionButton = page.locator('table tbody tr').first().locator('button').last()
    await expect(firstRowActionButton).toBeVisible({ timeout: 15000 })
    await firstRowActionButton.click()
    console.log('Opened action menu for first tour')

    const editMenuItem = page.getByText('Editar')
    await expect(editMenuItem).toBeVisible({ timeout: 5000 })
    await editMenuItem.click()
    console.log('Clicked Edit to open modal')

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

    // Skip details step and go to pricing step
    const nextButton = page.getByRole('button', { name: 'Next' }).filter({ hasNot: page.locator('[disabled]') })
    await nextButton.click()
    console.log('Navigated to pricing step')

    // Wait for pricing step to load
    await page.waitForTimeout(1000)

    // Get the original price from the first integer input (adult national price)
    const adultPriceInput = page.locator('input[type="number"]').first()
    await expect(adultPriceInput).toBeVisible({ timeout: 5000 })
    const originalPrice = await adultPriceInput.inputValue()
    console.log('Original adult price:', originalPrice)

    // Set a new price (using 99.99 as a test value)
    await adultPriceInput.fill('99.99')
    console.log('Set adult price to 99.99')

    // Wait for the "magic" logic to update the store price as well
    await page.waitForTimeout(500)

    // Save changes
    const saveResponsePromise = page.waitForResponse(
      async (resp) => {
        if (resp.url().includes('/admin/tours/') && resp.request().method() === 'POST' && resp.status() === 200) {
          const requestBody = resp.request().postDataJSON()
          console.log('POST payload with prices:', JSON.stringify(requestBody, null, 2))
          return true
        }
        return false
      },
      { timeout: 30000 }
    )

    const saveButton = page.locator('button:has-text("Save Changes")')
    await expect(saveButton).toBeVisible({ timeout: 5000 })
    await saveButton.click()
    console.log('Clicked Save Changes, waiting for response...')

    const saveResponse = await saveResponsePromise
    console.log('Save response status:', saveResponse.status())

    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10000 })
    console.log('Modal closed after save')

    // Reload page to verify persistence
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('table tbody tr', { state: 'attached', timeout: 15000 })
    console.log('Page reloaded after save')

    // Click outside to close any open action menus
    await page.click('body')
    await page.waitForTimeout(300)

    // Reopen the edit modal
    const firstRowActionButtonAfterReload = page.locator('table tbody tr').first().locator('button').last()
    await expect(firstRowActionButtonAfterReload).toBeVisible({ timeout: 15000 })
    await firstRowActionButtonAfterReload.click()
    await page.waitForTimeout(300)

    const editMenuItemAfterReload = page.getByText('Editar')
    await expect(editMenuItemAfterReload).toBeVisible({ timeout: 5000 })
    await editMenuItemAfterReload.click()

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })
    console.log('Reopened edit modal to verify persistence')

    // Skip to pricing step
    const nextButtonAfterReload = page.getByRole('button', { name: 'Next' }).filter({ hasNot: page.locator('[disabled]') })
    await nextButtonAfterReload.click()
    console.log('Navigated to pricing step after reload')

    await page.waitForTimeout(1000)

    // Verify the price persisted
    const verifyPriceInput = page.locator('input[type="number"]').first()
    await expect(verifyPriceInput).toHaveValue('99.99')
    console.log('✓ Adult price persisted as 99.99')

    console.log('✅ Tour price update test completed successfully')
  })
})
