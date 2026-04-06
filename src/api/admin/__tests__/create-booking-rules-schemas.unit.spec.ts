import { CreatePackageSchema } from "../packages/route"
import { CreateTourSchema } from "../tours/route"

describe("admin create booking rules schemas", () => {
  it("accepts blocked week day fields for tour creation", () => {
    const parsed = CreateTourSchema.parse({
      destination: "Cusco",
      description: "Tour test",
      duration_days: 2,
      max_capacity: 10,
      is_special: true,
      blocked_dates: ["2026-12-25"],
      blocked_week_days: ["0", "6"],
      cancellation_deadline_hours: 48,
      booking_min_days_ahead: 3,
      prices: {
        adult: 100,
        child: 80,
        infant: 0,
        currency_code: "pen",
      },
    })

    expect(parsed.blocked_week_days).toEqual(["0", "6"])
    expect(parsed.blocked_dates).toEqual(["2026-12-25"])
    expect(parsed.booking_min_days_ahead).toBe(3)
    expect(parsed.is_special).toBe(true)
  })

  it("accepts blocked week day fields for package creation", () => {
    const parsed = CreatePackageSchema.parse({
      destination: "Machu Picchu",
      description: "Package test",
      duration_days: 3,
      max_capacity: 12,
      is_special: false,
      blocked_dates: ["2026-12-31"],
      blocked_week_days: ["1", "5"],
      cancellation_deadline_hours: 24,
      booking_min_days_ahead: 2,
      prices: {
        adult: 120,
        child: 90,
        infant: 0,
        currency_code: "pen",
      },
    })

    expect(parsed.blocked_week_days).toEqual(["1", "5"])
    expect(parsed.blocked_dates).toEqual(["2026-12-31"])
    expect(parsed.booking_min_days_ahead).toBe(2)
    expect(parsed.is_special).toBe(false)
  })
})
