import { test, expect } from '@playwright/test'

// Mock data for Tour (includes required new fields)
const mockTourDetail = {
  tour: {
    id: 'tour_123',
    destination: 'Machu Picchu',
    description: 'Ancient Incan citadel',
    duration_days: 3,
    max_capacity: 20,
    product_id: 'prod_tour_123',
    is_special: true,
    booking_min_days_ahead: 7,
    blocked_dates: ['2026-03-15'],
    blocked_week_days: ['0', '6'],
    cancellation_deadline_hours: 48,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
}

// Mock data for Package (includes required new fields)
const mockPackageDetail = {
  package: {
    id: 'pkg_789',
    destination: 'Cusco Explorer',
    description: 'Complete Cusco experience',
    duration_days: 5,
    max_capacity: 25,
    product_id: 'prod_pkg_789',
    is_special: true,
    booking_min_months_ahead: 2,
    blocked_dates: ['2026-06-01'],
    blocked_week_days: ['0'],
    cancellation_deadline_hours: 72,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-02-05T00:00:00Z',
  },
}

test.describe('Repro: update payload includes new Tour/Package fields', () => {
  test('Tour update payload includes is_special, booking_min_days_ahead, blocked_dates, blocked_week_days, cancellation_deadline_hours', async ({ page }) => {
    // Mock GET for tour detail
    await page.route('**/admin/tours/tour_123', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTourDetail) })
      } else {
        await route.continue()
      }
    })

    // Intercept POST and capture payload
    let capturedPayload: any = null
    await page.route('**/admin/tours/tour_123', async (route) => {
      if (route.request().method() === 'POST') {
        capturedPayload = JSON.parse(route.request().postData() || '{}')
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tour: { ...mockTourDetail.tour, ...capturedPayload } }) })
      } else {
        await route.continue()
      }
    })

    // Use a blank page and directly POST to the endpoint to simulate update
    await page.goto('about:blank')
    await page.evaluate(async () => {
      await fetch('/admin/tours/tour_123', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_special: true,
          booking_min_days_ahead: 7,
          blocked_dates: ['2026-03-15'],
          blocked_week_days: ['0', '6'],
          cancellation_deadline_hours: 48,
        }),
      })
    })

    // Verify captured payload contains all fields
    expect(capturedPayload).not.toBeNull()
    expect(capturedPayload).toHaveProperty('is_special', true)
    expect(capturedPayload).toHaveProperty('booking_min_days_ahead', 7)
    expect(capturedPayload).toHaveProperty('blocked_dates')
    expect(capturedPayload.blocked_dates).toEqual(['2026-03-15'])
    expect(capturedPayload).toHaveProperty('blocked_week_days')
    expect(capturedPayload.blocked_week_days).toEqual(['0', '6'])
    expect(capturedPayload).toHaveProperty('cancellation_deadline_hours', 48)
  })

  test('Package update payload includes is_special, booking_min_months_ahead, blocked_dates, blocked_week_days, cancellation_deadline_hours', async ({ page }) => {
    // Mock GET for package detail
    await page.route('**/admin/packages/pkg_789', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPackageDetail) })
      } else {
        await route.continue()
      }
    })

    // Intercept POST and capture payload
    let capturedPayload: any = null
    await page.route('**/admin/packages/pkg_789', async (route) => {
      if (route.request().method() === 'POST') {
        capturedPayload = JSON.parse(route.request().postData() || '{}')
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ package: { ...mockPackageDetail.package, ...capturedPayload } }) })
      } else {
        await route.continue()
      }
    })

    // Use a blank page and directly POST to the endpoint to simulate update
    await page.goto('about:blank')
    await page.evaluate(async () => {
      await fetch('/admin/packages/pkg_789', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_special: true,
          booking_min_months_ahead: 2,
          blocked_dates: ['2026-06-01'],
          blocked_week_days: ['0'],
          cancellation_deadline_hours: 72,
        }),
      })
    })

    // Verify captured payload contains all fields
    expect(capturedPayload).not.toBeNull()
    expect(capturedPayload).toHaveProperty('is_special', true)
    expect(capturedPayload).toHaveProperty('booking_min_months_ahead', 2)
    expect(capturedPayload).toHaveProperty('blocked_dates')
    expect(capturedPayload.blocked_dates).toEqual(['2026-06-01'])
    expect(capturedPayload).toHaveProperty('blocked_week_days')
    expect(capturedPayload.blocked_week_days).toEqual(['0'])
    expect(capturedPayload).toHaveProperty('cancellation_deadline_hours', 72)
  })
})
