# Issues: Package Tests Parity Fix

## Session: Initial Session
**Started**: 2026-02-18

---

## Known Issues

1. packageModuleService is undefined during test cleanup
2. Package tests may not have all 17 scenarios that tour has
3. Tests structure may differ from tour patterns

---

## Task 2 Findings (2026-02-18): `integration-tests/http/package-purchase-flow.spec.ts`

### Current test inventory
- **`it(...)` count:** 12 (tour has 17 → **missing 5**)
- **Describe blocks (6):**
  1) `Package Purchase Flow E2E`
  2) `Complete Purchase Flow`
  3) `Capacity Validation`
  4) `Order and Booking Link`
  5) `Error Handling`
  6) `Booking Status Flow`

### Issues observed (vs tour test patterns)
1) **`packageModuleService` can be `undefined` → cleanup fails/noisy**
   - `afterEach` calls `packageModuleService.*` inside a try/catch; if module resolution fails, cleanup logs `Cleanup error:` and may leave data behind.
   - This matches the known failure mode: “packageModuleService is undefined during test cleanup”.

2) **Capacity assertions still assume bookings-based counting**
   - Happy path asserts remaining capacity is `packageCapacity - 1` and even comments “service counts bookings, not passengers”.
   - Tour parity is passenger-based (adults + children; infants excluded). With `createCartWithPackage(..., 2)` capacity should reduce by **2**, not 1.

3) **`createCartWithPackage` helper diverges heavily from tour helper**
   - Creates **one cart line** regardless of passenger breakdown (tour creates one line per passenger type present, grouped by a `group_id`).
   - Keeps `unit_price: 100` even when `passengerCount > 1` → totals likely undercharged vs passenger count.
   - No `group_id` set in metadata (tour uses stable `group_id` like `tour-${id}-${date}` across related lines).
   - Only adult variant is used; child/infant variants never exercised.

4) **Variant creation missing inventory/backorder flags used by tour**
   - Tour sets `manage_inventory:false` and `allow_backorder:true` on variants to avoid inventory-related failures.
   - Package variants omit these flags (risk: add-to-cart/checkout failures if inventory is enforced).

5) **Possible API-shape mismatch in package-variant linking**
   - Linking uses `createPackageVariants({ package: pkg.id, ... })` but cleanup uses `deletePackageVariants({ package_id: pkg.id })`.
   - If service expects `package_id` consistently, this could break variant linking and/or cleanup.

6) **Field-name differences to keep consistent (expected vs tour)**
   - `package_id` vs `tour_id`
   - `package_date` vs `tour_date`
   - `package_destination` / `package_duration_days` vs `tour_destination` / `tour_duration_days`
   - Link entity: `package_booking_order` vs `tour_booking_order`

7) **Repo-wide typecheck currently fails due to other files**
   - `npx tsc --noEmit` errors were reported in:
     - `integration-tests/http/workflow-steps.spec.ts`
     - `src/modules/package/__tests__/package-service.spec.ts`
   - (Not an error in `package-purchase-flow.spec.ts` itself, but it blocks full-project TS checks.)

### Gap analysis vs the 17 tour scenarios (missing 5 tests)
The following tour scenarios are **not present** in the package test file:
1) **Single adult passenger purchase** (tour: complete flow for a single adult passenger).
2) **Reject booking for blocked date** (requires package configured with blocked dates and an E2E rejection assertion).
3) **Reject booking for blocked weekday** (requires package configured with blocked weekdays and an E2E rejection assertion).
4) **Reject booking when advance booking requirement not met** (package equivalent likely `booking_min_months_ahead`, vs tour’s `booking_min_days_ahead`).
5) **Reject booking for past dates** (E2E rejection during checkout/booking creation).

Additional structure mismatch (even where a similar scenario exists):
- “Reject booking when capacity is exceeded” exists, but is under `Capacity Validation` here; in tour it lives under the success-cases describe.
