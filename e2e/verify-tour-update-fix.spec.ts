import { test, expect } from '@playwright/test'

test.describe('Verify Tour update fix (end-to-end)', () => {
  const testTourId = 'e2e_tour_update_fix'
  const apiBase = process.env.PLAYWRIGHT_TEST_BACKEND_URL || 'http://localhost:9000'

  test('updates is_special, booking_min_days_ahead and max_capacity and persists', async ({ page, request }) => {
    console.log('Starting verify-tour-update-fix test')

    const createRes = await request.post(`${apiBase}/admin/tours`, {
      data: {
        id: testTourId,
        destination: 'Testland',
        description: 'E2E test tour',
        duration_days: 1,
        max_capacity: 10,
        product_id: `prod_${testTourId}`,
        is_special: false,
        booking_min_days_ahead: 1,
        blocked_dates: [],
      },
    })

    expect(createRes.ok()).toBeTruthy()
    const created = await createRes.json()
    console.log('Created tour:', created)

    await page.goto('/app/login')
    await page.waitForLoadState('networkidle')

    await page.goto(`/app/tours/${testTourId}`)
    await page.waitForLoadState('networkidle')

    const specialSwitch = page.locator('button[role="switch"]').first()
    if (await specialSwitch.count() > 0) {
      const initial = await specialSwitch.getAttribute('aria-checked')
      if (initial !== 'true') await specialSwitch.click()
    } else {
      const specialCheckbox = page.locator('input[type="checkbox"][name*="special"]').first()
      if (await specialCheckbox.count() > 0) {
        if (!(await specialCheckbox.isChecked())) await specialCheckbox.check()
      }
    }

    const bookingInput = page.locator('input[name*="booking"]').first()
    if (await bookingInput.count() > 0 && !(await bookingInput.isDisabled())) await bookingInput.fill('5')

    const capacityInput = page.locator('input[name*="capacity"]').first()
    if (await capacityInput.count() > 0 && !(await capacityInput.isDisabled())) await capacityInput.fill('12')

    const saveButton = page.locator('button:has-text("Save")').first()
    if (await saveButton.count() > 0) await saveButton.click()
    else await page.keyboard.press('Enter')

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    const fetchRes = await request.get(`${apiBase}/admin/tours/${testTourId}`)
    expect(fetchRes.ok()).toBeTruthy()
    const fetched = await fetchRes.json()
    const updatedTour = fetched.tour || fetched

    console.log('Fetched tour after save:', updatedTour)

    expect(updatedTour.is_special).toBe(true)
    expect(updatedTour.booking_min_days_ahead).toBe(5)
    expect(updatedTour.max_capacity).toBe(12)

    const delRes = await request.delete(`${apiBase}/admin/tours/${testTourId}`)
    if (!delRes.ok()) console.warn('Failed to delete test tour:', await delRes.text())
    else console.log('Deleted test tour')
  })
})
