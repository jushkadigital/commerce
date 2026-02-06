# Notepad: Medusa Tourism Agency Plan

## Session Progress
- **Date:** 2026-02-06
- **Session ID:** ses_3cff6db3dffeLYPC18fehaUPQO
- **Status:** Wave 1 in progress (3/5 tasks complete)

## Wave 1: Fundamentals - COMPLETED TASKS

### Task 1: Eliminar código muerto ✅
- Removed `/src/api/store/customcart/` directory completely
- Removed references from middlewares.ts
- Committed: `b447855`, `6392bb5`

### Task 4: Setup locking infrastructure ✅
- Created `src/utils/locking.ts` with:
  - `generateTourLockKey(tourId, date)` → `tour:${tourId}:${date}`
  - `generateCartLockKey(cartId)` → `cart:${cartId}`
- Ready for Task 5

### Task 2.5: Modificar cart endpoint para Single Line Item ✅
- Modified `/src/api/store/cart/tour-items/route.ts`
- Changed from multiple items to single item with:
  - `quantity: 1`
  - `unit_price`: total calculated from Pricing Module
  - `metadata`: complete structure with passengers, pricing_breakdown
- Committed: `d034f47`

## IN PROGRESS

### Task 2: Hook de validación en checkout ⏳
- Background task: bg_273af136
- Creating `src/workflows/hooks/validate-tour-capacity.ts`
- Status: running (1m 32s)

### Task 3: Endpoint API disponibilidad ⏳
- Background task: bg_050e7d08
- Creating `src/api/admin/tours/[id]/availability/route.ts`
- Status: running (36s)

## NEXT: Wave 2

Once Wave 1 completes:
1. Task 5: Implement locking in workflow (depends on Task 2, 4)
2. Task 6: Calendar widget Admin
3. Task 7: Reservations dashboard

## Learnings

### Single Line Item Pattern
- Tours are group purchases, so 1 line item = 1 reservation
- Metadata contains full breakdown: passengers, pricing_breakdown
- Hook must parse metadata.total_passengers for validation

### Locking Strategy
- Lock key: `tour:${tourId}:${date}` (per tour per date)
- Not global lock - allows concurrent bookings for different tours/dates
