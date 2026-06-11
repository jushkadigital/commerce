# Plan de Testing - Ecommerce Turismo (Medusa.js)

## TL;DR

> **Objetivo**: Implementar suite completa de testing para ecommerce de turismo basado en Medusa.js v2.12.4, incluyendo pruebas unitarias para servicios y workflows, pruebas de integración para flujos críticos, y pruebas de concurrencia para prevenir overbooking.
> 
> **Deliverables**:
> - Tests unitarios para KeycloakAuthService, IzipayPaymentService y workflow steps
> - Tests de integración de API para Tours, Packages, Auth y Pagos
> - Tests de concurrencia para Package bookings (similar a Tours existente)
> - Fixtures y helpers reutilizables para testing
> - Cobertura objetivo: 80% de lógica de negocio
> 
> **Estimated Effort**: Large (3-4 semanas)
> **Parallel Execution**: YES - 3 waves (Unit → Integration → Concurrency)
> **Critical Path**: Unit Tests (Servicios) → Package Locking Tests → Integration API Tests

---

## Context

### Original Request
Necesito pruebas unitarias para funciones clave, y Test E2E para comprobar el funcionamiento de Reservas de un Tour, Reservas de un Package, y todo lo importante en un Ecommerce para Turismo.

### Stack Tecnológico
- **Framework**: Medusa.js v2.12.4 (Ecommerce headless)
- **Lenguaje**: TypeScript
- **Testing Framework**: Jest v29.7.0 con @swc/jest
- **Node.js**: >= 20
- **Package Manager**: npm/yarn

### Módulos Personalizados Existentes
1. **Tour Module** - Gestión de tours y reservas
   - Tests unitarios: ✅ Existentes (960 líneas)
   - Tests de integración: ✅ Existentes (657 líneas - locking)
   
2. **Package Module** - Gestión de packages turísticos
   - Tests unitarios: ✅ Existentes (635 líneas)
   - Tests de integración: ❌ Faltan (especialmente locking)

3. **Keycloak Auth Module** - Autenticación integrada
   - Tests: ❌ Ninguno

4. **Izipay Payment Module** - Procesamiento de pagos
   - Tests: ❌ Ninguno

### Infraestructura de Testing Actual
**Scripts configurados**:
- `test:unit` - Tests unitarios (`**/__tests__/**/*.unit.spec.[jt]s`)
- `test:integration:http` - Tests HTTP (`**/integration-tests/http/*.spec.[jt]s`)
- `test:integration:modules` - Tests módulos (`**/src/modules/*/__tests__/**/*.[jt]s`)

**Configuración**: Jest con @swc/jest para TypeScript, testEnvironment: node

### Metis Review - Gaps Identificados
**Guardrails aplicados**:
- Cobertura objetivo: 80% (no buscar 100%)
- Tiempo de ejecución: <5 min total
- Dependencias externas: Mock obligatorio (no llamar Keycloak/Izipay reales)
- Concurrencia: Máximo 10 requests paralelos
- Base de datos: SQLite en memoria para unit, PostgreSQL solo para integración

**Exclusiones explícitas**:
- No probar código del framework Medusa (ya probado)
- No probar Admin dashboard UI
- No probar autenticación básica de Medusa
- No incluir performance tests ni tests de seguridad/penetración

**Edge cases críticos identificados**:
- Redis locking timeout (overbooking posible)
- Webhook de pago duplicado (double booking)
- Compensación de workflow falla (orphans)
- Cancelación parcial (estado inconsistente)

---

## Work Objectives

### Core Objective
Implementar una suite completa y robusta de testing que cubra la lógica de negocio crítica del ecommerce de turismo, garantizando la prevención de overbooking, la correcta integración con servicios externos (Keycloak, Izipay), y la estabilidad de los flujos de reserva tanto para Tours como para Packages.

### Concrete Deliverables

#### 1. Tests Unitarios
- `keycloak-auth.service.unit.spec.ts` - Servicio de autenticación
- `izipay-payment.service.unit.spec.ts` - Servicio de pagos
- `create-tour-validate.step.spec.ts` - Validación de tour
- `create-tour-record.step.spec.ts` - Creación de tour
- `create-package-validate.step.spec.ts` - Validación de package
- `create-package-record.step.spec.ts` - Creación de package

#### 2. Tests de Integración
- `package-booking-locking.spec.ts` - Concurrencia para packages
- `tour-creation-flow.spec.ts` - Flujo completo de creación de tour
- `package-creation-flow.spec.ts` - Flujo completo de creación de package
- `auth-keycloak-flow.spec.ts` - Flujo de autenticación
- `payment-izipay-flow.spec.ts` - Flujo de pago con Izipay

#### 3. Infraestructura de Testing
- `test-utils.ts` - Helpers reutilizables
- `fixtures/tours.ts` - Datos de prueba para tours
- `fixtures/packages.ts` - Datos de prueba para packages
- `mocks/keycloak.ts` - Mock del servicio Keycloak
- `mocks/izipay.ts` - Mock del servicio Izipay

### Definition of Done
- [ ] Todos los tests unitarios nuevos pasan (`npm run test:unit`)
- [ ] Todos los tests de integración pasan (`npm run test:integration:http`)
- [ ] Cobertura de código >= 80% en servicios críticos
- [ ] Tests flake-free (sin timeouts aleatorios)
- [ ] Documentación de fixtures y helpers completa
- [ ] CI/CD ejecuta tests automáticamente

### Must Have
1. Tests unitarios para KeycloakAuthService con mocks
2. Tests unitarios para IzipayPaymentService con mocks
3. Tests de concurrencia para Package bookings (similar a Tours)
4. Tests de integración para flujos de creación de Tours y Packages
5. Tests de integración para flujo de autenticación con Keycloak
6. Tests de integración para flujo de pago con Izipay
7. Fixtures reutilizables para todos los tests

### Must NOT Have (Guardrails)
- Tests que llamen servicios externos reales (Keycloak, Izipay)
- Tests con datos hardcodeados de producción
- Tests que dependan del orden de ejecución
- Tests con sleeps() arbitrarios
- Cobertura de código del framework Medusa
- Tests de UI/frontend
- Performance tests o load tests
- Tests de migraciones de base de datos (más allá de "aplican sin error")

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> This is NOT conditional — it applies to EVERY task, regardless of test strategy.
>
> **FORBIDDEN** — acceptance criteria that require:
> - "User manually tests..." / "사용자가 직접 테스트..."
> - "User visually confirms..." / "사용자가 눈으로 확인..."
> - ANY step where a human must perform an action
>
> **ALL verification is executed by the agent** using tools (Bash, interactive_bash, curl, etc.).

### Test Decision
- **Infrastructure exists**: ✅ YES (Jest configurado)
- **Automated tests**: Tests-after (implementar tests para código existente)
- **Framework**: Jest con @swc/jest, @medusajs/test-utils

### Test Pattern Requirements

#### Unit Tests Pattern
```typescript
// ✅ Criterio: Cada servicio debe tener cobertura de:
- Camino feliz (happy path)
- Validaciones de input (invalid input)
- Errores de dependencias (service unavailable)
- Edge cases (null, undefined, empty arrays)
- Manejo de excepciones
```

#### Integration Tests Pattern
```typescript
// ✅ Criterio: Cada flujo debe validar:
- Pre-condiciones (estado inicial conocido)
- Acción (ejecución del workflow)
- Post-condiciones (estado final esperado)
- Invariantes (constraints de negocio)
- Cleanup (estado limpio después)
```

### Agent-Executed QA Scenarios (MANDATORY)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Unit Tests** | Bash (npm test) | Ejecutar suite, verificar pass/fail, parsear output |
| **Integration Tests** | Bash (npm test) | Ejecutar suite, verificar pass/fail, parsear output |
| **Coverage** | Bash (jest --coverage) | Verificar threshold >= 80% |
| **Type Check** | Bash (tsc --noEmit) | Compilar TypeScript sin errores |

**Each Scenario Format:**

```
Scenario: [Nombre descriptivo]
  Tool: Bash (npm test)
  Preconditions: [Setup necesario]
  Steps:
    1. [Comando exacto]
    2. [Assertion con valor esperado]
  Expected Result: [Resultado observable]
  Failure Indicators: [Qué indica fallo]
  Evidence: [Output capture path]
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Unit Tests - Start Immediately):
├── Task 1: KeycloakAuthService unit tests
├── Task 2: IzipayPaymentService unit tests
└── Task 3: Workflow steps unit tests

Wave 2 (Integration Tests - After Wave 1):
├── Task 4: Package locking tests (concurrency)
├── Task 5: Tour creation flow tests
└── Task 6: Package creation flow tests

Wave 3 (Auth & Payment - After Wave 2):
├── Task 7: Keycloak auth flow tests
└── Task 8: Izipay payment flow tests

Wave 4 (Infrastructure & Cleanup - After Wave 3):
└── Task 9: Test utilities, fixtures, mocks

Critical Path: Task 1 → Task 2 → Task 4 → Task 7
Parallel Speedup: ~35% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 7 | 2, 3 |
| 2 | None | 8 | 1, 3 |
| 3 | None | 4, 5, 6 | 1, 2 |
| 4 | 1, 3 | 7 | 5, 6 |
| 5 | 3 | 7 | 4, 6 |
| 6 | 3 | 7 | 4, 5 |
| 7 | 1, 4, 5 | 9 | 8 |
| 8 | 2 | 9 | 7 |
| 9 | 7, 8 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agent Profile |
|------|-------|---------------------------|
| 1 | 1, 2, 3 | task(category="unspecified-high", load_skills=["building-with-medusa"], run_in_background=false) |
| 2 | 4, 5, 6 | task(category="unspecified-high", load_skills=["building-with-medusa"], run_in_background=false) |
| 3 | 7, 8 | task(category="unspecified-high", load_skills=["building-with-medusa"], run_in_background=false) |
| 4 | 9 | task(category="quick", load_skills=["building-with-medusa"], run_in_background=false) |

---

## TODOs

- [ ] 1. Unit Tests - KeycloakAuthService

  **What to do**:
  - Crear archivo: `src/modules/keycloak-auth/__tests__/keycloak-auth.service.unit.spec.ts`
  - Implementar mocks para fetch/HTTP requests
  - Testear métodos: authenticate, validateToken, refreshToken, logout
  - Cubrir casos: éxito, token inválido, token expirado, error de red, usuario no encontrado

  **Must NOT do**:
  - NO llamar al servidor real de Keycloak
  - NO usar credenciales reales en tests
  - NO testear lógica de Medusa core

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Lógica compleja de autenticación con múltiples dependencias externas
  - **Skills**: `["building-with-medusa"]`
    - `building-with-medusa`: Entender patrones de testing de Medusa v2

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 7 (auth flow tests)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References**:
  - `src/modules/tour/__tests__/tour-module.service.unit.spec.ts:1-50` - Patrón de mocks con jest.fn()
  - `src/modules/package/__tests__/package-module.service.unit.spec.ts:1-100` - Patrón de mock del servicio

  **Source Code References**:
  - `src/modules/keycloak-auth/service.ts` - Código a testear
  - `src/modules/keycloak-auth/index.ts` - Definición del módulo

  **External References**:
  - Jest mocking: https://jestjs.io/docs/mock-functions
  - Medusa testing: https://docs.medusajs.com/learn/debugging-and-testing/testing-tools

  **WHY Each Reference Matters**:
  - `tour-module.service.unit.spec.ts`: Muestra cómo mockear dependencias usando jest.fn() y Object.defineProperty
  - `keycloak-auth/service.ts`: Contiene los métodos authenticate, validateToken que deben testearse

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Unit tests pass for KeycloakAuthService
    Tool: Bash (npm test)
    Preconditions: 
      - Jest configurado
      - Archivo creado: src/modules/keycloak-auth/__tests__/keycloak-auth.service.unit.spec.ts
    Steps:
      1. Run: TEST_TYPE=unit npm run test:unit -- src/modules/keycloak-auth/__tests__/keycloak-auth.service.unit.spec.ts
      2. Assert: Output contains "PASS"
      3. Assert: Output shows "X tests passed" (X >= 8)
      4. Assert: No "FAIL" in output
    Expected Result: Suite pasa exitosamente
    Failure Indicators: "FAIL" en output, exit code != 0
    Evidence: Terminal output captured

  Scenario: Coverage threshold met for Keycloak module
    Tool: Bash (jest --coverage)
    Preconditions: Tests implementados
    Steps:
      1. Run: TEST_TYPE=unit npx jest src/modules/keycloak-auth --coverage --collectCoverageFrom="src/modules/keycloak-auth/**/*.ts"
      2. Assert: Coverage report shows "Statements" >= 80%
      3. Assert: Coverage report shows "Functions" >= 80%
    Expected Result: Cobertura >= 80%
    Failure Indicators: Coverage < 80%
    Evidence: Coverage report output
  ```

  **Evidence to Capture**:
  - [ ] Output de terminal con resultados de tests
  - [ ] Reporte de cobertura

  **Commit**: YES
  - Message: `test(keycloak): add unit tests for auth service`
  - Files: `src/modules/keycloak-auth/__tests__/keycloak-auth.service.unit.spec.ts`
  - Pre-commit: `TEST_TYPE=unit npm run test:unit`

---

- [ ] 2. Unit Tests - IzipayPaymentService

  **What to do**:
  - Crear archivo: `src/modules/izipay-payment/__tests__/izipay-payment.service.unit.spec.ts`
  - Implementar mocks para fetch/HTTP requests a Izipay
  - Testear métodos: initiatePayment, verifyPayment, refund, getTransactionStatus
  - Cubrir casos: éxito, pago rechazado, tarjeta inválida, timeout, error de red

  **Must NOT do**:
  - NO hacer requests reales a Izipay API
  - NO usar credenciales de merchant reales
  - NO testear UI de checkout

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `["building-with-medusa"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:
  - `src/modules/tour/__tests__/tour-module.service.unit.spec.ts` - Patrón de mocking
  - `src/modules/izipay-payment/service.ts` - Código a testear
  - `src/modules/izipay-payment/index.ts` - Definición del módulo

  **Acceptance Criteria**:

  ```
  Scenario: Unit tests pass for IzipayPaymentService
    Tool: Bash (npm test)
    Preconditions: Archivo creado
    Steps:
      1. Run: TEST_TYPE=unit npm run test:unit -- src/modules/izipay-payment/__tests__/izipay-payment.service.unit.spec.ts
      2. Assert: Output contains "PASS"
      3. Assert: "X tests passed" (X >= 10)
    Expected Result: Suite pasa
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `test(izipay): add unit tests for payment service`
  - Files: `src/modules/izipay-payment/__tests__/izipay-payment.service.unit.spec.ts`

---

- [ ] 3. Unit Tests - Workflow Steps

  **What to do**:
  - Crear tests para steps de Tour:
    - `src/modules/tour/steps/__tests__/create-tour-validate.step.spec.ts`
    - `src/modules/tour/steps/__tests__/create-tour-record.step.spec.ts`
  - Crear tests para steps de Package:
    - `src/modules/package/steps/__tests__/create-package-validate.step.spec.ts`
    - `src/modules/package/steps/__tests__/create-package-record.step.spec.ts`
  - Testear validaciones, creaciones, manejo de errores

  **Must NOT do**:
  - NO testear workflows completos (eso es integración)
  - NO testear steps de Medusa core

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `["building-with-medusa"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: None

  **References**:
  - `src/modules/tour/steps/create-tour-validate.ts` - Step a testear
  - `src/modules/tour/steps/create-tour-record.ts` - Step a testear
  - `src/modules/package/steps/create-package-validate.ts` - Step a testear
  - `src/modules/package/steps/create-package-record.ts` - Step a testear

  **Acceptance Criteria**:

  ```
  Scenario: All workflow step tests pass
    Tool: Bash (npm test)
    Preconditions: Archivos creados
    Steps:
      1. Run: TEST_TYPE=unit npm run test:unit -- src/modules/tour/steps/__tests__
      2. Run: TEST_TYPE=unit npm run test:unit -- src/modules/package/steps/__tests__
      3. Assert: Ambos suites pasan
    Expected Result: Todos los step tests pasan
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `test(workflows): add unit tests for tour and package steps`
  - Files: `src/modules/tour/steps/__tests__/*`, `src/modules/package/steps/__tests__/*`

---

- [ ] 4. Integration Tests - Package Booking Locking

  **What to do**:
  - Crear archivo: `integration-tests/http/package-booking-locking.spec.ts`
  - Copiar patrón de `tour-booking-locking.spec.ts` pero adaptado para packages
  - Implementar tests de concurrencia para Package bookings:
    - Múltiples requests simultáneos
    - Verificación de capacidad no excedida
    - Verificación de integridad de datos
  - Usar `medusaIntegrationTestRunner` con `inApp: true`

  **Must NOT do**:
  - NO exceder 10 requests paralelos
  - NO olvidar cleanup en afterEach
  - NO usar datos de producción

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `["building-with-medusa"]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (necesita servicios de Wave 1)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 3

  **References** (CRITICAL):

  **Pattern References**:
  - `integration-tests/http/tour-booking-locking.spec.ts` - COPIAR ESTE PATRÓN
  - `src/modules/package/service.ts` - Métodos: getAvailableCapacity, validateBooking
  - `src/modules/package/workflows/create-package-booking.ts` - Workflow a testear

  **WHY Each Reference Matters**:
  - `tour-booking-locking.spec.ts`: Es la plantilla exacta a seguir. Copiar estructura, adaptar para packages.
  - `src/modules/package/service.ts`: Verificar que tiene métodos equivalentes a Tour (getAvailableCapacity, validateBooking)

  **Acceptance Criteria**:

  ```
  Scenario: Package locking tests prevent overbooking
    Tool: Bash (npm test)
    Preconditions: 
      - Archivo creado: integration-tests/http/package-booking-locking.spec.ts
      - Medusa configurado para tests
    Steps:
      1. Run: TEST_TYPE=integration:http npm run test:integration:http -- package-booking-locking.spec.ts
      2. Assert: Output contains "PASS"
      3. Assert: Tests de concurrencia pasan
      4. Assert: "should prevent overbooking when multiple users book simultaneously" - PASS
    Expected Result: Suite pasa, incluyendo tests de concurrencia
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `test(integration): add package booking locking tests`
  - Files: `integration-tests/http/package-booking-locking.spec.ts`

---

- [ ] 5. Integration Tests - Tour Creation Flow

  **What to do**:
  - Crear archivo: `integration-tests/http/tour-creation-flow.spec.ts`
  - Testear flujo completo de creación de tour:
    - Crear producto
    - Crear tour vinculado
    - Configurar variantes y precios
    - Verificar disponibilidad
  - Usar `medusaIntegrationTestRunner`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `["building-with-medusa"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:
  - `src/modules/tour/workflows/create-tour.ts` - Workflow a testear
  - `src/workflows/create-tour-booking.ts` - Flujo de booking

  **Acceptance Criteria**:

  ```
  Scenario: Tour creation flow tests pass
    Tool: Bash (npm test)
    Preconditions: Archivo creado
    Steps:
      1. Run: TEST_TYPE=integration:http npm run test:integration:http -- tour-creation-flow.spec.ts
      2. Assert: Suite pasa
    Expected Result: Flujo de creación de tour funciona correctamente
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `test(integration): add tour creation flow tests`
  - Files: `integration-tests/http/tour-creation-flow.spec.ts`

---

- [ ] 6. Integration Tests - Package Creation Flow

  **What to do**:
  - Crear archivo: `integration-tests/http/package-creation-flow.spec.ts`
  - Similar a tour creation pero para packages
  - Testear flujo completo de creación de package

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `["building-with-medusa"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:
  - `src/modules/package/workflows/create-package.ts` - Workflow a testear

  **Acceptance Criteria**:

  ```
  Scenario: Package creation flow tests pass
    Tool: Bash (npm test)
    Preconditions: Archivo creado
    Steps:
      1. Run: TEST_TYPE=integration:http npm run test:integration:http -- package-creation-flow.spec.ts
      2. Assert: Suite pasa
    Expected Result: Flujo de creación de package funciona correctamente
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `test(integration): add package creation flow tests`
  - Files: `integration-tests/http/package-creation-flow.spec.ts`

---

- [ ] 7. Integration Tests - Keycloak Auth Flow

  **What to do**:
  - Crear archivo: `integration-tests/http/auth-keycloak-flow.spec.ts`
  - Testear flujo completo de autenticación:
    - Login con credenciales válidas
    - Login con credenciales inválidas
    - Refresh token
    - Logout
  - Mockear servidor Keycloak

  **Must NOT do**:
  - NO hacer requests reales al servidor Keycloak
  - NO usar credenciales reales

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `["building-with-medusa"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 4, 5

  **References**:
  - `src/modules/keycloak-auth/service.ts` - Servicio de auth
  - `src/modules/keycloak-auth/index.ts` - Definición del módulo

  **Acceptance Criteria**:

  ```
  Scenario: Keycloak auth flow tests pass
    Tool: Bash (npm test)
    Preconditions: 
      - Archivo creado
      - Mock de Keycloak configurado
    Steps:
      1. Run: TEST_TYPE=integration:http npm run test:integration:http -- auth-keycloak-flow.spec.ts
      2. Assert: Suite pasa
    Expected Result: Flujo de autenticación funciona correctamente
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `test(integration): add keycloak auth flow tests`
  - Files: `integration-tests/http/auth-keycloak-flow.spec.ts`

---

- [ ] 8. Integration Tests - Izipay Payment Flow

  **What to do**:
  - Crear archivo: `integration-tests/http/payment-izipay-flow.spec.ts`
  - Testear flujo completo de pago:
    - Iniciar pago
    - Verificar pago exitoso
    - Verificar pago rechazado
    - Procesar webhook
    - Reembolso
  - Mockear servidor Izipay

  **Must NOT do**:
  - NO hacer requests reales a Izipay API
  - NO usar credenciales de merchant reales

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `["building-with-medusa"]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:
  - `src/modules/izipay-payment/service.ts` - Servicio de pago
  - `src/modules/izipay-payment/index.ts` - Definición del módulo

  **Acceptance Criteria**:

  ```
  Scenario: Izipay payment flow tests pass
    Tool: Bash (npm test)
    Preconditions: 
      - Archivo creado
      - Mock de Izipay configurado
    Steps:
      1. Run: TEST_TYPE=integration:http npm run test:integration:http -- payment-izipay-flow.spec.ts
      2. Assert: Suite pasa
    Expected Result: Flujo de pago funciona correctamente
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `test(integration): add izipay payment flow tests`
  - Files: `integration-tests/http/payment-izipay-flow.spec.ts`

---

- [ ] 9. Test Infrastructure - Utilities, Fixtures, and Mocks

  **What to do**:
  - Crear `integration-tests/helpers/test-utils.ts` - Helpers reutilizables
  - Crear `integration-tests/fixtures/tours.ts` - Datos de prueba para tours
  - Crear `integration-tests/fixtures/packages.ts` - Datos de prueba para packages
  - Crear `integration-tests/mocks/keycloak.ts` - Mock de servicio Keycloak
  - Crear `integration-tests/mocks/izipay.ts` - Mock de servicio Izipay
  - Actualizar `jest.config.js` si es necesario
  - Crear README de testing

  **Must NOT do**:
  - NO usar datos sensibles en fixtures
  - NO crear fixtures demasiado complejos

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `["building-with-medusa"]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final)
  - **Blocks**: None
  - **Blocked By**: Tasks 7, 8

  **References**:
  - `integration-tests/setup.js` - Setup existente
  - `jest.config.js` - Configuración de Jest

  **Acceptance Criteria**:

  ```
  Scenario: All test infrastructure in place
    Tool: Bash (ls + tsc)
    Preconditions: Archivos creados
    Steps:
      1. Verify: ls integration-tests/helpers/test-utils.ts
      2. Verify: ls integration-tests/fixtures/tours.ts
      3. Verify: ls integration-tests/fixtures/packages.ts
      4. Verify: ls integration-tests/mocks/keycloak.ts
      5. Verify: ls integration-tests/mocks/izipay.ts
      6. Run: npx tsc --noEmit (verificar no hay errores de tipo)
    Expected Result: Todos los archivos existen y compilan
    Evidence: ls output + tsc output
  ```

  **Commit**: YES
  - Message: `test(infrastructure): add test utilities, fixtures, and mocks`
  - Files: `integration-tests/helpers/*`, `integration-tests/fixtures/*`, `integration-tests/mocks/*`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `test(keycloak): add unit tests for auth service` | `src/modules/keycloak-auth/__tests__/*` | `npm run test:unit` |
| 2 | `test(izipay): add unit tests for payment service` | `src/modules/izipay-payment/__tests__/*` | `npm run test:unit` |
| 3 | `test(workflows): add unit tests for tour and package steps` | `src/modules/*/steps/__tests__/*` | `npm run test:unit` |
| 4 | `test(integration): add package booking locking tests` | `integration-tests/http/package-booking-locking.spec.ts` | `npm run test:integration:http` |
| 5 | `test(integration): add tour creation flow tests` | `integration-tests/http/tour-creation-flow.spec.ts` | `npm run test:integration:http` |
| 6 | `test(integration): add package creation flow tests` | `integration-tests/http/package-creation-flow.spec.ts` | `npm run test:integration:http` |
| 7 | `test(integration): add keycloak auth flow tests` | `integration-tests/http/auth-keycloak-flow.spec.ts` | `npm run test:integration:http` |
| 8 | `test(integration): add izipay payment flow tests` | `integration-tests/http/payment-izipay-flow.spec.ts` | `npm run test:integration:http` |
| 9 | `test(infrastructure): add test utilities, fixtures, and mocks` | `integration-tests/helpers/*`, `integration-tests/fixtures/*`, `integration-tests/mocks/*` | `npx tsc --noEmit` |

---

## Success Criteria

### Verification Commands

```bash
# 1. Todos los tests unitarios pasan
TEST_TYPE=unit npm run test:unit
# Expected: All tests pass, 0 failures

# 2. Todos los tests de integración pasan
TEST_TYPE=integration:http npm run test:integration:http
# Expected: All tests pass, 0 failures

# 3. Cobertura de código >= 80%
npx jest --coverage --collectCoverageFrom="src/modules/**/*.{ts,js}" --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
# Expected: Coverage >= 80% for all metrics

# 4. TypeScript compila sin errores
npx tsc --noEmit
# Expected: No errors

# 5. No hay tests skippeados
grep -r "\.skip\|\.only" src/modules/**/__tests__ integration-tests/http/
# Expected: No matches (or documentar por qué están skippeados)
```

### Final Checklist
- [ ] Todos los "Must Have" están implementados
- [ ] Ninguno de los "Must NOT Have" está presente
- [ ] Cobertura >= 80% en servicios críticos (Keycloak, Izipay)
- [ ] Tests flake-free (sin timeouts aleatorios)
- [ ] Documentación de fixtures completa
- [ ] Todos los tests pasan en CI/CD
- [ ] README de testing actualizado

### Métricas de Calidad

| Métrica | Objetivo | Mínimo Aceptable |
|---------|----------|------------------|
| Cobertura de código (lógica de negocio) | 85% | 80% |
| Tests flake-free | 100% | 95% |
| Tiempo de ejecución unit tests | <30s | <60s |
| Tiempo de ejecución integration | <3min | <5min |
| Tests con mocks aislados | 100% | 100% |

---

## Notas Adicionales

### Edge Cases a Considerar

#### Time-based Edge Cases
```typescript
// Booking exactamente al inicio del día
// Booking en cambio de horario (DST)
// Booking con fecha justo antes de que expire
```

#### Data Integrity
```typescript
// Tour eliminado después de crear cart pero antes de completar
// Variant desactivada durante el proceso
// Precio cambiado entre cart creation y checkout
```

#### Capacity Edge Cases
```typescript
// Capacity = 0 (tour lleno desde inicio)
// Capacity negativo (sobreventa en estado inconsistente)
// Capacity muy grande (overflow?)
```

### Escenarios de Error Críticos

| Escenario | Impacto | Mitigación en Tests |
|-----------|---------|---------------------|
| Redis locking timeout | Overbooking posible | Test con timeout corto + verificación de fallo |
| Compensación de workflow falla | Orphans (bookings sin order) | Test de rollback y cleanup |
| Webhook de pago duplicado | Double booking | Test de idempotencia en webhooks |
| Cancelación parcial | Estado inconsistente | Test de estado consistente post-cancelación |

### Referencias Útiles

- [Medusa Testing Documentation](https://docs.medusajs.com/learn/debugging-and-testing/testing-tools)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Plan generado por**: Prometheus (Strategic Planning Consultant)
**Fecha**: 2026-02-07
**Versión**: 1.0
