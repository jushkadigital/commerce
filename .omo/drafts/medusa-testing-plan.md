# Draft: Testing Plan para Medusa

## Fecha: 2026-02-06
## Objetivo: Crear plan de testing completo para backend Medusa

---

## Requirements (Confirmados)

### Tipo de Testing
- **Enfoque**: Solo Backend Medusa
- **No incluir**: Testing de frontend/Storefront (por ahora)

### Alcance Funcional
1. **Tests Unitarios**: Funciones clave del backend Medusa
2. **Tests E2E de Compra de Tour**: Simular flujo completo de compra de un Tour
3. **Tests E2E de Compra de Package**: Simular flujo completo de compra de un Package

### Modelo de Negocio
- **Tours**: Productos individuales comprables por sí solos
- **Packages**: Colecciones de Tours que también se compran independientemente
- **Independientes**: Ambos tipos existen como productos separados

---

## Preguntas Pendientes

### Sobre la Arquitectura
- [ ] ¿Qué versión de Medusa usa el proyecto? (v1.x o v2.x)
- [ ] ¿Existen módulos custom para Tours y Packages?
- [ ] ¿Qué workflows de Medusa están customizados?

### Sobre Testing Actual
- [ ] ¿Existe infraestructura de testing actualmente?
- [ ] ¿Qué framework de testing usar? (bun test, vitest, jest, etc.)
- [ ] ¿Existen tests actualmente que sirvan como referencia?

### Sobre Flujos E2E
- [ ] ¿Qué endpoints API específicos deberían probarse?
- [ ] ¿Hay lógica especial al comprar Tours vs Packages?
- [ ] ¿Se necesitan mocks de pasarelas de pago?

---

## Decisiones Técnicas Pendientes

1. **Framework de Testing**: Por decidir tras exploración
2. **Estrategia E2E**: Unit tests + integration tests (no Playwright porque es backend)
3. **Coverage Target**: Por definir con usuario

---

## Notas de Planificación

El plan incluirá:
- Setup de infraestructura de testing si no existe
- Tests unitarios para servicios custom
- Tests de integración para flujos de compra
- Documentación de los casos de prueba

---

## Research Findings

### Infraestructura Existente
- **Medusa Version**: @medusajs/medusa@2.12.4 (Medusa v2)
- **Framework de Testing**: Jest v29.7.0 + @medusajs/test-utils@2.12.4
- **Tests Existentes**: Solo 2 integration tests:
  - `health.spec.ts` - Health check básico
  - `tour-booking-locking.spec.ts` - Test de booking concurrente (657 líneas)
- **Scripts Disponibles**: `test:integration:http`, `test:integration:modules`, `test:unit`

### Estructura de Módulos Custom

**Tours Module** (`/src/modules/tour/`):
- Models: Tour, TourVariant, TourBooking, TourServiceVariant
- Service: TourModuleService (20+ métodos - SIN TESTS)
- Workflows: create-tour, create-tour-booking
- 7 workflow steps para crear tours

**Packages Module** (`/src/modules/package/`):
- Models: Package, PackageVariant, PackageBooking
- Service: PackageModuleService - SIN TESTS
- Workflows: create-package, create-package-booking
- Misma estructura que Tours

### Cobertura Actual
- **Unit Tests**: 0% - No hay tests unitarios
- **Integration Tests**: ~5% - Solo 2 archivos de test
- **Services**: Sin tests de unidad
- **Workflows**: Sin tests de integración
- **API Routes**: Sin tests (excepto tour-booking-locking)

### Testing Patterns Encontrados
El test existente `tour-booking-locking.spec.ts` demuestra:
- Uso de `medusaIntegrationTestRunner` de @medusajs/test-utils
- Setup con fixtures (products, regions, carts, customers)
- Tests de concurrencia (10 requests simultáneas)
- Validación de capacidad y booking locks
- Cleanup completo con beforeEach/afterEach
