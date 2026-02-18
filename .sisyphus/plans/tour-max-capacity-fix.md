# Fix max_capacity: Sum Passengers Instead of Counting Bookings

## TL;DR

> **Quick Summary**: Fix `getAvailableCapacity()` in Tour and Package services to sum actual passenger counts (adults + children) from bookings instead of using `bookings.length`. This corrects the capacity validation logic to match the intended behavior of `max_capacity` as a passenger limit, not a booking count limit.
> 
> **Deliverables**:
> - Fixed `TourModuleService.getAvailableCapacity()` 
> - Fixed `PackageModuleService.getAvailableCapacity()`
> - Updated unit tests for both services
> - Verified integration tests pass
> 
> **Estimated Effort**: Short (2-3 hours)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 6

---

## Context

### Original Request
Corregir el modelo Tour y los tests de integración, específicamente el campo `max_capacity`. Este campo está siendo tomado como stock (donde 1 booking = 1 unidad consumida), cuando su intención debe ser de máximo de `total_passengers`. No hay stock para los tours - el flujo de validación debe ser sumar el total de pasajeros y ver que es menor que `max_capacity`.

### Interview Summary
**Key Discussions**:
- El bug está en `getAvailableCapacity()` que usa `bookings.length` en lugar de sumar pasajeros
- La lógica correcta ya existe en `validate-capacity.ts:45-60`
- Solo adultos + niños cuentan para capacidad (infantes no ocupan espacio)
- Ambos servicios (Tour y Package) tienen el mismo problema

**Research Findings**:
- Estructura de `line_items` confirmada: `{ items: [{ variant_id, metadata: { passengers: { adults, children, infants } } }] }`
- Los tours usan `manage_inventory: false` - inventario de productos NO se usa para capacidad
- La lógica existente en `validate-capacity.ts` ya suma pasajeros correctamente

### Metis Review
**Identified Gaps** (addressed):
- Estructura de datos verificada via `create-booking-create.ts` y tests de integración
- Edge cases para `line_items: null` y arrays vacíos - se implementará manejo defensivo
- Infant exclusion confirmado en `validate-capacity.ts` - infantes no cuentan

---

## Work Objectives

### Core Objective
Cambiar el cálculo de capacidad disponible de `max_capacity - bookings.length` a `max_capacity - sum(adults + children)` para que `max_capacity` funcione como límite real de pasajeros por fecha.

### Concrete Deliverables
- `src/modules/tour/service.ts` - método `getAvailableCapacity()` corregido
- `src/modules/package/service.ts` - método `getAvailableCapacity()` corregido
- `src/modules/tour/__tests__/tour-module.service.unit.spec.ts` - tests actualizados
- `src/modules/package/__tests__/package-module.service.unit.spec.ts` - tests actualizados (si existe)

### Definition of Done
- [x] `bun run test src/modules/tour/__tests__/tour-module.service.unit.spec.ts` → PASS
- [x] `bun run test src/modules/package/__tests__/package-module.service.unit.spec.ts` → PASS
- [x] `bun run test integration-tests/http/tour-purchase-flow.spec.ts` → PASS
- [x] `bun run test integration-tests/http/tour-booking-locking.spec.ts` → PASS

### Must Have
- Capacidad calculada sumando `adults + children` de cada booking
- Infantes NO cuentan para capacidad
- Manejo defensivo de `line_items: null` o estructura vacía
- Todos los tests pasan

### Must NOT Have (Guardrails)
- ❌ No cambiar `validate-capacity.ts` (ya está correcto)
- ❌ No cambiar cómo se crean los bookings (`create-booking-create.ts`)
- ❌ No cambiar el modelo de datos de `line_items`
- ❌ No cambiar la firma de `validateBooking()` ni el significado de `quantity`
- ❌ No refactorizar código adyacente (pricing, blocked dates, etc.)
- ❌ No agregar nuevos endpoints o cambiar contratos de API
- ❌ No crear abstracciones innecesarias (mantener inline, patrón ya existe)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (actualizar tests existentes)
- **Framework**: bun test (Jest-compatible)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

| Deliverable Type | Verification Tool | Method |
|------------------|-------------------|--------|
| Service methods | Bash (bun test) | Run unit tests, assert all pass |
| Integration flow | Bash (bun test) | Run integration tests, assert all pass |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — no dependencies):
├── Task 1: Fix TourModuleService.getAvailableCapacity() [unspecified-low]
└── Task 2: Fix PackageModuleService.getAvailableCapacity() [unspecified-low]

Wave 2 (After Wave 1 — update tests):
├── Task 3: Update Tour unit tests [unspecified-low]
└── Task 4: Update Package unit tests [unspecified-low]

Wave 3 (After Wave 2 — integration verification):
└── Task 5: Verify integration tests pass [unspecified-low]

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Plan compliance audit [oracle]
└── Task F2: Code quality review [unspecified-high]

Critical Path: Task 1 → Task 3 → Task 5 → F1
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 2 (Waves 1 & 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|------------|--------|------|
| 1 | — | 3, 5 | 1 |
| 2 | — | 4, 5 | 1 |
| 3 | 1 | 5 | 2 |
| 4 | 2 | 5 | 2 |
| 5 | 3, 4 | F1, F2 | 3 |
| F1 | 5 | — | FINAL |
| F2 | 5 | — | FINAL |

### Agent Dispatch Summary

| Wave | # Parallel | Tasks → Agent Category |
|------|------------|----------------------|
| 1 | **2** | T1 → `unspecified-low`, T2 → `unspecified-low` |
| 2 | **2** | T3 → `unspecified-low`, T4 → `unspecified-low` |
| 3 | **1** | T5 → `unspecified-low` |
| FINAL | **2** | F1 → `oracle`, F2 → `unspecified-high` |

---

## TODOs

- [x] 1. Fix TourModuleService.getAvailableCapacity()

  **What to do**:
  - Modify `src/modules/tour/service.ts` method `getAvailableCapacity()`.
  - Current logic likely uses `max_capacity - bookings.length`.
  - New logic:
    ```typescript
    const reservedPassengers = bookings.reduce((total, booking) => {
      // Handle potential missing line_items defensibly
      const items = booking.line_items?.items || booking.line_items || [];
      const bookingPassengers = items.reduce((bookingTotal, item) => {
         const passengers = item.metadata?.passengers || {};
         const adults = Number(passengers.adults) || 0;
         const children = Number(passengers.children) || 0;
         // Infants are EXCLUDED from capacity
         return bookingTotal + adults + children;
      }, 0);
      return total + bookingPassengers;
    }, 0);
    return max_capacity - reservedPassengers;
    ```
  - Ensure it handles:
    - `booking.line_items` being null/undefined.
    - `item.metadata` being null/undefined.
    - `passengers` properties being strings or numbers.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Logic fix in a single file.
  - **Skills**: [`typescript`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3, Task 5

  **References**:
  - `src/modules/tour/service.ts` - Target file.
  - `src/workflows/steps/validate-capacity.ts` - Reference for correct passenger counting logic.

  **Acceptance Criteria**:
  - [ ] `getAvailableCapacity` returns correct remaining capacity based on passenger sum.
  - [ ] Infants do not reduce capacity.

  **QA Scenarios**:
  ```
  Scenario: Capacity calculation with adults and children
    Tool: bash
    Preconditions: Tour with max_capacity=10, 1 booking with 2 adults + 1 child
    Steps:
      1. Create a unit test snippet that imports TourModuleService.
      2. Mock a booking with line_items: [{ metadata: { passengers: { adults: 2, children: 1, infants: 1 } } }].
      3. Call getAvailableCapacity(tourId).
    Expected Result: Returns 7 (10 - 3). Infants ignored.
    Evidence: .sisyphus/evidence/task-1-capacity-calc.txt
  ```

- [x] 2. Fix PackageModuleService.getAvailableCapacity()

  **What to do**:
  - Modify `src/modules/package/service.ts` method `getAvailableCapacity()`.
  - Apply the exact same logic fix as Task 1.
  - Ensure consistency in error handling and data parsing.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Mirror of Task 1.
  - **Skills**: [`typescript`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 4, Task 5

  **References**:
  - `src/modules/package/service.ts` - Target file.

  **Acceptance Criteria**:
  - [ ] `getAvailableCapacity` returns correct remaining capacity based on passenger sum.

  **QA Scenarios**:
  ```
  Scenario: Package capacity with multiple bookings
    Tool: bash
    Preconditions: Package max_capacity=20. Booking A: 2 adults. Booking B: 3 adults + 2 children.
    Steps:
      1. Create test snippet for PackageModuleService.
      2. Mock bookings A and B.
      3. Call getAvailableCapacity().
    Expected Result: Returns 13 (20 - 2 - 5).
    Evidence: .sisyphus/evidence/task-2-package-calc.txt
  ```

- [x] 3. Update Tour Unit Tests

  **What to do**:
  - Modify `src/modules/tour/__tests__/tour-module.service.unit.spec.ts`.
  - Locate tests for `getAvailableCapacity`.
  - Update mocks to include `line_items` with `metadata.passengers` structure.
  - Add test cases:
    - Booking with adults only.
    - Booking with adults + children + infants (verify infants ignored).
    - Booking with missing metadata (defensive check).
    - Multiple bookings summing up correctly.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Test updates.
  - **Skills**: [`typescript`, `testing`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  - `src/modules/tour/__tests__/tour-module.service.unit.spec.ts` - Target file.

  **Acceptance Criteria**:
  - [ ] All tests in file pass.
  - [ ] New test cases cover infant exclusion.

  **QA Scenarios**:
  ```
  Scenario: Run updated tour tests
    Tool: bash
    Preconditions: Task 1 complete.
    Steps:
      1. Run `bun test src/modules/tour/__tests__/tour-module.service.unit.spec.ts`.
    Expected Result: All tests PASS.
    Evidence: .sisyphus/evidence/task-3-tour-tests.txt
  ```

- [x] 4. Update Package Unit Tests

  **What to do**:
  - Modify `src/modules/package/__tests__/package-module.service.unit.spec.ts`.
  - Mirror the test updates from Task 3 for the Package module.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`typescript`, `testing`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 5
  - **Blocked By**: Task 2

  **References**:
  - `src/modules/package/__tests__/package-module.service.unit.spec.ts` - Target file.

  **Acceptance Criteria**:
  - [ ] All tests in file pass.

  **QA Scenarios**:
  ```
  Scenario: Run updated package tests
    Tool: bash
    Preconditions: Task 2 complete.
    Steps:
      1. Run `bun test src/modules/package/__tests__/package-module.service.unit.spec.ts`.
    Expected Result: All tests PASS.
    Evidence: .sisyphus/evidence/task-4-package-tests.txt
  ```

- [x] 5. Verify Integration Tests

  **What to do**:
  - Run the existing integration tests to ensure the changes didn't break the purchase flow.
  - The tests likely create bookings. Since we only changed *capacity calculation* (read-side logic for validation), and `create-booking` writes the structure we now read, these tests should pass if the data structure in tests matches reality.
  - If tests fail, it means the *test data setup* in integration tests might need adjustment to match the `line_items` structure, but based on findings, they should align.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`testing`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocked By**: Task 3, Task 4

  **References**:
  - `integration-tests/http/tour-purchase-flow.spec.ts`
  - `integration-tests/http/tour-booking-locking.spec.ts`

  **Acceptance Criteria**:
  - [ ] `tour-purchase-flow.spec.ts` passes.
  - [ ] `tour-booking-locking.spec.ts` passes.

  **QA Scenarios**:
  ```
  Scenario: Run integration suite
    Tool: bash
    Preconditions: Unit tests passed.
    Steps:
      1. Run `bun test integration-tests/http/tour-purchase-flow.spec.ts`.
      2. Run `bun test integration-tests/http/tour-booking-locking.spec.ts`.
    Expected Result: Both PASS.
    Evidence: .sisyphus/evidence/task-5-integration.txt
  ```

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 2 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check for over-abstraction or unnecessary complexity.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1, 2 | `fix(tour/package): calculate capacity by passenger count, not booking count` | service.ts files | Unit tests |
| 3, 4 | `test: update capacity tests to use passenger-based mocking` | *.spec.ts files | All unit tests pass |
| 5 | `test: verify integration tests pass with new capacity logic` | (no changes expected) | Integration tests pass |

---

## Success Criteria

### Verification Commands
```bash
# Unit tests
bun run test src/modules/tour/__tests__/tour-module.service.unit.spec.ts  # Expected: PASS
bun run test src/modules/package/__tests__/package-module.service.unit.spec.ts  # Expected: PASS

# Integration tests
bun run test integration-tests/http/tour-purchase-flow.spec.ts  # Expected: PASS
bun run test integration-tests/http/tour-booking-locking.spec.ts  # Expected: PASS
```

### Final Checklist
- [x] `getAvailableCapacity()` sums adults + children from line_items
- [x] Infants are NOT counted in capacity
- [x] Null/empty line_items handled gracefully (returns 0 passengers)
- [x] All unit tests pass
- [x] All integration tests pass
- [x] No changes to validate-capacity.ts
- [x] No changes to create-booking-create.ts
