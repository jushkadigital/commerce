# Plan de Trabajo: Tests de Integración y Workflows para Tours y Packages

## TL;DR

> **Objetivo**: Implementar tests de integración completos para módulos Tour/Package y sus workflows, además de mejorar los workflows existentes con validaciones de negocio.
>
> **Deliverables**:
> - Tests de integración de módulos: `src/modules/tour/__tests__/tour-service.spec.ts` y `src/modules/package/__tests__/package-service.spec.ts`
> - Tests de integración de workflows: `integration-tests/http/tour-workflow.spec.ts` y `integration-tests/http/package-workflow.spec.ts`
> - Mejoras a workflows existentes con validaciones de booking window y capacidad
> - Validaciones de negocio: fechas bloqueadas, capacidad, booking window
>
> **Estimated Effort**: Large (8-10 horas)
> **Parallel Execution**: YES - 2 waves (Module Tests → Workflow Tests)
> **Critical Path**: Module Service Tests → Workflow Integration Tests → Validation Steps

---

## Context

### Current State
- **Modelos**: Tour y Package tienen nuevos campos (is_special, blocked_dates, blocked_week_days, cancellation_deadline_hours, booking_min_days/months_ahead)
- **Workflows existentes**: 
  - `createTourWorkflow` en `src/workflows/create-tour.ts`
  - `createPackageWorkflow` en `src/workflows/create-package.ts`
  - Steps de validación básica ya implementados
- **Tests actuales**: Solo tests unitarios de modelos (verifican estructura, no comportamiento)

### Gap Identified
❌ No hay tests de integración que prueben:
- Operaciones CRUD reales con base de datos
- Lógica de negocio con datos persistentes
- Workflows completos de creación
- Validaciones de booking window y capacidad

### User Requirements
1. Tests de integración de módulos (`test-integration:modules`)
2. Tests de integración de workflows (`test-integration:workflow`)
3. Workflows mejorados con validaciones de negocio

---

## Work Objectives

### Core Objective
Implementar una suite completa de tests de integración que cubra los módulos Tour/Package y sus workflows, asegurando que la lógica de negocio funcione correctamente con datos reales.

### Concrete Deliverables

#### 1. Tests de Integración de Módulos (Module Integration Tests)
- **Tour Service Tests**: `src/modules/tour/__tests__/tour-service.spec.ts`
  - CRUD operations con nuevos campos
  - Validaciones de booking window (2 días)
  - Validaciones de capacidad
  - Tests de disponibilidad (fechas bloqueadas)
  
- **Package Service Tests**: `src/modules/package/__tests__/package-service.spec.ts`
  - CRUD operations con nuevos campos
  - Validaciones de booking window (2 meses)
  - Validaciones de capacidad
  - Tests de disponibilidad (fechas y días bloqueados)

#### 2. Tests de Integración de Workflows (Workflow Integration Tests)
- **Tour Workflow Tests**: `integration-tests/http/tour-workflow.spec.ts`
  - Test completo de `createTourWorkflow`
  - Verificación de creación de Product + Tour + Variants
  - Validación de links entre módulos
  
- **Package Workflow Tests**: `integration-tests/http/package-workflow.spec.ts`
  - Test completo de `createPackageWorkflow`
  - Verificación de creación de Product + Package + Variants
  - Validación de links entre módulos

#### 3. Mejoras a Workflows Existentes
- **Nuevos Steps de Validación**:
  - `validateBookingWindowStep` - Validar 2 días (Tour) / 2 meses (Package)
  - `validateCapacityStep` - Validar capacidad del grupo
  - `validateBlockedDatesStep` - Validar fechas/días bloqueados
  
- **Actualización de Workflows**:
  - Integrar nuevos steps en `createTourWorkflow` y `createPackageWorkflow`
  - Mejorar steps existentes con validaciones adicionales

### Definition of Done
- [ ] Tests de integración de módulos pasan (`npm run test:integration:modules`)
- [ ] Tests de integración de workflows pasan (`npm run test:integration:http`)
- [ ] Workflows mejorados con validaciones de negocio
- [ ] Todos los nuevos campos se prueban con datos reales
- [ ] Booking window validation funciona (2 días / 2 meses)
- [ ] Capacity validation funciona (sin contar infantes)
- [ ] Blocked dates/days validation funciona
- [ ] Agent-Executed QA scenarios completados

### Must Have
- Tests de integración de módulos con `moduleIntegrationTestRunner`
- Tests de integración de workflows con `medusaIntegrationTestRunner`
- Validaciones de booking window en workflows
- Validaciones de capacidad en workflows
- Validaciones de fechas bloqueadas en workflows

### Must NOT Have (Guardrails)
- ❌ No modificar los modelos (ya están listos)
- ❌ No crear nuevos workflows desde cero (mejorar los existentes)
- ❌ No probar código del framework Medusa
- ❌ No tests de performance o carga
- ❌ No tests de UI/frontend

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (Jest configurado, test-utils de Medusa)
- **Test Types**: 
  - Integration Modules: `moduleIntegrationTestRunner` (con DB real)
  - Integration HTTP: `medusaIntegrationTestRunner` (workflows completos)
- **Framework**: Jest + @medusajs/test-utils

### Agent-Executed QA Scenarios

**For Module Integration Tests:**
```
Scenario: Create Tour with new fields
  Tool: Bash (npm run test:integration:modules)
  Steps:
    1. Run: npm run test:integration:modules -- tour-service.spec.ts
    2. Assert: Tests pass (exit code 0)
    3. Assert: Tour created with is_special, blocked_dates, etc.
  Evidence: .sisyphus/evidence/module-integration-tests.txt

Scenario: Validate booking window for Tour
  Tool: Bash (npm run test:integration:modules)
  Steps:
    1. Run: npm run test:integration:modules -- tour-service.spec.ts
    2. Assert: Validation rejects bookings < 2 days in advance
    3. Assert: Validation accepts bookings >= 2 days in advance
  Evidence: .sisyphus/evidence/booking-window-tests.txt
```

**For Workflow Integration Tests:**
```
Scenario: Create Tour via Workflow
  Tool: Bash (npm run test:integration:http)
  Steps:
    1. Run: npm run test:integration:http -- tour-workflow.spec.ts
    2. Assert: Workflow completes successfully
    3. Assert: Product + Tour + Variants created
    4. Assert: Links between modules established
  Evidence: .sisyphus/evidence/workflow-integration-tests.txt
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Module Integration Tests):
├── Task 1: Create Tour Service Integration Tests
│   └── src/modules/tour/__tests__/tour-service.spec.ts
│   └── CRUD operations, booking window, capacity
│
└── Task 2: Create Package Service Integration Tests
    └── src/modules/package/__tests__/package-service.spec.ts
    └── CRUD operations, booking window, capacity

Wave 2 (Workflow Validation Steps):
├── Task 3: Create validateBookingWindowStep
│   └── src/workflows/steps/validate-booking-window.ts
│
├── Task 4: Create validateCapacityStep
│   └── src/workflows/steps/validate-capacity.ts
│
└── Task 5: Create validateBlockedDatesStep
    └── src/workflows/steps/validate-blocked-dates.ts

Wave 3 (Workflow Integration Tests):
├── Task 6: Create Tour Workflow Integration Tests
│   └── integration-tests/http/tour-workflow.spec.ts
│
└── Task 7: Create Package Workflow Integration Tests
    └── integration-tests/http/package-workflow.spec.ts

Wave 4 (Final Integration):
└── Task 8: Update Workflows with New Steps
    └── Update create-tour.ts and create-package.ts
    └── Integrate new validation steps
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4, 5 | 2 |
| 2 | None | 3, 4, 5 | 1 |
| 3 | 1, 2 | 8 | 4, 5 |
| 4 | 1, 2 | 8 | 3, 5 |
| 5 | 1, 2 | 8 | 3, 4 |
| 6 | 1 | None | 7 |
| 7 | 2 | None | 6 |
| 8 | 3, 4, 5, 6, 7 | None | None |

---

## TODOs

### Task 1: Create Tour Service Integration Tests

**What to do**:
1. Create `src/modules/tour/__tests__/tour-service.spec.ts`
2. Use `moduleIntegrationTestRunner` from `@medusajs/test-utils`
3. Test CRUD operations with new fields:
   - Create tour with is_special, blocked_dates, blocked_week_days, cancellation_deadline_hours, booking_min_days_ahead
   - Verify default values are applied
   - Retrieve and update tours
   - Delete tours
4. Test booking window validation (2 days):
   - Try to book 1 day in advance → should fail
   - Try to book 2+ days in advance → should pass
5. Test capacity validation:
   - Create bookings up to max_capacity → should pass
   - Try to exceed max_capacity → should fail
6. Test blocked dates validation:
   - Try to book on blocked date → should fail
   - Try to book on blocked week day → should fail

**Must NOT do**:
- ❌ No mocks (usar DB real)
- ❌ No tests de UI
- ❌ No modificar el modelo

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: [`building-with-medusa`]
- **Reason**: Tests de integración de módulos requieren entender `moduleIntegrationTestRunner`

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (con Task 2)
- **Blocks**: Task 3, 4, 5 (validations), Task 6 (workflow tests)
- **Blocked By**: None

**References**:
- `src/modules/tour/service.ts` - Servicio a testear
- `src/modules/tour/models/tour.ts` - Modelo con nuevos campos
- Medusa docs: `moduleIntegrationTestRunner` pattern
- Example: `packages/modules/order/integration-tests/__tests__/returns.spec.ts`

**Acceptance Criteria**:
- [ ] Archivo creado: `src/modules/tour/__tests__/tour-service.spec.ts`
- [ ] Tests pasan: `npm run test:integration:modules -- tour-service.spec.ts`
- [ ] CRUD operations con nuevos campos probados
- [ ] Booking window validation (2 days) probado
- [ ] Capacity validation probado
- [ ] Blocked dates/days validation probado

**Agent-Executed QA Scenarios:**
```
Scenario: Tour Service Integration Tests Pass
  Tool: Bash
  Preconditions: Ninguna
  Steps:
    1. Run: npm run test:integration:modules -- src/modules/tour/__tests__/tour-service.spec.ts
    2. Assert: Exit code 0
    3. Assert: "Test Suites: 1 passed"
    4. Assert: All CRUD tests passed
  Expected Result: All tests pass
  Evidence: .sisyphus/evidence/tour-service-integration.txt
```

**Commit**: YES
- Message: `test(tour): add service integration tests with booking window and capacity validations`
- Files: `src/modules/tour/__tests__/tour-service.spec.ts`

---

### Task 2: Create Package Service Integration Tests

**What to do**:
1. Create `src/modules/package/__tests__/package-service.spec.ts`
2. Use `moduleIntegrationTestRunner` from `@medusajs/test-utils`
3. Test CRUD operations with new fields:
   - Create package with is_special, blocked_dates, blocked_week_days, cancellation_deadline_hours, booking_min_months_ahead
   - Verify default values are applied
   - Retrieve and update packages
   - Delete packages
4. Test booking window validation (2 months):
   - Try to book 1 month in advance → should fail
   - Try to book 2+ months in advance → should pass
5. Test capacity validation:
   - Create bookings up to max_capacity → should pass
   - Try to exceed max_capacity → should fail
6. Test blocked dates validation:
   - Try to book on blocked date → should fail
   - Try to book on blocked week day → should fail

**Must NOT do**:
- ❌ No mocks (usar DB real)
- ❌ No compartir código con Tour (mantener separación)

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: [`building-with-medusa`]

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (con Task 1)
- **Blocks**: Task 3, 4, 5 (validations), Task 7 (workflow tests)

**Acceptance Criteria**:
- [ ] Archivo creado: `src/modules/package/__tests__/package-service.spec.ts`
- [ ] Tests pasan: `npm run test:integration:modules -- package-service.spec.ts`
- [ ] Booking window validation (2 months) probado
- [ ] Key difference verified: Package uses months, not days

**Commit**: YES
- Message: `test(package): add service integration tests with booking window and capacity validations`
- Files: `src/modules/package/__tests__/package-service.spec.ts`

---

### Task 3: Create validateBookingWindowStep

**What to do**:
1. Create `src/workflows/steps/validate-booking-window.ts`
2. Implement step that validates booking window based on tour/package type:
   - For Tour: minimum 2 days ahead
   - For Package: minimum 2 months ahead
3. Use current date vs booking date comparison
4. Throw error if booking window not met
5. Return validation result if successful

**Input type:**
```typescript
{
  type: "tour" | "package",
  booking_date: Date,
  current_date?: Date // defaults to now
}
```

**Must NOT do**:
- ❌ No hardcodear valores (usar campos del modelo: booking_min_days_ahead, booking_min_months_ahead)

**Acceptance Criteria**:
- [ ] Step creado: `src/workflows/steps/validate-booking-window.ts`
- [ ] Valida correctamente 2 días para Tours
- [ ] Valida correctamente 2 meses para Packages
- [ ] Usa valores de modelo (no hardcodeados)

**Commit**: YES
- Message: `feat(workflows): add validateBookingWindowStep for 2 days/2 months validation`

---

### Task 4: Create validateCapacityStep

**What to do**:
1. Create `src/workflows/steps/validate-capacity.ts`
2. Implement step that validates group capacity:
   - Count passengers excluding infants
   - Compare against max_capacity
   - Throw error if exceeded
3. Input: tour/package ID, array of passenger counts by type
4. Query current bookings for the date
5. Calculate remaining capacity

**Input type:**
```typescript
{
  entity_id: string, // tour_id or package_id
  entity_type: "tour" | "package",
  booking_date: Date,
  passengers: {
    adult: number,
    child: number,
    infant: number
  }
}
```

**Acceptance Criteria**:
- [ ] Step creado: `src/workflows/steps/validate-capacity.ts`
- [ ] Excluye infantes del conteo
- [ ] Valida contra max_capacity
- [ ] Calcula capacidad restante correctamente

**Commit**: YES
- Message: `feat(workflows): add validateCapacityStep for group size validation`

---

### Task 5: Create validateBlockedDatesStep

**What to do**:
1. Create `src/workflows/steps/validate-blocked-dates.ts`
2. Implement step that validates against blocked dates and week days:
   - Check if booking_date is in blocked_dates array
   - Check if booking_date's week day is in blocked_week_days array
   - Throw error if blocked
3. Query tour/package to get blocked dates/days

**Input type:**
```typescript
{
  entity_id: string,
  entity_type: "tour" | "package",
  booking_date: Date
}
```

**Acceptance Criteria**:
- [ ] Step creado: `src/workflows/steps/validate-blocked-dates.ts`
- [ ] Valida fechas bloqueadas específicas
- [ ] Valida días de semana bloqueados
- [ ] Maneja ambos tipos (Tour y Package)

**Commit**: YES
- Message: `feat(workflows): add validateBlockedDatesStep for unavailable dates validation`

---

### Task 6: Create Tour Workflow Integration Tests

**What to do**:
1. Create `integration-tests/http/tour-workflow.spec.ts`
2. Use `medusaIntegrationTestRunner` from `@medusajs/test-utils`
3. Test complete `createTourWorkflow`:
   - Execute workflow with valid input
   - Verify Product created in Medusa
   - Verify Tour created in Tour Module
   - Verify Variants created and linked
   - Verify Remote Links established
4. Test workflow with invalid data (validation failures)
5. Test workflow with new fields (is_special, blocked_dates, etc.)

**Must NOT do**:
- ❌ No mocks (usar DB real)
- ❌ No tests de UI

**Acceptance Criteria**:
- [ ] Archivo creado: `integration-tests/http/tour-workflow.spec.ts`
- [ ] Tests pasan: `npm run test:integration:http -- tour-workflow.spec.ts`
- [ ] Workflow completo probado (Product + Tour + Variants + Links)
- [ ] Validaciones probadas (éxito y fallo)

**Commit**: YES
- Message: `test(integration): add tour workflow integration tests`

---

### Task 7: Create Package Workflow Integration Tests

**What to do**:
1. Create `integration-tests/http/package-workflow.spec.ts`
2. Use `medusaIntegrationTestRunner`
3. Test complete `createPackageWorkflow`:
   - Execute workflow with valid input
   - Verify Product + Package + Variants + Links
4. Test with new fields specific to Package (booking_min_months_ahead)
5. Test validations

**Acceptance Criteria**:
- [ ] Archivo creado: `integration-tests/http/package-workflow.spec.ts`
- [ ] Tests pasan: `npm run test:integration:http -- package-workflow.spec.ts`
- [ ] Key difference verified: Package uses months, not days

**Commit**: YES
- Message: `test(integration): add package workflow integration tests`

---

### Task 8: Update Workflows with New Steps

**What to do**:
1. Update `src/workflows/create-tour.ts`:
   - Import new validation steps
   - Add validateBookingWindowStep after initial validation
   - Add validateCapacityStep (if applicable during creation)
   - Add validateBlockedDatesStep (if applicable during creation)
2. Update `src/workflows/create-package.ts`:
   - Same as above but for Package
3. Ensure workflows use new fields (is_special, blocked_dates, etc.) in create steps
4. Test that workflows still pass after updates

**Must NOT do**:
- ❌ No eliminar steps existentes
- ❌ No cambiar la estructura fundamental del workflow

**Acceptance Criteria**:
- [ ] Workflows actualizados con nuevos steps
- [ ] Workflows usan nuevos campos
- [ ] Tests existentes siguen pasando
- [ ] Tests de integración pasan

**Commit**: YES
- Message: `feat(workflows): integrate new validation steps and fields into create workflows`

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| 1 | `test(tour): add service integration tests` | `src/modules/tour/__tests__/tour-service.spec.ts` |
| 2 | `test(package): add service integration tests` | `src/modules/package/__tests__/package-service.spec.ts` |
| 3 | `feat(workflows): add validateBookingWindowStep` | `src/workflows/steps/validate-booking-window.ts` |
| 4 | `feat(workflows): add validateCapacityStep` | `src/workflows/steps/validate-capacity.ts` |
| 5 | `feat(workflows): add validateBlockedDatesStep` | `src/workflows/steps/validate-blocked-dates.ts` |
| 6 | `test(integration): add tour workflow tests` | `integration-tests/http/tour-workflow.spec.ts` |
| 7 | `test(integration): add package workflow tests` | `integration-tests/http/package-workflow.spec.ts` |
| 8 | `feat(workflows): integrate validation steps` | `src/workflows/create-tour.ts`, `src/workflows/create-package.ts` |

---

## Success Criteria

### Verification Commands

```bash
# 1. Module Integration Tests
npm run test:integration:modules
# Expected: All tests pass (4 suites: tour-service, package-service, plus existing)

# 2. Workflow Integration Tests
npm run test:integration:http
# Expected: All tests pass (tour-workflow, package-workflow)

# 3. All Tests
npm run test:unit && npm run test:integration:modules && npm run test:integration:http
# Expected: All pass
```

### Final Checklist
- [ ] Tour service integration tests created and passing
- [ ] Package service integration tests created and passing
- [ ] validateBookingWindowStep created (2 days/2 months)
- [ ] validateCapacityStep created (excludes infants)
- [ ] validateBlockedDatesStep created (dates + week days)
- [ ] Tour workflow integration tests created and passing
- [ ] Package workflow integration tests created and passing
- [ ] Workflows updated with new validation steps
- [ ] Workflows use new fields (is_special, blocked_dates, etc.)
- [ ] All tests pass (unit + integration:modules + integration:http)
- [ ] Módulos permanecen separados

---

## Next Steps After This Plan

1. **Apply database migrations**:
   ```bash
   npx medusa db:migrate
   ```

2. **Run all tests**:
   ```bash
   npm run test:unit
   npm run test:integration:modules
   npm run test:integration:http
   ```

3. **Future enhancements** (out of scope):
   - API routes for availability queries
   - Frontend calendar integration
   - Booking modification workflows
   - Cancellation workflows with 12-hour window

---

## Notas Técnicas

### Estructura de Tests de Integración de Módulos

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
      it("should create tour with new fields", async () => {
        const tour = await service.createTours({
          destination: "Machu Picchu",
          is_special: true,
          blocked_dates: ["2026-12-25"],
          booking_min_days_ahead: 2
        })
        
        expect(tour.is_special).toBe(true)
        expect(tour.blocked_dates).toContain("2026-12-25")
      })
    })
  }
})
```

### Estructura de Tests de Integración de Workflows

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createTourWorkflow } from "../../src/workflows/create-tour"

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("CreateTourWorkflow", () => {
      it("should create tour with workflow", async () => {
        const container = getContainer()
        const result = await createTourWorkflow(container).run({
          input: {
            destination: "Machu Picchu",
            duration_days: 1,
            max_capacity: 10,
            available_dates: ["2026-03-15"],
            prices: { adult: 100, child: 80, infant: 0 }
          }
        })
        
        expect(result.tour).toBeDefined()
        expect(result.tour.destination).toBe("Machu Picchu")
      })
    })
  }
})
```

---

**Plan Status**: ✅ LISTO PARA EJECUTAR

Para comenzar la ejecución, usa `/start-work` o ejecuta las tasks manualmente según el plan.
