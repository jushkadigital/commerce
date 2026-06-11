## Task 1: Create validate-package-booking step
**Status**: ✅ COMPLETED
**Timestamp**: 2026-02-11T04:25:00Z

### What was done:
- Created `src/workflows/steps/validate-package-booking.ts`
- Adapted structure from validate-tour-booking.ts
- Changed references from tour to package:
  - TOUR_MODULE → PACKAGE_MODULE
  - TourModuleService → PackageModuleService
  - is_tour → is_package
  - tour_id → package_id
  - tour_date → package_date

### Validation logic:
1. Queries cart items with metadata
2. Filters items where `metadata.is_package === true`
3. For each package item:
   - Extracts package_id, package_date, total_passengers
   - Validates required fields exist
   - Calls `packageService.validateBooking()`
   - Throws error if validation fails

### Next:
Task 2: Add validation step to package workflow
