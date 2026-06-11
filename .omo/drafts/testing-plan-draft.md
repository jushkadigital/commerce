# Draft: Plan de Testing para Ecommerce Turismo

## Información del Proyecto

### Stack Tecnológico
- **Framework**: Medusa.js v2.12.4 (Ecommerce headless)
- **Lenguaje**: TypeScript
- **Node.js**: >= 20
- **Package Manager**: (npm/yarn/bun - por confirmar)

### Módulos Personalizados Existentes
1. **Tour Module** - Gestión de tours y reservas
   - Modelos: Tour, TourVariant, TourBooking, TourServiceVariant
   - Servicios: Cálculo de capacidad, validación de reservas, precios
   - Tests unitarios: ✅ (comprehensivos - ~960 líneas)
   
2. **Package Module** - Gestión de packages turísticos
   - Modelos: Package, PackageVariant, PackageBooking, PackageServiceVariant
   - Servicios: Similar a Tour module
   - Tests unitarios: ✅ (comprehensivos - ~635 líneas)

3. **Keycloak Auth** - Autenticación integrada
4. **Izipay Payment** - Procesamiento de pagos
5. **Event Bus RabbitMQ** - Sistema de eventos

### Infraestructura de Testing Actual

**Testing Framework**: Jest v29.7.0 con @swc/jest
**Configuración**: jest.config.js con 3 modos:
- `test:unit` - Tests unitarios (`**/__tests__/**/*.unit.spec.[jt]s`)
- `test:integration:http` - Tests HTTP (`**/integration-tests/http/*.spec.[jt]s`)
- `test:integration:modules` - Tests módulos (`**/src/modules/*/__tests__/**/*.[jt]s`)

**Tests Existentes**:
- ✅ `tour-module.service.unit.spec.ts` (960 líneas)
- ✅ `package-module.service.unit.spec.ts` (635 líneas)
- ✅ `tour-booking-locking.spec.ts` (657 líneas) - Tests de concurrencia
- ✅ `health.spec.ts` - Health check básico

**No Existe**:
- ❌ Playwright configurado para E2E
- ❌ Tests de API REST
- ❌ Tests de flujo de pago
- ❌ Tests de autenticación
- ❌ Tests de integración para Package bookings

### Funcionalidades Clave Identificadas

#### 1. Reservas de Tours
- Capacidad limitada por fecha
- Sistema de locking para prevenir overbooking
- Validación de fechas disponibles
- Cálculo de precios por tipo de pasajero (adulto/niño/infante)
- Workflow: Cart → Order → TourBooking

#### 2. Reservas de Packages
- Similar a tours pero para packages multi-día
- Capacidad limitada
- Precios por tipo de pasajero

#### 3. Flujo de Compra (Checkout)
- Creación de carrito
- Adición de items con metadatos (tour_id, tour_date, passengers)
- Cálculo de totales
- Procesamiento de pago (Izipay)
- Confirmación de orden y creación de bookings

#### 4. Autenticación
- Keycloak integration
- Gestión de usuarios/customers

#### 5. Precios
- Integración con Pricing Module de Medusa
- Precios por variante de producto
- Soporta múltiples monedas (PEN/USD)

---

## ✅ Requisitos Confirmados

### Scope General
- **Backend API únicamente** (sin frontend)
- Usar `medusaIntegrationTestRunner` de Medusa
- Enfocado en módulos personalizados (Tour, Package, Auth, Payment)

### Testing Unitario (Servicios + Workflows)
1. **Keycloak Auth Service** - Sin tests actualmente
2. **Izipay Payment Service** - Sin tests actualmente
3. **Workflow Steps** - Creación, validación, actualización
4. **Utils** - Funciones de locking, helpers de fecha, etc.
5. **Models** - Validaciones de datos

### Testing de Integración de API
**Flujos a cubrir** (Todos los críticos):
1. **Tours**: CRUD completo + reservas + disponibilidad
2. **Packages**: CRUD completo + reservas + disponibilidad
3. **Concurrencia**: Tests de race condition para Tours Y Packages
4. **Autenticación**: Flujos de Keycloak
5. **Pagos**: Integración con Izipay
6. **Admin**: Operaciones de administración

### Tests de Concurrencia
- **Tours**: Ya existe (`tour-booking-locking.spec.ts`) - extender
- **Packages**: Crear nuevo similar al de tours
- Objetivo: Prevenir overbooking con múltiples requests simultáneas

### Prioridad
1. Tests unitarios de servicios faltantes
2. Tests de concurrencia para packages
3. Tests de integración de API para flujos críticos
4. Tests de workflows

---

## Recomendaciones Preliminares

### Tests Unitarios (Completar)
1. **Keycloak Auth Service** - No tiene tests
2. **Izipay Payment Service** - No tiene tests
3. **Workflow Steps** - Los steps de creación/validación
4. **Utils** - Funciones de locking, helpers de fecha
5. **Models** - Validaciones de datos

### Tests de Integración (Nuevos)
1. **Package Booking Locking** - Similar al de tours pero para packages
2. **API Endpoints** - CRUD de tours, packages, bookings
3. **Checkout Flow** - Flujo completo de reserva
4. **Payment Integration** - Integración con Izipay

### Tests E2E con Playwright (Nuevo Setup)
1. Setup de Playwright
2. Flujo: Buscar tour → Ver disponibilidad → Agregar al carrito → Checkout → Confirmación
3. Flujo similar para packages
4. Tests de autenticación
5. Tests de escenarios de error

---

## Notas de Implementación

### Consideraciones para E2E
- Medusa corre en `localhost:9000` por defecto
- Necesitarás seed data para tests
- Considerar usar `medusa develop` en modo test
- Mocks para servicios externos (Izipay, Keycloak)

### Consideraciones para Tests Unitarios
- Ya hay buena cobertura de Tour y Package services
- Usar mocks para módulos de Medusa (Pricing, Cart, etc.)
- Follow existing patterns (ver `tour-module.service.unit.spec.ts`)

### Patrones de Testing Encontrados
- Mocking con jest.fn()
- Uso de @medusajs/test-utils para integración
- Tests de concurrencia con Promise.allSettled
- Configuración de test environment en jest.config.js
