# Problems: Package Tests Parity Fix

## Session: Initial Session
**Started**: 2026-02-18

---

## Unresolved Blockers

### BLOCKER 1: Capacity Not Tracked in Package Tests (2026-02-18)

**Symptom**: 3 package tests fail with capacity-related assertions:
1. `should complete full purchase flow` - expects `remainingCapacity = 9`, gets `10`
2. `should reject booking when capacity is exceeded` - expects error, but validation passes
3. `should validate capacity before allowing checkout` - expects `capacity = 0` after 10 bookings, gets `10`

**Evidence**:
- Tour tests: ALL 17 PASS with identical capacity assertion patterns
- Package tests: 14/17 PASS, 3 FAIL (all capacity-related)
- Both use same pattern: `getAvailableCapacity(id, date)` after `completeCartWithPackagesWorkflow`

**Critical Question**: 
Why does `tourModuleService.getAvailableCapacity()` correctly return decremented capacity after bookings, but `packageModuleService.getAvailableCapacity()` always returns the full capacity (10)?

**Possible causes**:
1. Package bookings are not being created during `completeCartWithPackagesWorkflow`
2. Package service's `getAvailableCapacity` doesn't query existing bookings
3. Package bookings exist but with wrong date/format that doesn't match query
4. Package workflow is not properly linked to booking creation

**Next step**: Oracle investigation to compare:
- How tour workflow creates bookings vs package workflow
- How tour service queries bookings vs package service
- Whether package bookings exist in DB after workflow execution

---
