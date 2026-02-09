import { readFileSync } from "fs"
import { join } from "path"

describe("Tour Model - New Fields", () => {
  let tourModelContent: string

  beforeAll(() => {
    const modelPath = join(__dirname, "../models/tour.ts")
    tourModelContent = readFileSync(modelPath, "utf-8")
  })

  describe("Field Definitions", () => {
    it("should have is_special field defined", () => {
      expect(tourModelContent).toContain("is_special")
    })

    it("should have is_special default to false", () => {
      const isSpecialMatch = tourModelContent.match(/is_special[^,}]+default\((false)\)/)
      expect(isSpecialMatch).toBeTruthy()
      expect(isSpecialMatch?.[1]).toBe("false")
    })

    it("should have cancellation_deadline_hours field defined", () => {
      expect(tourModelContent).toContain("cancellation_deadline_hours")
    })

    it("should have cancellation_deadline_hours default to 12", () => {
      const cancellationMatch = tourModelContent.match(/cancellation_deadline_hours[^,}]+default\((\d+)\)/)
      expect(cancellationMatch).toBeTruthy()
      expect(cancellationMatch?.[1]).toBe("12")
    })

    it("should have booking_min_days_ahead field defined", () => {
      expect(tourModelContent).toContain("booking_min_days_ahead")
    })

    it("should have booking_min_days_ahead default to 2", () => {
      const bookingMinMatch = tourModelContent.match(/booking_min_days_ahead[^,}]+default\((\d+)\)/)
      expect(bookingMinMatch).toBeTruthy()
      expect(bookingMinMatch?.[1]).toBe("2")
    })

    it("should have blocked_dates field defined", () => {
      expect(tourModelContent).toContain("blocked_dates")
    })

    it("should have blocked_dates default to empty array", () => {
      const blockedDatesMatch = tourModelContent.match(/blocked_dates[^,}]+default\((\[\])\)/)
      expect(blockedDatesMatch).toBeTruthy()
      expect(blockedDatesMatch?.[1]).toBe("[]")
    })

    it("should have blocked_week_days field defined", () => {
      expect(tourModelContent).toContain("blocked_week_days")
    })

    it("should have blocked_week_days default to empty array", () => {
      const blockedWeekDaysMatch = tourModelContent.match(/blocked_week_days[^,}]+default\((\[\])\)/)
      expect(blockedWeekDaysMatch).toBeTruthy()
      expect(blockedWeekDaysMatch?.[1]).toBe("[]")
    })
  })

  describe("Model Structure", () => {
    it("should import Tour model successfully", () => {
      expect(tourModelContent).toBeTruthy()
    })

    it("should define Tour model using model.define", () => {
      expect(tourModelContent).toContain('model.define("tour"')
    })

    it("should export Tour model", () => {
      expect(tourModelContent).toContain("export const Tour")
      expect(tourModelContent).toContain("export default Tour")
    })
  })
})
