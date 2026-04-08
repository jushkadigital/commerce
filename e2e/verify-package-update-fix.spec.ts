import { test, expect } from '@playwright/test'

test.describe('Package update via dashboard UI', () => {
  test('navigates to packages list, opens first package edit modal, and updates fields', async ({ page }) => {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 200)
    const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0')
    const targetDay = String(targetDate.getDate()).padStart(2, '0')
    const targetYear = String(targetDate.getFullYear())
    const targetDisplayDate = `${targetDay}/${targetMonth}/${targetYear}`

    await page.goto('/app/packages')
    await page.waitForLoadState('networkidle')
    console.log('Loaded packages page')

    const e2ePackageId = await page.evaluate(async () => {
      const createResponse = await fetch('/admin/packages', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: `E2E Package ${Date.now()}`,
          description: 'Package created by Playwright for blocked-dates verification',
          duration_days: 1,
          max_capacity: 10,
          is_special: false,
          booking_min_days_ahead: 1,
          blocked_dates: [],
          blocked_week_days: [],
          prices: {
            adult: 100,
            child: 50,
            infant: 0,
            currency_code: 'pen',
          },
        }),
      })

      if (!createResponse.ok) {
        throw new Error(`Failed to create package for test: ${createResponse.status}`)
      }

      const created = await createResponse.json()
      return created.package?.id || null
    })

    expect(e2ePackageId).toBeTruthy()
    console.log('Created package for e2e verification:', e2ePackageId)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('table tbody tr', { state: 'attached', timeout: 15000 })

    const firstRowActionButton = page.locator('table tbody tr').first().locator('button').last()
    await expect(firstRowActionButton).toBeVisible({ timeout: 15000 })
    await firstRowActionButton.click()
    console.log('Opened action menu for first package')

    const editMenuItem = page.getByText('Editar')
    await expect(editMenuItem).toBeVisible({ timeout: 5000 })
    await editMenuItem.click()
    console.log('Clicked Edit to open modal')

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

    const specialSwitch = page.locator('#is-special-package')
    await expect(specialSwitch).toBeVisible({ timeout: 5000 })
    const originalIsSpecialChecked = await specialSwitch.getAttribute('data-state') === 'checked'
    console.log('Original is_special:', originalIsSpecialChecked)

    const capacityInput = page.locator('input[type="number"]').nth(1)
    const originalCapacity = await capacityInput.inputValue()
    console.log('Original max_capacity:', originalCapacity)

    const bookingMinMonthsInput = page.locator('input[type="number"]').nth(2)
    const originalBookingMinMonths = await bookingMinMonthsInput.inputValue()
console.log('Original booking_min_days_ahead:', originalBookingMinMonths)

    const dialog = page.locator('[role="dialog"]')
    const originalBlockedDaysSummary = (await dialog.textContent()) || ''
    console.log('Original blocked days summary:', originalBlockedDaysSummary)

    await specialSwitch.click()
    await page.waitForTimeout(500)
    const toggledState = await specialSwitch.getAttribute('data-state')
    console.log('After toggle, is_special state:', toggledState)

    await capacityInput.fill('15')
    console.log('Set max_capacity to 15')

    await bookingMinMonthsInput.fill('3')
console.log('Set booking_min_days_ahead to 3')

    const mondayButton = page.getByRole('button', { name: 'Lun' })
    const tuesdayButton = page.getByRole('button', { name: 'Mar' })

    if (!originalBlockedDaysSummary.includes('Lunes')) {
      await mondayButton.click()
    }

    const blockedDaysAfterMonday = (await dialog.textContent()) || ''

    if (!blockedDaysAfterMonday.includes('Martes')) {
      await tuesdayButton.click()
    }

    console.log('Ensured blocked week days include Lun and Mar')

    await expect(dialog).toContainText('Lunes')
    await expect(dialog).toContainText('Martes')

    const calendarGroup = page.getByRole('group', { name: 'Calendar Date input' })
    await calendarGroup.getByRole('spinbutton', { name: 'month' }).fill(targetMonth)
    await calendarGroup.getByRole('spinbutton', { name: 'day' }).fill(targetDay)
    await calendarGroup.getByRole('spinbutton', { name: 'year' }).fill(targetYear)
    await page.getByRole('button', { name: 'Add Date' }).click()
    console.log(`Ensured blocked date ${targetDisplayDate}`)

    await expect(page.getByText(targetDisplayDate)).toBeVisible({ timeout: 5000 })

    const nextButton = page.getByRole('button', { name: 'Next' }).filter({ hasNot: page.locator('[disabled]') })
    await nextButton.click()
    console.log('Navigated to pricing step')

    const saveResponsePromise = page.waitForResponse(
      async (resp) => {
        if (resp.url().includes('/admin/packages/') && resp.request().method() === 'POST' && resp.status() === 200) {
          const requestBody = resp.request().postDataJSON()
          console.log('POST payload:', JSON.stringify(requestBody, null, 2))
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
    // Wait explicitly for table rows to be rendered because React Query may refetch
    // networkidle can happen before React has updated the DOM.
    await page.waitForSelector('table tbody tr', { state: 'attached', timeout: 15000 })
    console.log('Page reloaded after save')

    const firstRowActionButtonAfterReload = page.locator('table tbody tr').first().locator('button').last()
    await expect(firstRowActionButtonAfterReload).toBeVisible({ timeout: 15000 })
    await firstRowActionButtonAfterReload.click()

    const editMenuItemAfterReload = page.getByText('Editar')
    await expect(editMenuItemAfterReload).toBeVisible({ timeout: 5000 })
    await editMenuItemAfterReload.click()

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })
    console.log('Reopened edit modal to verify persistence')

    const expectedIsSpecialState = originalIsSpecialChecked ? 'unchecked' : 'checked'
    await expect(page.locator('#is-special-package')).toHaveAttribute('data-state', expectedIsSpecialState)
    console.log('✓ is_special toggled correctly to', expectedIsSpecialState)

    const verifyCapacityInput = page.locator('input[type="number"]').nth(1)
    await expect(verifyCapacityInput).toHaveValue('15')
    console.log('✓ max_capacity persisted as 15')

    const verifyBookingInput = page.locator('input[type="number"]').nth(2)
    await expect(verifyBookingInput).toHaveValue('3')
console.log('✓ booking_min_days_ahead persisted as 3')

    await expect(page.locator('[role="dialog"]')).toContainText('Lunes')
    await expect(page.locator('[role="dialog"]')).toContainText('Martes')
    console.log('✓ blocked_week_days persisted including Lunes y Martes')

    await expect(page.getByText(targetDisplayDate)).toBeVisible({ timeout: 5000 })
    console.log(`✓ blocked_dates persisted including ${targetDisplayDate}`)

    console.log('✅ Package update test completed successfully')
  })
})
