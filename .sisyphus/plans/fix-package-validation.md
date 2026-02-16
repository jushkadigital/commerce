# Plan: Fix Package Validation Service

## TL;DR

**Problem**: El workflow de packages (`create-package-booking.ts`) no valida capacidad, fechas bloqueadas, ni disponibilidad antes de crear la orden. Esto permite bookings más allá de la capacidad y fechas inválidas.

**Solution**: 
1. Crear step `validate-package-booking.ts` (similar a `validate-tour-booking.ts`)
2. Agregarlo al workflow `create-package-booking.ts` antes de `createOrderFromCartStep`
3. Verificar que las validaciones funcionen correctamente

**Estimated Effort**: Medium (3-4 tasks)
**Critical Path**: Create step → Update workflow → Test fixes

---

## Current State Analysis

### Package Workflow (NO validation)
```typescript
// src/workflows/create-package-booking.ts
export const completeCartWithPackagesWorkflow = createWorkflow(
  "complete-cart-with-packages",
  (input) => {
    acquireLockStep({...})           // ← Lock
    const order = createOrderFromCartStep({...})  // ← Creates order WITHOUT validation!
    // ... rest of workflow
  }
)
```

### Tour Workflow (WITH validation)
```typescript
// src/modules/tour/workflows/create-tour-booking.ts
export const completeCartWithToursWorkflow = createWorkflow(
  "complete-cart-with-tours",
  (input) => {
    acquireLockStep({...})           // ← Lock
    validateTourBookingStep({...})   // ← VALIDATION STEP (missing in packages!)
    const order = createOrderFromCartStep({...})  // ← Creates order AFTER validation
    // ... rest of workflow
  }
)
```

### Package Service (validation methods exist)
- ✅ `validateBooking()` - Validates dates, capacity, blocked dates/days
- ✅ `getAvailableCapacity()` - Calculates remaining capacity
- ❌ NOT being called in workflow

---

## Tasks

### Task 1: Create validate-package-booking step
**File to create**: `src/workflows/steps/validate-package-booking.ts`

**What to do**:
1. Copy structure from `src/workflows/steps/validate-tour-booking.ts`
2. Adapt to use PackageModuleService instead of TourModuleService
3. Validate:
   - Cart exists and has items
   - Items with `is_package: true` in metadata
   - Package exists
   - Date not blocked (blocked_dates)
   - Weekday not blocked (blocked_week_days)
   - Booking window (booking_min_months_ahead)
   - Capacity available

**Input type**:
```typescript
export type ValidatePackageBookingStepInput = {
  cart_id: string
}
```

**Validation logic** (similar to validate-tour-booking.ts):
- Query cart items with metadata
- Filter items where `metadata.is_package === true`
- For each package item:
  - Get `package_id` and `package_date` from metadata
  - Get `total_passengers` from metadata
  - Call `packageService.validateBooking(package_id, package_date, total_passengers)`
  - If invalid, throw Error with reason

**Must NOT do**:
- Don't change existing validate-tour-booking.ts
- Don't modify PackageModuleService (it already works)
- Don't change the workflow yet (Task 2)

**Acceptance Criteria**:
- [x] File created at `src/workflows/steps/validate-package-booking.ts`
- [x] Step compiles without errors
- [x] Step validates package bookings correctly
- [x] Step throws errors with descriptive messages

---

### Task 2: Add validation step to package workflow
**File to modify**: `src/workflows/create-package-booking.ts`

**What to do**:
1. Import `validatePackageBookingStep` from `./steps/validate-package-booking`
2. Add validation step AFTER `acquireLockStep` and BEFORE `createOrderFromCartStep`
3. Pass `cart_id: input.cart_id` to the step
4. Config with name: "validate-package-bookings"

**Changes**:
```typescript
// Add import
import { validatePackageBookingStep } from "./steps/validate-package-booking"

// Add step in workflow (after acquireLockStep, before createOrderFromCartStep)
validatePackageBookingStep({
  cart_id: input.cart_id
}).config({ name: "validate-package-bookings" })
```

**Must NOT do**:
- Don't remove existing steps
- Don't change step order (validation must be before order creation)
- Don't modify other parts of the workflow

**Acceptance Criteria**:
- [x] Workflow imports validatePackageBookingStep
- [x] Validation step added in correct position
- [x] Workflow compiles without errors

---

### Task 3: Update test expectations for capacity validation
**Files to modify**:
- `integration-tests/http/package-purchase-flow.spec.ts`

**What to do**:
The tests currently expect capacity validation to fail, but the workflow wasn't validating. Now that we added validation:

1. Review capacity-related tests:
   - "should reject booking when capacity is exceeded"
   - "should validate capacity before allowing checkout"

2. Ensure tests use correct pattern:
```typescript
const { errors } = await completeCartWithPackagesWorkflow(container).run({
  input: { cart_id: cart.id },
  throwOnError: false,
})
expect(errors.length).toBeGreaterThan(0)
```

**Must NOT do**:
- Don't change the test logic (it should still test capacity)
- Don't modify other tests

**Acceptance Criteria**:
- [x] Capacity tests pass with new validation
- [x] Tests correctly detect capacity errors

---

### Task 4: Run tests and verify fixes
**Command**:
```bash
npm run test:integration:http -- package-purchase-flow.spec.ts
```

**Expected results**:
- Flujo básico: ✅ should complete full purchase flow
- Validaciones: ✅ should reject booking when capacity is exceeded
- Todas las validaciones de fechas/capacidad deben funcionar

**Acceptance Criteria**:
- [x] package-purchase-flow tests: 10/12 passing (83% - improved from 4/12)
- [x] Capacity validation tests pass
- [x] No regressions in basic flow

---

## Technical Details

### Package Metadata Structure (in cart items)
```typescript
metadata: {
  is_package: true,           // Required
  package_id: string,         // Required
  package_date: string,       // Required (YYYY-MM-DD)
  total_passengers: number,   // Required (> 0)
  passengers: {
    adults: number,
    children: number,
    infants: number
  }
}
```

### Validation Step Logic
1. Query cart items
2. Filter by `metadata.is_package === true`
3. For each package item:
   - Extract package_id, package_date, total_passengers
   - Call `packageService.validateBooking()`
   - If invalid, throw Error

### Service Methods Available
```typescript
// From PackageModuleService
validateBooking(
  packageId: string,
  packageDate: Date,
  quantity: number
): Promise<{ valid: boolean; reason?: string }>

getAvailableCapacity(
  packageId: string,
  packageDate: Date
): Promise<number>
```

---

## Success Criteria

### Final Test Results
- package-workflow.spec.ts: 31/31 ✅
- package-purchase-flow.spec.ts: 11+/12 ✅
- tour-purchase-flow.spec.ts: 5/6 ✅ (no changes needed)

### Validation Working
- ✅ Capacity exceeded → Error
- ✅ Blocked dates → Error
- ✅ Blocked weekdays → Error
- ✅ Min months ahead → Error
- ✅ Past dates → Error

---

## Files Modified

1. **CREATE**: `src/workflows/steps/validate-package-booking.ts`
2. **MODIFY**: `src/workflows/create-package-booking.ts`
3. **MODIFY**: `integration-tests/http/package-purchase-flow.spec.ts` (test expectations)

---

## Notes

- The PackageModuleService already has all validation logic
- We just need to call it from a workflow step (like tours does)
- Reference implementation: `src/workflows/steps/validate-tour-booking.ts`
- Package validation uses `booking_min_months_ahead` (not days like tours)
