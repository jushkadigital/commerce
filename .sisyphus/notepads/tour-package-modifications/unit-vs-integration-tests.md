# Learning: Unit vs Integration Tests in Medusa v2

## Date: 2026-02-09

## Issue Identified

User correctly identified that I used `test:integration:modules` script but implemented **unit tests**, not integration tests.

## Key Findings

### Test Types in Medusa v2

| Type | Script | Pattern | Purpose |
|------|--------|---------|---------|
| **Unit Tests** | `test:unit` | `*.unit.spec.[jt]s` | Isolated tests without DB |
| **Integration Tests** | `test:integration:modules` | `src/modules/*/__tests__/**/*.[jt]s` | Tests with real DB using `moduleIntegrationTestRunner` |

### My Mistake

**What I did wrong:**
- Created tests that read file content with `readFileSync`
- Verified model structure using regex/string matching
- Ran tests with `test:integration:modules` script
- Tests were actually unit tests, not integration tests

**Correct approach:**
- Unit tests should use `test:unit` script
- Integration tests should use `moduleIntegrationTestRunner` from `@medusajs/test-utils`
- Integration tests should test the module service with real database operations

## Corrected Actions

### 1. Renamed Tests
```bash
mv src/modules/tour/__tests__/tour-model.test.ts src/modules/tour/__tests__/tour-model.unit.spec.ts
mv src/modules/package/__tests__/package-model.test.ts src/modules/package/__tests__/package-model.unit.spec.ts
```

### 2. Run Correct Script
```bash
npm run test:unit  # For unit tests
npm run test:integration:modules  # For integration tests
```

## What Integration Tests Should Look Like

### Pattern from Medusa Official Docs

```typescript
import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { TOUR_MODULE } from ".."
import TourModuleService from "../service"
import Tour from "../models/tour"

moduleIntegrationTestRunner<TourModuleService>({
  moduleName: TOUR_MODULE,
  moduleModels: [Tour],
  resolve: "./src/modules/tour",
  testSuite: ({ service }) => {
    describe("TourModuleService", () => {
      it("should create a tour with new fields", async () => {
        const tour = await service.createTours({
          name: "Machu Picchu Tour",
          destination: "Machu Picchu",
          max_capacity: 10,
          is_special: true,
          cancellation_deadline_hours: 24,
          booking_min_days_ahead: 3,
          blocked_dates: ["2026-12-25"],
          blocked_week_days: [0, 6],
        })

        expect(tour).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            is_special: true,
            cancellation_deadline_hours: 24,
            booking_min_days_ahead: 3,
          })
        )
      })
    })
  },
})

jest.setTimeout(60 * 1000)
```

## What to Test in Each Type

### Unit Tests (✅ Already Implemented)
- Model field definitions
- Default values
- Model structure
- Pure business logic functions

### Integration Tests (❌ Not Yet Implemented)
- CRUD operations (create, retrieve, update, delete)
- Data persistence in database
- Business logic with real data
- Validations with actual database constraints
- Relationships between entities

## Recommendations

### For Future Work

1. **Create Integration Tests** for Tour and Package services:
   - `src/modules/tour/__tests__/tour-service.spec.ts`
   - `src/modules/package/__tests__/package-service.spec.ts`

2. **Test Scenarios**:
   - Create tour/package with new fields
   - Verify default values are applied
   - Update new fields
   - Test business logic (availability, capacity, etc.)
   - Test blocked dates and week days

3. **Naming Convention**:
   - Unit tests: `*.unit.spec.[jt]s`
   - Integration tests: `*.spec.[jt]s` (in `src/modules/*/__tests__/`)

## References

- [Medusa Docs: Write Tests for Modules](https://docs.medusajs.com/learn/debugging-and-testing/testing-tools/modules-tests)
- [Medusa Docs: Write Integration Tests](https://docs.medusajs.com/learn/debugging-and-testing/testing-tools/integration-tests)
- [Example: Order Module Integration Tests](https://github.com/medusajs/medusa/blob/develop/packages/modules/order/integration-tests/__tests__/returns.spec.ts)

## Commit

`5ec1f60` - fix(tests): rename model tests to unit tests

## Status

✅ **RESOLVED** - Tests correctly renamed to unit tests and running with appropriate script.
