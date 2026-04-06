import { test, expect } from '@playwright/test'

test.describe('Tour update via dashboard UI', () => {
  test('navigates to tours list, opens first tour edit modal, and updates fields', async ({ page }) => {
    const tourId = '01KK23VHNZACBZJEX7FFW359QV'

    await page.request.post(`/admin/tours/${tourId}`, {
      data: {
        id: tourId,
        destination: 'Ruta Misterio 4 en 1',
        description: ' Naturaleza y misticismo en un recorrido por esculturas, humedales y paisajes mágicos de Cusco.',
        duration_days: 1,
        max_capacity: 20,
        is_special: false,
        booking_min_days_ahead: 2,
        blocked_dates: [],
        blocked_week_days: [],
        prices: {
          adult: 30,
          child: 0,
          infant: 0,
          currency_code: 'pen',
        },
      },
    })

    await page.goto('/app/tours')
    await page.waitForLoadState('networkidle')
    console.log('Loaded tours page')

    const firstRowActionButton = page.locator('table tbody tr').first().locator('button').last()
    await expect(firstRowActionButton).toBeVisible({ timeout: 15000 })
    await firstRowActionButton.click()
    console.log('Opened action menu for first tour')

    const editMenuItem = page.getByText('Editar')
    await expect(editMenuItem).toBeVisible({ timeout: 5000 })
    await editMenuItem.click()
    console.log('Clicked Edit to open modal')

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

    const specialSwitch = page.locator('#is-special')
    await expect(specialSwitch).toBeVisible({ timeout: 5000 })
    const originalIsSpecialChecked = await specialSwitch.getAttribute('data-state') === 'checked'
    console.log('Original is_special:', originalIsSpecialChecked)

    const capacityInput = page.locator('input[type="number"]').nth(1)
    const originalCapacity = await capacityInput.inputValue()
    console.log('Original max_capacity:', originalCapacity)

    const bookingMinDaysInput = page.locator('input[type="number"]').nth(2)
    const originalBookingMinDays = await bookingMinDaysInput.inputValue()
    console.log('Original booking_min_days_ahead:', originalBookingMinDays)

    const selectedBlockedDaysText = page.locator('p').filter({ hasText: /^Lunes, Martes$/ })
    const originalBlockedDaysSummary = (await page.locator('body').textContent()) || ''
    console.log('Original blocked days summary:', originalBlockedDaysSummary)

    await specialSwitch.click()
    await page.waitForTimeout(500)
    const toggledState = await specialSwitch.getAttribute('data-state')
    console.log('After toggle, is_special state:', toggledState)

    await capacityInput.fill('15')
    console.log('Set max_capacity to 15')

    await bookingMinDaysInput.fill('7')
    console.log('Set booking_min_days_ahead to 7')

    const mondayButton = page.getByRole('button', { name: 'Lun' })
    const tuesdayButton = page.getByRole('button', { name: 'Mar' })

    await mondayButton.click()
    await tuesdayButton.click()
    console.log('Selected blocked week days: Lun, Mar')

    await expect(selectedBlockedDaysText).toBeVisible({ timeout: 5000 })

    const calendarGroup = page.getByRole('group', { name: 'Calendar Date input' })
    await calendarGroup.getByRole('spinbutton', { name: 'month' }).fill('04')
    await calendarGroup.getByRole('spinbutton', { name: 'day' }).fill('08')
    await calendarGroup.getByRole('spinbutton', { name: 'year' }).fill('2026')
    await page.getByRole('button', { name: 'Add Date' }).click()
    console.log('Added blocked date 2026-04-08')

    await expect(page.getByText('08/04/2026')).toBeVisible({ timeout: 5000 })

    const nextButton = page.getByRole('button', { name: 'Next' }).filter({ hasNot: page.locator('[disabled]') })
    await nextButton.click()
    console.log('Navigated to pricing step')

    const saveResponsePromise = page.waitForResponse(
      async (resp) => {
        if (resp.url().includes('/admin/tours/') && resp.request().method() === 'POST' && resp.status() === 200) {
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
    await expect(page.locator('#is-special')).toHaveAttribute('data-state', expectedIsSpecialState)
    console.log('✓ is_special toggled correctly to', expectedIsSpecialState)

    const verifyCapacityInput = page.locator('input[type="number"]').nth(1)
    await expect(verifyCapacityInput).toHaveValue('15')
    console.log('✓ max_capacity persisted as 15')

    const verifyBookingInput = page.locator('input[type="number"]').nth(2)
    await expect(verifyBookingInput).toHaveValue('7')
    console.log('✓ booking_min_days_ahead persisted as 7')

    await expect(page.getByText('Lunes, Martes')).toBeVisible({ timeout: 5000 })
    console.log('✓ blocked_week_days persisted as Lunes, Martes')

    await expect(page.getByText('08/04/2026')).toBeVisible({ timeout: 5000 })
    console.log('✓ blocked_dates persisted as 08/04/2026')

    console.log('✅ Tour update test completed successfully')
  })
})
