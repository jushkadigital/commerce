# Plan de Testing para Medusa Backend

## TL;DR

> **Objetivo**: Crear suite de testing completa para backend Medusa v2 con módulos custom de Tours y Packages.
> 
> **Alcance**: Tests unitarios para funciones clave + Tests de integración E2E para flujos de compra (Tour y Package).
> 
> **Entregables**:
> - 2 archivos de tests unitarios (TourModuleService, PackageModuleService)
> - 2 archivos de tests de integración (tour-purchase-flow, package-purchase-flow)
> - 1 archivo de tests para workflow steps
> - Cobertura: 70%+ en servicios críticos
> 
> **Esquema de Ejecución**:
> - **Wave 1**: Tests unitarios para TourModuleService (independiente)
> - **Wave 2**: Tests unitarios para PackageModuleService (independiente)
> - **Wave 3**: Tests de integración E2E para flujos de compra
> 
> **Estimado**: 3-4 días | **Paralelizable**: Waves 1 y 2 en paralelo

---

## Context

### Original Request
Crear tests unitarios para funciones clave y tests E2E para simular compra de Tours y Packages en backend Medusa.

### Interview Summary
**Decisiones Clave**:
- **Enfoque**: Solo Backend Medusa (no frontend/Storefront)
- **Tipo de Tests**: Unitarios + Integración (no E2E con Playwright porque es backend)
- **Modelo de Negocio**: Tours y Packages como productos independientes
- **Cobertura**: Completa desde cero (pocos tests existentes)
- **Complejidad**: Flujo básico (crear carrito → checkout → pago), no casos edge complejos

### Research Findings
**Infraestructura Existente**:
- Medusa v2.12.4 con Jest 29.7.0 configurado
- @medusajs/test-utils para utilidades de testing
- Tests existentes: `tour-booking-locking.spec.ts` (concurrencia) y `health.spec.ts`
- Scripts: `test:unit`, `test:integration:http`, `test:integration:modules`

**Módulos Custom**:
1. **Tours Module** (`/src/modules/tour/`):
   - `TourModuleService`: 20+ métodos CRUD + validación + capacidad
   - Métodos clave: `getAvailableCapacity()`, `validateBooking()`, `createTourBookings()`
   - Workflows: create-tour, create-tour-booking (7 steps cada uno)

2. **Packages Module** (`/src/modules/package/`):
   - `PackageModuleService`: Misma estructura que Tours
   - Workflows: create-package, create-package-booking (7 steps cada uno)

**Patrón de Testing Observado**:
```typescript
medusaIntegrationTestRunner({
  inApp: true,
  testSuite: ({ api, getContainer }) => {
    // Setup con fixtures (products, regions, carts)
    // Tests usando api.get/post + container.resolve()
    // Cleanup con afterEach
  }
})
```

### Metis Review
**Gaps Identificados** (a incorporar en el plan):
1. Validar qué métodos específicos son "funciones clave" (asumimos CRUD + validación + booking)
2. Definir qué constituye "flujo básico" (asumimos: crear carrito → agregar item → checkout → orden)
3. Especificar mocks para pagos (Izipay) en tests E2E
4. Incluir tests negativos mínimos (stock insuficiente, fechas inválidas)

---

## Work Objectives

### Core Objective
Implementar suite de testing completa que cubra:
1. Lógica de negocio crítica en servicios (unit tests)
2. Flujos end-to-end de compra (integration tests)

### Concrete Deliverables
| Archivo | Tipo | Cobertura |
|---------|------|-----------|
| `src/modules/tour/__tests__/tour-module.service.unit.spec.ts` | Unit | TourModuleService |
| `src/modules/package/__tests__/package-module.service.unit.spec.ts` | Unit | PackageModuleService |
| `integration-tests/http/tour-purchase-flow.spec.ts` | Integration | Flujo compra Tour |
| `integration-tests/http/package-purchase-flow.spec.ts` | Integration | Flujo compra Package |
| `integration-tests/http/workflow-steps.spec.ts` | Integration | Workflow steps clave |

### Definition of Done
- [x] Todos los tests pasan: `npm run test:unit` y `npm run test:integration:http`
- [x] Cobertura mínima 70% en métodos de servicio
- [x] Tests E2E verifican flujo completo: carrito → orden confirmada
- [x] Documentación de casos de prueba incluida

### Must Have
- Tests unitarios para TourModuleService y PackageModuleService
- Tests de integración para flujos de compra de Tour y Package
- Uso de @medusajs/test-utils y patrones existentes
- Mocks para servicios externos (Izipay payment)
- Tests de casos de éxito y mínimos casos de error

### Must NOT Have (Guardrails)
- **NO** tests de frontend/UI (Admin dashboard)
- **NO** tests de performance o carga
- **NO** tests de seguridad (SQL injection, etc.)
- **NO** casos edge complejos (concurrencia masiva ya cubierta en tour-booking-locking)
- **NO** modificar código de producción (solo agregar tests)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Jest configurado)
- **Automated tests**: YES (Tests after - no TDD requerido)
- **Framework**: Jest 29.7.0 + @medusajs/test-utils

### Agent-Executed QA Scenarios (MANDATORY)

**Cada task incluye verificación ejecutada por agente:**

| Task | Tipo de Verificación | Comando/Tool |
|------|---------------------|--------------|
| Tests Unitarios | Jest | `npm run test:unit -- [archivo]` |
| Tests Integración | Jest + Medusa Test Utils | `npm run test:integration:http -- [archivo]` |
| Cobertura | Jest coverage | `npm run test:unit -- --coverage` |

**Evidencia Requerida**:
- Screenshots de terminal con output de tests pasando
- Archivos de cobertura en `.sisyphus/evidence/`
- Logs de ejecución guardados

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Paralelo):
├── Task 1: Tests unitarios TourModuleService
└── Task 2: Tests unitarios PackageModuleService

Wave 2 (After Wave 1):
├── Task 3: Tests integración flujo Tour
└── Task 4: Tests integración flujo Package

Wave 3 (Final):
└── Task 5: Tests workflow steps + cobertura final

Critical Path: Wave 1 → Wave 2 → Wave 3
Parallel Speedup: ~40% (Waves 1 y 2 pueden superponerse parcialmente)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 (Tour Unit) | None | 3 | 2 |
| 2 (Package Unit) | None | 4 | 1 |
| 3 (Tour E2E) | 1 | 5 | 4 |
| 4 (Package E2E) | 2 | 5 | 3 |
| 5 (Workflow + Coverage) | 3, 4 | None | None |

---

## TODOs

- [x] 1. Tests Unitarios - TourModuleService

  **What to do**:
  Crear tests unitarios para `src/modules/tour/service.ts`:
  - `getAvailableCapacity()` - Calcular capacidad disponible
  - `validateBooking()` - Validar fechas, disponibilidad, capacidad
  - `createTours()` - Crear tours con validaciones
  - `createTourBookings()` - Crear bookings
  - `listTourBookings()` - Listar con filtros
  
  **Must NOT do**:
  - No modificar el código de producción (solo agregar tests)
  - No testear métodos heredados de MedusaService (list, retrieve, etc.)
  - No incluir tests de integración aquí (van en otro task)

  **Recommended Agent Profile**:
  - **Category**: `quick` - Tests unitarios son tasks bien definidos
  - **Skills**: [`building-with-medusa`]
    - `building-with-medusa`: Necesario para entender estructura de módulos y servicios

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (con Task 2)
  - **Blocks**: Task 3 (Tour E2E necesita servicio estable)
  - **Blocked By**: None

  **References**:
  
  **Pattern References**:
  - `integration-tests/http/tour-booking-locking.spec.ts:1-100` - Patrón de mocks y setup
  - `src/modules/tour/service.ts:44-120` - Métodos a testear
  
  **API/Type References**:
  - `src/modules/tour/service.ts:TourModuleService` - Interfaz completa del servicio
  - `src/modules/tour/models/tour.ts` - Estructura de datos Tour
  - `src/modules/tour/models/tour-booking.ts` - Estructura TourBooking
  
  **Test References**:
  - `integration-tests/http/tour-booking-locking.spec.ts` - Ejemplo de tests Medusa
  
  **External References**:
  - Jest docs: https://jestjs.io/docs/mock-functions
  - Medusa testing: https://docs.medusajs.com/learn/debugging-and-testing/testing-tools

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Tests unitarios pasan correctamente
    Tool: Bash (npm test)
    Preconditions: Node modules instalados, Jest configurado
    Steps:
      1. Run: npm run test:unit -- src/modules/tour/__tests__/tour-module.service.unit.spec.ts
      2. Assert: Output muestra "PASS"
      3. Assert: Coverage report generado
      4. Assert: Todos los métodos críticos tienen tests
    Expected Result: Tests pasan, cobertura >70% en servicio
    Evidence: .sisyphus/evidence/task-1-tour-unit-tests.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshot terminal con tests pasando
  - [ ] Reporte de cobertura (coverage/lcov-report/)
  - [ ] Lista de métodos testeados

  **Commit**: YES
  - Message: `test(tour): add unit tests for TourModuleService`
  - Files: `src/modules/tour/__tests__/tour-module.service.unit.spec.ts`
  - Pre-commit: `npm run test:unit -- src/modules/tour/__tests__/tour-module.service.unit.spec.ts`

---

- [x] 2. Tests Unitarios - PackageModuleService

  **What to do**:
  Crear tests unitarios para `src/modules/package/service.ts`:
  - `getAvailableCapacity()` - Calcular capacidad disponible
  - `validateBooking()` - Validar fechas, disponibilidad, capacidad
  - `createPackages()` - Crear packages con validaciones
  - `createPackageBookings()` - Crear bookings
  - `listPackageBookings()` - Listar con filtros
  
  **Nota**: PackageModuleService tiene estructura idéntica a TourModuleService. Copiar patrón del Task 1 adaptando nombres.

  **Must NOT do**:
  - No modificar el código de producción
  - No testear métodos heredados
  - No duplicar lógica de tests del Task 1 (usar mismo patrón)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (con Task 1)
  - **Blocks**: Task 4 (Package E2E)
  - **Blocked By**: None

  **References**:
  - `src/modules/package/service.ts` - Servicio a testear
  - `src/modules/tour/__tests__/tour-module.service.unit.spec.ts` (referencia del Task 1)
  - Mismas referencias externas que Task 1

  **Acceptance Criteria**:

  ```
  Scenario: Tests unitarios de Package pasan
    Tool: Bash (npm test)
    Preconditions: Node modules instalados
    Steps:
      1. Run: npm run test:unit -- src/modules/package/__tests__/package-module.service.unit.spec.ts
      2. Assert: Output muestra "PASS"
      3. Assert: Cobertura >70% en métodos custom
    Expected Result: Todos los tests pasan
    Evidence: .sisyphus/evidence/task-2-package-unit-tests.png
  ```

  **Commit**: YES
  - Message: `test(package): add unit tests for PackageModuleService`
  - Files: `src/modules/package/__tests__/package-module.service.unit.spec.ts`
  - Pre-commit: `npm run test:unit -- src/modules/package/__tests__/package-module.service.unit.spec.ts`

---

- [x] 3. Tests E2E - Flujo de Compra Tour

  **What to do**:
  Crear test de integración para flujo completo de compra de Tour:
  1. Crear tour con capacidad y fechas disponibles
  2. Crear carrito con item del tour
  3. Agregar información de cliente
  4. Seleccionar método de envío (si aplica)
  5. Procesar pago (mock Izipay)
  6. Confirmar orden creada correctamente
  7. Verificar booking creado en TourModule

  **Must NOT do**:
  - No testear edge cases complejos (ya cubierto en tour-booking-locking)
  - No testear concurrencia (ya cubierto)
  - No testear UI (solo API endpoints)
  - No hacer llamadas reales a Izipay (usar mock)

  **Recommended Agent Profile**:
  - **Category**: `deep` - Tests E2E requieren entendimiento profundo de workflows
  - **Skills**: [`building-with-medusa`]
    - `building-with-medusa`: Esencial para entender flujos de cart/order/payment

  **Parallelization**:
  - **Can Run In Parallel**: YES (con Task 4)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 5
  - **Blocked By**: Task 1 (servicio debe estar estable)

  **References**:
  
  **Pattern References**:
  - `integration-tests/http/tour-booking-locking.spec.ts` - Patrón completo de setup Medusa
  - `src/workflows/create-tour-booking.ts` - Workflow de booking
  
  **API/Type References**:
  - `src/api/store/tours/route.ts` - Endpoints de tours
  - `src/api/store/cart/tour-items/route.ts` - Agregar tours a carrito
  - `src/modules/tour/service.ts` - Métodos de booking
  
  **Documentation References**:
  - `integration-tests/http/README.md` - Guía de tests de integración
  - Medusa testing docs: https://docs.medusajs.com/learn/debugging-and-testing/testing-tools/integration-tests

  **Acceptance Criteria**:

  ```
  Scenario: Flujo de compra Tour completo
    Tool: Bash (npm test)
    Preconditions: Medusa backend corriendo (test env)
    Steps:
      1. Setup: Crear tour (capacidad=10, fecha disponible)
      2. API: POST /store/carts → Crear carrito
      3. API: POST /store/carts/{id}/tour-items → Agregar tour
      4. API: POST /store/carts/{id} → Agregar cliente
      5. API: POST /store/carts/{id}/shipping-methods → Seleccionar envío
      6. API: POST /store/carts/{id}/complete → Completar orden
      7. Assert: Orden creada con status "pending"
      8. Assert: Booking creado en TourModule
      9. Assert: Capacidad actualizada
    Expected Result: Orden completada exitosamente
    Evidence: .sisyphus/evidence/task-3-tour-e2e-test.log

  Scenario: Flujo con stock insuficiente
    Tool: Bash (npm test)
    Preconditions: Tour con capacidad=1
    Steps:
      1. Setup: Tour con capacidad 1, 1 booking existente
      2. API: Intentar agregar 2 tickets al carrito
      3. Assert: Error 400 con mensaje "Insufficient capacity"
    Expected Result: Error claro al exceder capacidad
    Evidence: .sisyphus/evidence/task-3-tour-capacity-error.log
  ```

  **Commit**: YES
  - Message: `test(integration): add E2E test for tour purchase flow`
  - Files: `integration-tests/http/tour-purchase-flow.spec.ts`
  - Pre-commit: `npm run test:integration:http -- tour-purchase-flow.spec.ts`

---

- [x] 4. Tests E2E - Flujo de Compra Package

  **What to do**:
  Crear test de integración para flujo completo de compra de Package:
  1. Crear package con tours incluidos
  2. Crear carrito con item del package
  3. Procesar checkout completo
  4. Verificar orden y bookings creados

  **Estructura idéntica al Task 3**, adaptando:
  - Package en lugar de Tour
  - Endpoints de packages
  - PackageModuleService en lugar de TourModuleService

  **Must NOT do**:
  - Mismos guardrails que Task 3

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`building-with-medusa`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (con Task 3)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 5
  - **Blocked By**: Task 2

  **References**:
  - `src/modules/package/service.ts`
  - `src/api/store/packages/route.ts`
  - `integration-tests/http/tour-purchase-flow.spec.ts` (del Task 3)
  - `src/workflows/create-package-booking.ts`

  **Acceptance Criteria**:

  ```
  Scenario: Flujo de compra Package completo
    Tool: Bash (npm test)
    Preconditions: Medusa backend corriendo
    Steps:
      1. Setup: Crear package con tours
      2. API: POST /store/carts → Crear carrito
      3. API: POST /store/carts/{id}/items → Agregar package
      4. API: Completar checkout
      5. Assert: Orden creada
      6. Assert: Bookings de package creados
    Expected Result: Package comprado exitosamente
    Evidence: .sisyphus/evidence/task-4-package-e2e-test.log
  ```

  **Commit**: YES
  - Message: `test(integration): add E2E test for package purchase flow`
  - Files: `integration-tests/http/package-purchase-flow.spec.ts`
  - Pre-commit: `npm run test:integration:http -- package-purchase-flow.spec.ts`

---

- [x] 5. Tests Workflow Steps + Cobertura Final

  **What to do**:
  1. Crear tests para workflow steps críticos:
     - `create-tour-validate.ts` - Validación de input
     - `create-tour-record.ts` - Creación de registro
     - `create-tour-booking.ts` - Workflow de booking
  2. Ejecutar cobertura completa
  3. Verificar 70%+ cobertura en servicios
  4. Documentar cualquier gap encontrado

  **Must NOT do**:
  - No testear todos los steps (solo los críticos)
  - No modificar código para mejorar cobertura artificialmente

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`building-with-medusa`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None
  - **Blocked By**: Task 3, Task 4

  **References**:
  - `src/modules/tour/workflows/steps/` - Steps de tours
  - `src/modules/package/workflows/steps/` - Steps de packages
  - `src/workflows/create-tour-booking.ts` - Workflow composition

  **Acceptance Criteria**:

  ```
  Scenario: Cobertura final alcanza objetivo
    Tool: Bash (npm test)
    Steps:
      1. Run: npm run test:unit -- --coverage
      2. Run: npm run test:integration:http
      3. Assert: Cobertura TourModuleService >= 70%
      4. Assert: Cobertura PackageModuleService >= 70%
      5. Assert: Todos los tests pasan
    Expected Result: Suite completa funcionando
    Evidence: .sisyphus/evidence/task-5-coverage-report/
  ```

  **Commit**: YES
  - Message: `test(workflows): add tests for critical workflow steps`
  - Files: `integration-tests/http/workflow-steps.spec.ts`
  - Pre-commit: `npm run test:integration:http -- workflow-steps.spec.ts`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `test(tour): add unit tests for TourModuleService` | `src/modules/tour/__tests__/tour-module.service.unit.spec.ts` | `npm run test:unit -- tour-module.service.unit.spec.ts` |
| 2 | `test(package): add unit tests for PackageModuleService` | `src/modules/package/__tests__/package-module.service.unit.spec.ts` | `npm run test:unit -- package-module.service.unit.spec.ts` |
| 3 | `test(integration): add E2E test for tour purchase flow` | `integration-tests/http/tour-purchase-flow.spec.ts` | `npm run test:integration:http -- tour-purchase-flow.spec.ts` |
| 4 | `test(integration): add E2E test for package purchase flow` | `integration-tests/http/package-purchase-flow.spec.ts` | `npm run test:integration:http -- package-purchase-flow.spec.ts` |
| 5 | `test(workflows): add tests for critical workflow steps` | `integration-tests/http/workflow-steps.spec.ts` | `npm run test:integration:http -- workflow-steps.spec.ts` |

---

## Success Criteria

### Verification Commands
```bash
# Todos los tests unitarios
npm run test:unit
# Expected: PASS (X tests, Y suites)

# Todos los tests de integración
npm run test:integration:http
# Expected: PASS (X tests, Y suites)

# Cobertura
npm run test:unit -- --coverage
# Expected: TourModuleService >= 70%, PackageModuleService >= 70%
```

### Final Checklist
- [x] Tests unitarios creados para TourModuleService
- [x] Tests unitarios creados para PackageModuleService
- [x] Tests E2E creados para flujo Tour
- [x] Tests E2E creados para flujo Package
- [x] Tests de workflow steps críticos
- [x] Cobertura >= 70% en ambos servicios
- [x] Todos los tests pasan en CI
- [x] Documentación actualizada (si aplica)

### Evidence Checklist
- [x] `.sisyphus/evidence/task-1-tour-unit-tests.log` - Test results Tour
- [x] `.sisyphus/evidence/task-2-package-unit-tests.log` - Test results Package
- [x] `.sisyphus/evidence/task-3-tour-e2e-test.log` - Log tests E2E Tour
- [x] `.sisyphus/evidence/task-4-package-e2e-test.log` - Log tests E2E Package
- [x] `.sisyphus/evidence/task-5-coverage-report/` - Reporte de cobertura
