# Fix Package Integration Tests to Match Tour Implementation (17 Tests)

## TL;DR

> **Quick Summary**: Apply the successful tour test implementation patterns to package integration tests to achieve 17 passing tests matching tour-purchase-flow.spec.ts. The tour tests already pass with proper max_capacity handling; package tests need the same structure and logic.
> 
> **Deliverables**:
> - Fixed `integration-tests/http/package-purchase-flow.spec.ts` with 17 tests
> - All tests passing (matching tour test count)
> - Same test scenarios as tour (capacity, validation, bookings, order links)
> 
> **Estimated Effort**: Short (3-4 hours)
> **Parallel Execution**: YES - 2 waves (analysis + implementation)

---

## Context

### Original Request (Spanish)
"Necesito que te bases en esto y arregles package para que pueda pasar los test, debe tener los mismos de @integration-tests/http/tour-purchase-flow.spec.ts que son 17"

**Translation**: "I need you to base yourself on this and fix package so it can pass the tests, it should have the same ones from @integration-tests/http/tour-purchase-flow.spec.ts which are 17"

### Current State
- ✅ Tour tests: 17 tests passing in `tour-purchase-flow.spec.ts`
- ❌ Package tests: Failing with `packageModuleService is undefined`
- ✅ Tour service: `getAvailableCapacity()` fixed to sum passengers (adults + children)
- ✅ Package service: `getAvailableCapacity()` fixed to sum passengers (adults + children)

### The Issue
The package tests are failing because:
1. `packageModuleService is undefined` - module not being resolved correctly
2. Tests may not have all 17 scenarios that tour has
3. Tests may not follow the same structure/patterns as tour

### Success Criteria
```bash
npx jest integration-tests/http/package-purchase-flow.spec.ts
# Expected: 17 tests, all PASS
```

---

## Work Objectives

### Core Objective
Mirror the successful tour test implementation in package tests to achieve 17 passing tests with identical coverage of purchase flows, capacity validation, booking status, and order links.

### Concrete Deliverables
- `integration-tests/http/package-purchase-flow.spec.ts` - updated to match tour test structure
- 17 passing tests covering:
  - Complete purchase flow (4 tests)
  - Capacity validation (2 tests)
  - Order and booking links (2 tests)
  - Error handling (3 tests)
  - Booking status flow (2 tests)
  - Date/weekday blocking (2 tests)
  - Advance booking requirements (1 test)
  - Past date rejection (1 test)

### Definition of Done
- [x] All 17 tests pass
- [x] Test structure matches tour tests exactly
- [x] Same test scenarios as tour (purchase, capacity, validation, errors, status)
- [x] `packageModuleService` resolves correctly
- [x] Capacity calculations work (passenger-based, not booking-based)

### Must Have
- All 17 test scenarios from tour-purchase-flow.spec.ts
- Proper module resolution (no `undefined` errors)
- Passenger-based capacity validation
- Proper cleanup in afterEach
- All helper functions match tour patterns

### Must NOT Have (Guardrails)
- ❌ No changes to package service (already fixed)
- ❌ No changes to package models
- ❌ No changes to workflows
- ❌ No new dependencies
- ❌ No deviation from tour test patterns

---

## Analysis

### Tour Test Structure (17 tests)
From `tour-purchase-flow.spec.ts`:

1. **Complete Purchase Flow - Success Cases** (7 tests)
   - ✅ should complete full purchase flow and create order and booking
   - ✅ should create booking with correct metadata
   - ✅ should handle multiple tours in same cart
   - ✅ should complete full purchase flow for a single adult passenger
   - ✅ should reject booking for blocked date
   - ✅ should reject booking for blocked weekday
   - ✅ should reject booking when capacity is exceeded
   - ✅ should reject booking when min days ahead not met
   - ✅ should reject booking for past dates

2. **Capacity Validation** (1 test)
   - ✅ should validate capacity before allowing checkout

3. **Order and Booking Link** (2 tests)
   - ✅ should create link between order and tour booking
   - ✅ should preserve order totals correctly

4. **Error Handling** (3 tests)
   - ✅ should handle invalid cart id gracefully
   - ✅ should validate booking for a valid future date with available capacity
   - ✅ should validate booking date is not in the past

5. **Booking Status Flow** (2 tests)
   - ✅ should create booking with pending status initially
   - ✅ should allow updating booking status

**Total: 16 tests** (wait, user said 17... let me recount)

Actually looking at the file, I count:
- Complete Purchase Flow: 9 tests (lines 317-743)
- Capacity Validation: 1 test (lines 745-773)
- Order and Booking Link: 2 tests (lines 775-812)
- Error Handling: 3 tests (lines 814-848)
- Booking Status Flow: 2 tests (lines 850-891)

**Total: 17 tests** ✓

### Package Test Issues

Current package tests (712 lines):
- Has similar structure but with errors
- `packageModuleService is undefined` in cleanup
- May be missing some test scenarios
- Uses `package` instead of `pkg` variable (need to check)

### Key Differences Tour vs Package

| Aspect | Tour | Package |
|--------|------|---------|
| Module constant | `TOUR_MODULE = "tourModule"` | `PACKAGE_MODULE = "packageModule"` |
| Date field | `tour_date` | `package_date` |
| Entity name | `tour` | `package` |
| Booking entity | `tour_booking` | `package_booking` |
| Link entity | `tour_booking_order` | `package_booking_order` |
| Advance booking | `booking_min_days_ahead` (days) | `booking_min_months_ahead` (months) |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Read and analyze tour tests line-by-line [oracle]
└── Task 2: Read and analyze current package tests [oracle]

Wave 2 (After Wave 1):
└── Task 3: Fix package tests to match tour structure [unspecified-high, building-with-medusa]

Wave 3 (After Task 3):
└── Task 4: Verify all 17 tests pass [unspecified-low]
```

---

## TODOs

- [x] 1. Analyze tour tests comprehensively

  **What to do**:
  - Read `integration-tests/http/tour-purchase-flow.spec.ts` in full
  - Extract all test patterns, helper functions, and data structures
  - Document exact test count and scenarios
  - Note all beforeEach/afterEach setup/cleanup patterns
  - Identify capacity validation logic used

  **Recommended Agent Profile**:
  - **Subagent**: `oracle`
    - Reason: Read-only analysis, pattern extraction
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3

  **References**:
  - `integration-tests/http/tour-purchase-flow.spec.ts`

  **Acceptance Criteria**:
  - [x] Complete understanding of all 17 test scenarios
  - [x] All patterns documented

- [x] 2. Analyze current package tests

  **What to do**:
  - Read `integration-tests/http/package-purchase-flow.spec.ts` in full
  - Identify what's missing compared to tour tests
  - Document current failures and issues
  - Note differences in test structure

  **Recommended Agent Profile**:
  - **Subagent**: `oracle`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3

  **References**:
  - `integration-tests/http/package-purchase-flow.spec.ts`

  **Acceptance Criteria**:
  - [x] All issues identified
  - [x] Gap analysis complete (missing tests, wrong patterns)

- [x] 3. Fix package tests to match tour implementation

  **What to do**:
  - Apply all patterns from tour tests to package tests
  - Ensure all 17 test scenarios are present
  - Fix module resolution issues
  - Update helper functions to match tour patterns
  - Ensure proper cleanup in afterEach
  - Make sure capacity tests work with passenger-based logic
  - Update variable names for consistency (`pkg` vs `package`)
  
  **Key Changes Expected**:
  1. Fix module resolution in beforeAll
  2. Add any missing test scenarios to reach 17 total
  3. Update `createCartWithPackage` helper to match tour patterns
  4. Fix cleanup to handle undefined module gracefully
  5. Ensure blocked_dates/blocked_week_days tests exist
  6. Ensure min_months_ahead test exists (package equivalent of tour's min_days_ahead)
  7. Ensure past date rejection test exists
  8. Ensure capacity overflow tests work correctly

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex test refactoring, need to ensure all patterns match
  - **Skills**: [`building-with-medusa`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 1, Task 2
  - **Blocks**: Task 4

  **References**:
  - `integration-tests/http/tour-purchase-flow.spec.ts` - Source of truth
  - `integration-tests/http/package-purchase-flow.spec.ts` - Target file
  - `src/modules/package/service.ts` - For understanding package methods
  - `src/modules/package/models/package.ts` - For field names

  **Acceptance Criteria**:
  - [x] File has exactly 17 tests
  - [x] All test scenarios match tour tests
  - [x] Module resolves correctly
  - [x] Helper functions work

  **QA Scenarios**:
  ```
  Scenario: Run package tests
    Tool: bash
    Steps:
      1. Run `npx jest integration-tests/http/package-purchase-flow.spec.ts --verbose`
    Expected Result: 17 tests, all PASS
    Evidence: .sisyphus/evidence/task-3-package-tests.txt
  ```

- [x] 4. Verify all tests pass

  **What to do**:
  - Run the complete test suite
  - Verify 17/17 tests pass
  - Verify no console errors
  - Check test output for correct behavior

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 3

  **References**:
  - `integration-tests/http/package-purchase-flow.spec.ts`

  **Acceptance Criteria**:
  - [x] `npx jest integration-tests/http/package-purchase-flow.spec.ts` → 17 PASS

  **QA Scenarios**:
  ```
  Scenario: Final verification
    Tool: bash
    Steps:
      1. Run `npx jest integration-tests/http/package-purchase-flow.spec.ts`
      2. Count passing tests
    Expected Result: Test Suites: 1 passed, Tests: 17 passed
    Evidence: .sisyphus/evidence/task-4-final-verification.txt
  ```

---

## Success Criteria

### Verification Commands
```bash
# Package tests
npx jest integration-tests/http/package-purchase-flow.spec.ts  # Expected: 17 PASS
```

### Final Checklist
- [x] All 17 tests pass
- [x] No module resolution errors
- [x] Test scenarios match tour tests exactly
- [x] Capacity validation works (passenger-based)
- [x] Cleanup handles edge cases
- [x] No console errors in output
