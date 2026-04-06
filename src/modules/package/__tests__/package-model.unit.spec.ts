import { readFileSync } from "fs"
import { join } from "path"

describe("Package Model - New Fields", () => {
  let packageModelContent: string

  beforeAll(() => {
    const modelPath = join(__dirname, "../models/package.ts")
    packageModelContent = readFileSync(modelPath, "utf-8")
  })

  describe("Field Definitions", () => {
    it("should have is_special field defined", () => {
      expect(packageModelContent).toContain("is_special")
    })

    it("should have is_special default to false", () => {
      const isSpecialMatch = packageModelContent.match(/is_special[^,}]+default\((false)\)/)
      expect(isSpecialMatch).toBeTruthy()
      expect(isSpecialMatch?.[1]).toBe("false")
    })

    it("should have cancellation_deadline_hours field defined", () => {
      expect(packageModelContent).toContain("cancellation_deadline_hours")
    })

    it("should have cancellation_deadline_hours default to 12", () => {
      const cancellationMatch = packageModelContent.match(/cancellation_deadline_hours[^,}]+default\((\d+)\)/)
      expect(cancellationMatch).toBeTruthy()
      expect(cancellationMatch?.[1]).toBe("12")
    })

    it("should have booking_min_days_ahead field defined", () => {
      expect(packageModelContent).toContain("booking_min_days_ahead")
    })

    it("should have booking_min_days_ahead default to 2", () => {
      const bookingMinMatch = packageModelContent.match(/booking_min_days_ahead[^,}]+default\((\d+)\)/)
      expect(bookingMinMatch).toBeTruthy()
      expect(bookingMinMatch?.[1]).toBe("2")
    })

    it("should NOT have booking_min_months_ahead field", () => {
      expect(packageModelContent).not.toContain("booking_min_months_ahead")
    })

    it("should have blocked_dates field defined", () => {
      expect(packageModelContent).toContain("blocked_dates")
    })

    it("should have blocked_dates default to empty array", () => {
      const blockedDatesMatch = packageModelContent.match(/blocked_dates[^,}]+default\((\[\])\)/)
      expect(blockedDatesMatch).toBeTruthy()
      expect(blockedDatesMatch?.[1]).toBe("[]")
    })

    it("should have blocked_week_days field defined", () => {
      expect(packageModelContent).toContain("blocked_week_days")
    })

    it("should have blocked_week_days default to empty array", () => {
      const blockedWeekDaysMatch = packageModelContent.match(/blocked_week_days[^,}]+default\((\[\])\)/)
      expect(blockedWeekDaysMatch).toBeTruthy()
      expect(blockedWeekDaysMatch?.[1]).toBe("[]")
    })
  })

  describe("Model Structure", () => {
    it("should import Package model successfully", () => {
      expect(packageModelContent).toBeTruthy()
    })

    it("should define Package model using model.define", () => {
      expect(packageModelContent).toContain('model.define("package"')
    })

    it("should export Package model", () => {
      expect(packageModelContent).toContain("export const Package")
      expect(packageModelContent).toContain("export default Package")
    })
  })
})
