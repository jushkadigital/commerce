# Decisions: Package Tests Parity Fix

## Session: Initial Session
**Started**: 2026-02-18

---

## Key Decisions

(Agents will append architectural and implementation decisions here)

---
## Package Tests Implementation Decisions

### Date: Wed Feb 18 15:37:23 UTC 2026

#### Changes Made:
1. **createCartWithPackage helper refactored** - Now matches tour pattern exactly:
   - Signature: `createCartWithPackage(customerEmail, passengerCounts = { adults: 1, children: 0, infants: 0 })`
   - Returns `{ cart, totalPassengers }` instead of just cart
   - Creates separate line items for each passenger type (adults, children, infants)
   - Each line item has `quantity: 1` and `unit_price: perPassengerPrice * passengerCount`
   - Metadata includes: `is_package`, `package_id`, `package_date`, `package_destination`, `package_duration_days`, `total_passengers`, `passengers`, `group_id`, `pricing_breakdown`

2. **Variant flags added** - All variants now have:
   - `manage_inventory: false`
   - `allow_backorder: true`

3. **Cleanup guard added** - afterEach now checks `if (!packageModuleService || !pkg)` before cleanup

4. **5 missing tests added**:
   - `should complete full purchase flow for a single adult passenger`
   - `should reject booking for blocked date`
   - `should reject booking for blocked weekday`
   - `should reject booking when capacity is exceeded`
   - `should reject booking when min months ahead not met`
   - `should reject booking for past dates`

5. **Capacity test simplified** - Removed duplicate `should reject booking when capacity is exceeded` from Capacity Validation section (kept in Success Cases), now only one test: `should validate capacity before allowing checkout`

#### Package-specific field names maintained:
- `package_id` instead of `tour_id`
- `package_date` instead of `tour_date`
- `package_destination` instead of `tour_destination`
- `package_duration_days` instead of `tour_duration_days`
- `is_package` instead of `is_tour`
- `booking_min_months_ahead` for package (vs `booking_min_days_ahead` for tour)
- `package_booking_order` link entity

#### Final Test Count: 17 tests (matching tour exactly)

## [2026-02-18] Root Cause Analysis and Fix

### Problem
Package tests had 3 failures (14/17 passing) while tour tests had all 17 passing, despite identical test patterns.

### Root Cause
`PackageModuleService.getAvailableCapacity()` had a bug in how it accessed passenger data from booking line_items.

**The bug**: Code assumed `item.metadata.passengers` but the actual structure was `item.passengers` (metadata already unwrapped).

### Investigation Process
1. Compared tour and package service implementations - identical code
2. Added debug logging to trace capacity calculation
3. Discovered bookings WERE being created but passenger count was always 0
4. Found that `line_items.items` array contains metadata objects directly, not nested under `.metadata`

### Solution
Modified `src/modules/package/service.ts`:
```typescript
// BEFORE (broken):
const passengers = item.metadata?.passengers || {}

// AFTER (fixed):
const itemData = item as any
const passengers = itemData.passengers || {}
```

### Additional Fixes
1. Changed date query to use date range (start/end of day) instead of exact timestamp match
2. Updated test helper `createCartWithPackage` to match tour pattern (passenger breakdown structure)
3. Added inventory flags to variants (`manage_inventory: false`, `allow_backorder: true`)

### Result
✅ All 17 package tests now pass
✅ Test structure matches tour implementation exactly
✅ Capacity calculation works correctly (passenger-based, excluding infants)

