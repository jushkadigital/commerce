# Draft: Medusa Refactor, Optimize & Fix Errors

## User's Request (Original)
"Haz un plan para refactizar y optimizar ademas corregir errores en el codigo de medusa"

## Requirements (confirmed)
- **Objective**: Refactorizar, optimizar y corregir errores en código Medusa
- **Prioridad principal**: Corregir errores críticos
- **Alcance**: Solo backend/API (no frontend/Admin)
- **Status**: Gathering information to understand scope

## Research Findings

### Codebase Overview
- **5 Custom Modules**: tour-booking, package, izipay-payment, keycloak-auth, event-bus-rabbitmq
- **25 Custom Workflows** con 15 step files
- **47 API Route Files** (store/admin/auth/webhooks)
- **Largest file**: seed.ts (922 líneas)

### Critical Issues Identified

#### 1. Type Safety - CRITICAL
- **86 instancias de `: any`** en 32 archivos diferentes
- Service Layer: 16 ocurrencias (tour-booking, package)
- API Routes: 38 ocurrencias (tours, bookings, pricing)
- Workflows: 18 ocurrencias (create-tour, create-package, update-tour)
- Scripts: 6 ocurrencias

#### 2. Test Coverage - CRITICAL
- **0 archivos de tests encontrados**
- Sin pruebas unitarias, de integración o E2E
- Sin cobertura para lógica de negocio

#### 3. Code Duplication - HIGH
- **Lógica de precios duplicada** entre:
  - `tour-booking/service.ts` (métodos: getTourPricing, calculateCartTotal)
  - `package/service.ts` (métodos: getPackagePricing, calculateCartTotal)
- Algoritmos de cálculo idénticos

#### 4. Performance Issues - HIGH
- **N+1 Queries** en:
  - `tour-booking/service.ts:199-201` (calculateCartTotal)
  - `package/service.ts:189-191` (calculateCartTotal)
- Impacto: Carrito con 10 items = 21 queries (1+10+10)
- **Over-fetching** en query-config.ts (TODO específico: review default fields)

#### 5. Code Quality - MEDIUM
- **333 console.log statements** en el códigobase
- Archivos grandes:
  - seed.ts (922 líneas) - mix de DB ops + business logic
  - tour-booking/service.ts (343 líneas)
  - package/service.ts (325 líneas)
  - izipay-payment/service.ts (287 líneas)

### Specific Files Needing Attention

**Prioridad 1 (Errores Críticos):**
- `src/modules/tour-booking/service.ts` - 86 `: any`, N+1 queries, lógica duplicada
- `src/modules/package/service.ts` - 86 `: any`, N+1 queries, lógica duplicada
- `src/api/admin/tours/[id]/pricing/route.ts` - 6 `: any` en lógica de precios

**Prioridad 2 (Refactorización):**
- `src/scripts/seed.ts` - 922 líneas, necesita descomposición
- `src/workflows/helpers/tour-product-helper.ts` - 276 líneas
- `src/api/query-config.ts` - Over-fetching, 37 default fields

## Test Infrastructure Analysis

### Framework & Configuration
- **Testing Framework**: Jest v29.7.0 configurado
- **Config file**: `jest.config.js` con transformación SWC
- **Test Utilities**: @medusajs/test-utils disponible

### Current Test Coverage
- **Tests existentes**: Solo 1 archivo (health.spec.ts)
- **Tests en src/**: 0 tests en modules, api, workflows
- **Cobertura**: No configurada
- **CI/CD**: Tests no se ejecutan automáticamente

### Test Scripts Disponibles
```json
"test:unit": "TEST_TYPE=unit NODE_OPTIONS=--experimental-vm-modules jest ..."
"test:integration:http": "TEST_TYPE=integration:http ..."
"test:integration:modules": "TEST_TYPE=integration:modules ..."
```

### Testing Gaps Críticos
1. Sin cobertura de código
2. Sin tests de unitarios en lógica de negocio
3. Sin tests de integración para rutas API personalizadas
4. Sin tests para workflows
5. Sin tests para módulos personalizados

### Test Patterns Disponibles
- `medusaIntegrationTestRunner` para tests HTTP
- `medusaModuleTestRunner` para tests de módulos
- `medusaWorkflowTestRunner` para tests de workflows

## Technical Decisions
(None yet - awaiting research results)

## Open Questions
- ¿Qué áreas específicas de Medusa priorizar?
- ¿Qué tipo de errores se han identificado?
- ¿Hay problemas de performance conocidos?
- ¿Qué tipo de refactorización es más urgente?

## Technical Decisions
- **Test Strategy**: NO tests (QA manual únicamente)
- **Prioridades**:
  1. Type Safety - Reemplazar 86 `: any` con tipos apropiados
  2. Performance - Optimizar N+1 queries
  3. Code Duplication - Extraer lógica de precios duplicada

## Scope Boundaries
- **INCLUDE**: Backend API, custom modules (tour-booking, package), workflows, API routes
- **EXCLUDE**: Frontend/Admin UI, test suite creation, devops/infrastructure changes
