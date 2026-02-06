# Plan: Adaptación Medusa para Agencia de Turismo

## TL;DR

> **Objetivo:** Adaptar MedusaJS para una agencia de turismo que vende Tours y Packages, con capacidad de agregar múltiples pasajeros (variantes) al carrito, validar disponibilidad por fecha, y administrar reservas mediante calendario visual en el Admin Dashboard.
>
> **Enfoque arquitectónico:** Extender el Cart Module nativo de Medusa mediante metadata personalizada (patrón Ticket Booking Recipe), NO crear carrito paralelo.
>
> **Decisiones clave:**
> - ✅ Mantener `/cart/tour-items/` como sistema principal
> - ❌ Eliminar `/customcart/` (duplicado/no usado)
> - ✅ Agregar validación de capacidad en checkout (hook)
> - ✅ Implementar locking para race conditions
> - ✅ Crear dashboard de calendario en Admin
>
> **Entregables:**
> - Validación de capacidad en add-to-cart y checkout
> - Sistema de locking para prevenir overbooking
> - Widget de calendario en Admin (por tour)
> - API optimizada para queries de disponibilidad
> - Dashboard de reservas con métricas
>
> **Esfuerzo estimado:** Medium-Large (5-7 días de desarrollo)
> **Ejecución:** Paralela donde sea posible (2 waves)
> **Ruta crítica:** Validación checkout → Locking → Calendario Admin

---

## Contexto

### Proyecto Actual
- **Framework:** MedusaJS v2.12.4
- **Estado:** Implementación parcial con dos sistemas paralelos
- **Módulos existentes:**
  - `tour-booking/` - Modelos Tour, TourBooking, TourVariant
  - `package/` - Similar a tour-booking (duplicado)
- **Endpoints:**
  - `/cart/tour-items/` - Sistema activo con validaciones
  - `/customcart/` - Endpoints vacíos/no usados
- **Workflows:**
  - `create-tour-booking.ts` - Cart → Order → Booking
  - `addTourCartWorkflow` - Agregar items con group_id

### Arquitectura Recomendada (según Medusa v2)

Según el análisis de Metis y el Ticket Booking Recipe de Medusa:

```
┌─────────────────────────────────────────┐
│  FRONTEND (Store)                       │
│  - Seleccionar tour + fecha             │
│  - Especificar cantidad por tipo        │
│  - Agregar al carrito                   │
└──────────────┬──────────────────────────┘
               │ POST /cart/tour-items
               ▼
┌─────────────────────────────────────────┐
│  VALIDACIÓN (Al agregar)                │
│  - Disponibilidad disponible            │
│  - Capacidad suficiente                 │
│  - Fecha válida                         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  CART MODULE (Medusa Core)              │
│  - Line items con metadata:             │
│    { tour_id, date, passengers,         │
│      group_id, is_tour: true }          │
└──────────────┬──────────────────────────┘
               │ Checkout
               ▼
┌─────────────────────────────────────────┐
│  VALIDACIÓN (Al checkout)               │
│  - Hook en completeCartWorkflow         │
│  - Re-validar capacidad                 │
│  - Locking para race conditions         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  ORDER MODULE (Medusa Core)             │
│  - Orden creada                         │
│  - Payment processing                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  TOUR BOOKING MODULE (Custom)           │
│  - Crear TourBooking records            │
│  - Link a Order                         │
│  - Actualizar disponibilidad            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  ADMIN DASHBOARD                        │
│  - Calendario de reservas               │
│  - Gestión de disponibilidad            │
│  - Reportes y métricas                  │
└─────────────────────────────────────────┘
```

### Hallazgos de Metis

**✅ Lo que está bien:**
- Uso de metadata en line items es el patrón correcto
- Separación en módulos (TourModule) es correcta
- Validación al agregar al carrito existe

**❌ Lo que falta/falla:**
- No hay validación en checkout (race conditions posibles)
- No hay locking para concurrencia
- `/customcart/` existe pero no se usa (confusión)
- No hay dashboard de calendario en Admin
- Duplicación entre `tour-booking/` y `package/`

---

## Work Objectives

### Core Objective
Implementar un sistema completo de reservas de tours en Medusa v2 que permita:
1. Agregar múltiples pasajeros al carrito por tour/fecha
2. Validar disponibilidad en tiempo real
3. Prevenir overbooking mediante locking
4. Administrar reservas mediante calendario visual

### Concrete Deliverables
- [x] **Modificar endpoint `/cart/tour-items/`** para crear 1 solo line item con múltiples pasajeros
- [x] **Hook de validación en `completeCartWorkflow`** (parsear metadata para contar pasajeros)
- [x] **Sistema de locking** con `acquireLockStep`/`releaseLockStep`
- [x] **Widget de calendario** en Admin (por tour)
- [x] **API optimizada** para queries de disponibilidad
- [x] **Dashboard de reservas** con métricas y desglose por tipo
- [x] **Eliminación de código duplicado** (`customcart/`)
- [x] **Documentación** de uso y estructura de metadata

### Definition of Done
- [x] Un tour con capacidad 20 puede recibir 20 reservas simultáneas sin overbooking
- [x] El 21er intento de reserva recibe error de "sin disponibilidad"
- [x] El Admin muestra calendario con ocupación por día
- [x] Todos los tests pasan
- [x] Documentación actualizada

### Must Have
- [x] Validación de capacidad en add-to-cart
- [x] Validación de capacidad en checkout
- [x] Sistema de locking para race conditions
- [x] Widget de calendario en Admin
- [x] API para queries de disponibilidad

### Must NOT Have (Guardrails)
- [x] NO crear carrito paralelo (usar nativo)
- [x] NO modificar core de Medusa
- [x] NO cambiar estructura de datos existente (usar metadata)
- [x] NO implementar autenticación adicional (usar Keycloak existente)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists:** ✅ Sí (bun test configurado)
- **Automated tests:** Tests-after (para validación y locking)
- **Framework:** bun test (nativo de Bun)

### Agent-Executed QA Scenarios (MANDATORY)

Cada tarea incluye escenarios de verificación ejecutados por el agente:

**Tipos de verificación:**
- **API:** curl/httpie para endpoints
- **Workflows:** Bun tests para validaciones
- **Admin:** Playwright para UI de calendario
- **Race conditions:** Scripts paralelos de prueba

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Eliminar customcart/ (no dependencies)
├── Task 2: Crear hook de validación en checkout
├── Task 3: Crear endpoint de disponibilidad
└── Task 4: Setup locking infrastructure

Wave 2 (After Wave 1):
├── Task 5: Implementar locking en workflow
├── Task 6: Crear widget calendario Admin
└── Task 7: Dashboard de reservas

Wave 3 (After Wave 2):
├── Task 8: Refactorizar package/ (eliminar duplicación)
├── Task 9: Tests de integración
└── Task 10: Documentación
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | None | 2, 3, 4 |
| 2 | None | 5 | 1, 3, 4 |
| 3 | None | 7 | 1, 2, 4 |
| 4 | None | 5 | 1, 2, 3 |
| 5 | 2, 4 | 9 | 6, 7 |
| 6 | None | None | 5, 7 |
| 7 | 3 | None | 5, 6 |
| 8 | None | None | 5, 6, 7 |
| 9 | 5 | None | 8, 10 |
| 10 | 8 | None | 9 |

---

## TODOs

### Wave 1: Fundamentos

- [x] **Task 1: Eliminar código muerto y consolidar arquitectura**

  **What to do:**
  - Eliminar `/src/api/store/customcart/` (código no usado)
  - Analizar si `package/` puede consolidarse con `tour-booking/`
  - Documentar estructura final del proyecto
  
  **Must NOT do:**
  - Eliminar `tour-booking/` (se usa activamente)
  - Eliminar `cart/tour-items/` (endpoint principal)
  - Cambiar lógica de negocio existente

  **Recommended Agent Profile:**
  - **Category:** `quick` - Cambios de archivo simples
  - **Skills:** `building-with-medusa`
    - Requiere conocer estructura de módulos de Medusa
    - Validar que no se rompen imports

  **Parallelization:**
  - **Can Run In Parallel:** ✅ YES
  - **Parallel Group:** Wave 1
  - **Blocks:** None
  - **Blocked By:** None

  **References:**
  - `/src/api/store/customcart/` - Directorio a eliminar
  - `/src/api/store/cart/tour-items/` - Sistema a mantener
  - `/src/modules/tour-booking/` - Módulo principal
  - `/src/modules/package/` - Posible duplicación

  **Acceptance Criteria:**
  - [ ] Directorio `customcart/` eliminado
  - [ ] Proyecto compila sin errores
  - [ ] Tests existentes siguen pasando
  - [ ] Endpoint `/cart/tour-items` sigue funcionando

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verificar que customcart fue eliminado
    Tool: Bash
    Steps:
      1. ls -la /home/node/app/src/api/store/customcart/
      2. Assert: Directorio no existe o está vacío
    Expected Result: ENOENT error o directorio vacío
  
  Scenario: Verificar que proyecto compila
    Tool: Bash
    Steps:
      1. cd /home/node/app && bun run build
      2. Assert: Exit code 0
      3. Assert: No TypeScript errors
    Expected Result: Build exitoso
  
  Scenario: Verificar endpoint funciona
    Tool: Bash (curl)
    Steps:
      1. curl -X POST http://localhost:9000/store/cart/tour-items \
           -H "Content-Type: application/json" \
           -d '{"cart_id":"test","tour_id":"tour_123","date":"2026-03-01","passengers":{"adults":2}}'
      2. Assert: Status 200 o 400 (si validación rechaza)
      3. Assert: No error 404 (endpoint existe)
    Expected Result: Endpoint responde
  ```

  **Commit:** YES
  - Message: `chore(cleanup): remove unused customcart directory`
  - Files: Eliminaciones

- [x] **Task 2: Crear hook de validación en completeCartWorkflow**

  **What to do:**
  - Crear archivo `src/workflows/hooks/validate-tour-capacity.ts`
  - Implementar hook que se ejecute antes de completar cart
  - Validar disponibilidad para cada item con `is_tour: true`
  - Extraer `total_passengers` de metadata (Single Line Item)
  - Lanzar error si no hay capacidad suficiente
  
  **Technical Implementation:**
  ```typescript
  // src/workflows/hooks/validate-tour-capacity.ts
  import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
  import { Modules } from "@medusajs/framework/utils"
  
  completeCartWorkflow.hooks.validate(async ({ input }, { container }) => {
    const query = container.resolve("query")
    const tourService = container.resolve("tourBookingService")
    
    // Obtener cart con items
    const { data: [cart] } = await query.graph({
      entity: "cart",
      fields: ["items.*", "items.metadata"],
      filters: { id: input.id }
    })
    
    // Validar cada tour
    for (const item of cart.items) {
      if (item.metadata?.is_tour) {
        // Single Line Item: obtener total de pasajeros de metadata
        const totalPassengers = item.metadata.total_passengers || 
          (item.metadata.passengers?.adults || 0) +
          (item.metadata.passengers?.children || 0) +
          (item.metadata.passengers?.infants || 0)
        
        const validation = await tourService.validateBooking(
          item.metadata.tour_id,
          new Date(item.metadata.tour_date),
          totalPassengers  // Total de todos los tipos de pasajeros
        )
        
        if (!validation.valid) {
          throw new Error(`Tour no disponible: ${validation.reason}`)
        }
      }
    }
  })
  ```

  **Must NOT do:**
  - No modificar el workflow original (usar hooks)
  - No validar items que no sean tours
  - No hacer queries innecesarias

  **Recommended Agent Profile:**
  - **Category:** `ultrabrain` - Requiere entender hooks de workflows
  - **Skills:** `building-with-medusa`
    - Hooks de workflows en Medusa v2
    - Inyección de dependencias
    - Query system de Medusa

  **Parallelization:**
  - **Can Run In Parallel:** ✅ YES
  - **Parallel Group:** Wave 1
  - **Blocks:** Task 5 (necesita este hook para locking)
  - **Blocked By:** None

  **References:**
  - `node_modules/@medusajs/medusa/core-flows` - completeCartWorkflow
  - `src/modules/tour-booking/service.ts` - validateBooking method
  - `src/api/store/cart/tour-items/route.ts` - Cómo se usa metadata
  - Medusa docs: Workflow Hooks

  **Acceptance Criteria:**
  - [ ] Hook creado y registrado
  - [ ] Hook se ejecuta al intentar checkout
  - [ ] Valida capacidad disponible
  - [ ] Lanza error claro si no hay capacidad
  - [ ] No afecta items que no son tours

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Validación rechaza checkout sin capacidad
    Tool: Bun test
    Preconditions: Tour con capacidad 1, 1 reserva existente
    Steps:
      1. Crear cart con item de ese tour
      2. Intentar completeCartWorkflow
      3. Assert: Error lanzado con mensaje "sin disponibilidad"
    Expected Result: Checkout bloqueado
  
  Scenario: Validación permite checkout con capacidad
    Tool: Bun test
    Preconditions: Tour con capacidad 5, 0 reservas
    Steps:
      1. Crear cart con 2 items de ese tour
      2. Ejecutar completeCartWorkflow
      3. Assert: Workflow completa exitosamente
    Expected Result: Checkout exitoso
  
  Scenario: Hook no afecta items normales
    Tool: Bun test
    Steps:
      1. Crear cart con item normal (sin is_tour)
      2. Ejecutar completeCartWorkflow
      3. Assert: No se ejecuta validación de tour
    Expected Result: Checkout normal sin interferencia
  ```

  **Commit:** YES
  - Message: `feat(checkout): add capacity validation hook`
  - Files: `src/workflows/hooks/validate-tour-capacity.ts`

- [x] **Task 2.5: Modificar endpoint `/cart/tour-items/` para Single Line Item**

  **What to do:**
  - Modificar `src/api/store/cart/tour-items/route.ts`
  - Cambiar de crear múltiples items (uno por tipo) a **1 solo item**
  - Calcular precio total sumando todos los tipos de pasajeros
  - Estructurar metadata con desglose completo
  - Mantener validación de capacidad existente
  
  **Technical Implementation:**
  ```typescript
  // src/api/store/cart/tour-items/route.ts (Modificado)
  export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const body = req.body as {
      cart_id: string
      tour_id: string
      tour_date: string
      adults: number
      children?: number
      infants?: number
      customer?: { name: string; email?: string; phone?: string }
    }

    const { cart_id, tour_id, tour_date, adults = 0, children = 0, infants = 0, customer } = body
    const totalPassengers = adults + children + infants

    // Validaciones...

    const tourModuleService: TourModuleService = req.scope.resolve(TOUR_MODULE)
    const cartModule = req.scope.resolve(Modules.CART)
    const pricingService = req.scope.resolve(Modules.PRICING)

    // Obtener tour con variants
    const tour = await tourModuleService.retrieveTour(tour_id, { relations: ["variants"] })

    // Validar disponibilidad
    const validation = await tourModuleService.validateBooking(tour_id, new Date(tour_date), totalPassengers)
    if (!validation.valid) {
      return res.status(400).json({ message: "Tour not available", reason: validation.reason })
    }

    // Calcular precios por tipo y total
    let totalPrice = 0
    const pricingBreakdown: any[] = []
    const variantMap = new Map<PassengerType, any>()
    
    for (const variant of tour.variants || []) {
      if (variant.variant_id) variantMap.set(variant.passenger_type, variant)
    }

    // Calcular precio Adultos
    if (adults > 0) {
      const adultVariant = variantMap.get(PassengerType.ADULT)
      const priceSet = await pricingService.retrievePriceSet(adultVariant.price_set_id)
      const unitPrice = priceSet.prices[0].amount // Obtener precio actual
      const subtotal = unitPrice * adults
      totalPrice += subtotal
      pricingBreakdown.push({ type: "ADULT", quantity: adults, unit_price: unitPrice, subtotal })
    }

    // Calcular precio Niños
    if (children > 0) {
      const childVariant = variantMap.get(PassengerType.CHILD)
      const priceSet = await pricingService.retrievePriceSet(childVariant.price_set_id)
      const unitPrice = priceSet.prices[0].amount
      const subtotal = unitPrice * children
      totalPrice += subtotal
      pricingBreakdown.push({ type: "CHILD", quantity: children, unit_price: unitPrice, subtotal })
    }

    // Calcular precio Infantes (similar...)
    if (infants > 0) { /* ... */ }

    // Crear SINGLE LINE ITEM
    const singleLineItem = {
      title: `${tour.destination} - ${new Date(tour_date).toLocaleDateString()}`,
      quantity: 1,  // SIEMPRE 1 - la reserva como unidad
      unit_price: totalPrice,  // Precio total de todos los pasajeros
      metadata: {
        is_tour: true,
        tour_id: tour.id,
        tour_date,
        tour_destination: tour.destination,
        tour_duration_days: tour.duration_days,
        total_passengers: totalPassengers,
        passengers: { adults, children, infants },
        pricing_breakdown: pricingBreakdown,
        customer_name: customer?.name,
        customer_email: customer?.email,
        customer_phone: customer?.phone,
      }
    }

    // Agregar al carrito
    await cartModule.addLineItems(cart_id, [singleLineItem])

    // Retornar carrito actualizado...
  }
  ```

  **Must NOT do:**
  - No crear múltiples items (rompe el modelo Single Line Item)
  - No hardcodear precios (usar Pricing Module)
  - No olvidar incluir breakdown en metadata

  **Recommended Agent Profile:**
  - **Category:** `ultrabrain` - Cambio arquitectónico importante
  - **Skills:** `building-with-medusa`
    - Pricing Module de Medusa
    - Cart Module y Line Items
    - Metadata estructurada

  **Parallelization:**
  - **Can Run In Parallel:** ❌ NO (debe hacerse antes del Task 5)
  - **Parallel Group:** Wave 1 (modificación crítica)
  - **Blocks:** Task 5 (workflow de booking)
  - **Blocked By:** None

  **References:**
  - `src/api/store/cart/tour-items/route.ts` - Código actual
  - `@medusajs/medusa/core-flows` - Pricing Module
  - `src/modules/tour-booking/models/tour-variant.ts` - PassengerType enum

  **Acceptance Criteria:**
  - [ ] Endpoint crea 1 solo line item (no múltiples)
  - [ ] Precio total calculado correctamente
  - [ ] Metadata incluye desglose completo
  - [ ] Valida capacidad antes de agregar
  - [ ] Proyecto compila sin errores

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Agregar tour crea 1 solo item
    Tool: Bash (curl)
    Steps:
      1. POST /store/cart/tour-items con {adults: 2, children: 2}
      2. GET cart
      3. Assert: cart.items.length === 1
      4. Assert: cart.items[0].quantity === 1
      5. Assert: cart.items[0].metadata.total_passengers === 4
    Expected Result: Single line item con metadata
  
  Scenario: Metadata tiene desglose de precios
    Tool: Bash (curl)
    Steps:
      1. POST /store/cart/tour-items con múltiples tipos
      2. Assert: metadata.pricing_breakdown.length > 1
      3. Assert: Suma de breakdown === unit_price
    Expected Result: Desglose completo en metadata
  ```

  **Commit:** YES
  - Message: `refactor(cart): convert to single line item per reservation`
  - Files: `src/api/store/cart/tour-items/route.ts`

- [x] **Task 3: Crear endpoint API para disponibilidad**

  **What to do:**
  - Crear `src/api/admin/tours/[id]/availability/route.ts`
  - Endpoint GET que reciba tour_id y rango de fechas
  - Retornar disponibilidad por día (cupos totales, reservados, disponibles)
  - Optimizar query para calendario
  
  **Technical Implementation:**
  ```typescript
  // src/api/admin/tours/[id]/availability/route.ts
  export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const tourId = req.params.id
    const { start_date, end_date } = req.query
    
    const query = req.scope.resolve("query")
    const tourService = req.scope.resolve("tourBookingService")
    
    // Obtener tour con capacity
    const { data: [tour] } = await query.graph({
      entity: "tour",
      fields: ["id", "capacity", "available_dates"],
      filters: { id: tourId }
    })
    
    // Obtener bookings en rango de fechas
    const { data: bookings } = await query.graph({
      entity: "tour_booking",
      fields: ["tour_date", "status", "quantity"],
      filters: {
        tour_id: tourId,
        tour_date: { $gte: start_date, $lte: end_date }
      }
    })
    
    // Calcular disponibilidad por día
    const availability = calculateAvailability(tour, bookings, start_date, end_date)
    
    res.json({
      tour_id: tourId,
      capacity: tour.capacity,
      availability
    })
  }
  ```

  **Must NOT do:**
  - No exponer datos sensibles de clientes
  - No hacer queries N+1
  - No calcular disponibilidad en memoria sin índices

  **Recommended Agent Profile:**
  - **Category:** `unspecified-medium` - API route estándar
  - **Skills:** `building-with-medusa`, `building-admin-dashboard-customizations`
    - API routes en Medusa
    - Query system para optimización
    - Tipos de Admin API

  **Parallelization:**
  - **Can Run In Parallel:** ✅ YES
  - **Parallel Group:** Wave 1
  - **Blocks:** Task 7 (dashboard usa este endpoint)
  - **Blocked By:** None

  **References:**
  - `src/api/store/cart/tour-items/route.ts` - Ejemplo de API route
  - `src/modules/tour-booking/service.ts` - Métodos de query
  - Medusa docs: Admin API Routes, Query System

  **Acceptance Criteria:**
  - [ ] Endpoint responde GET /admin/tours/:id/availability
  - [ ] Acepta query params start_date, end_date
  - [ ] Retorna disponibilidad por día
  - [ ] Query optimizada (no N+1)
  - [ ] Documentación de respuesta

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Obtener disponibilidad por rango
    Tool: Bash (curl)
    Steps:
      1. curl "http://localhost:9000/admin/tours/tour_123/availability?start_date=2026-03-01&end_date=2026-03-31"
      2. Assert: Status 200
      3. Assert: Response tiene structure { tour_id, capacity, availability: [...] }
      4. Assert: availability[0] tiene { date, total, booked, available }
    Expected Result: JSON con disponibilidad
  
  Scenario: Query optimizada (performance)
    Tool: Bun test
    Steps:
      1. Ejecutar query con rango de 90 días
      2. Medir tiempo de respuesta
      3. Assert: < 500ms
    Expected Result: Query rápida
  ```

  **Commit:** YES
  - Message: `feat(api): add availability endpoint for tours`
  - Files: `src/api/admin/tours/[id]/availability/route.ts`

- [x] **Task 4: Setup infrastructure de locking**

  **What to do:**
  - Configurar Locking Module de Medusa (si no está)
  - Verificar que `acquireLockStep` y `releaseLockStep` estén disponibles
  - Crear utilidad para generar keys de lock consistentes
  
  **Technical Implementation:**
  ```typescript
  // src/utils/locking.ts
  export const generateTourLockKey = (tourId: string, date: string): string => {
    return `tour:${tourId}:${date}`
  }
  
  export const generateCartLockKey = (cartId: string): string => {
    return `cart:${cartId}`
  }
  ```

  **Must NOT do:**
  - No implementar locking custom (usar Medusa)
  - No usar timeouts muy cortos
  - No olvidar release del lock (siempre en finally)

  **Recommended Agent Profile:**
  - **Category:** `quick` - Configuración
  - **Skills:** `building-with-medusa`
    - Locking Module de Medusa v2
    - Best practices de distributed locking

  **Parallelization:**
  - **Can Run In Parallel:** ✅ YES
  - **Parallel Group:** Wave 1
  - **Blocks:** Task 5 (necesita locking)
  - **Blocked By:** None

  **References:**
  - `@medusajs/medusa/core-flows` - acquireLockStep, releaseLockStep
  - Ticket Booking Recipe - Patrón de locking

  **Acceptance Criteria:**
  - [ ] Locking Module configurado
  - [ ] Utilidades de lock key creadas
  - [ ] Documentación de uso

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Locking module disponible
    Tool: Bun test
    Steps:
      1. Intentar resolver Locking Module
      2. Assert: No lanza error
    Expected Result: Locking disponible
  ```

  **Commit:** YES
  - Message: `chore(config): setup locking infrastructure`
  - Files: `src/utils/locking.ts`, config

### Wave 2: Core Features

- [x] **Task 5: Implementar locking en workflow de booking**

  **What to do:**
  - Modificar `create-tour-booking.ts` workflow
  - Agregar `acquireLockStep` al inicio
  - Agregar `releaseLockStep` al final (en finally)
  - Usar lock key basado en tour + fecha
  
  **Technical Implementation:**
  ```typescript
  // src/workflows/create-tour-booking.ts
  import { 
    acquireLockStep, 
    releaseLockStep 
  } from "@medusajs/medusa/core-flows"
  import { generateTourLockKey } from "../utils/locking"
  
  export const createTourBookingWorkflow = createWorkflow(
    "create-tour-booking",
    (input: { cart_id: string }) => {
      
      // Obtener items del cart para determinar locks necesarios
      const cartItems = getCartItemsStep({ cart_id: input.cart_id })
      
      // Generar lock keys para cada tour+fecha único
      const lockKeys = transform({ cartItems }, ({ cartItems }) => {
        const keys = new Set()
        cartItems.forEach(item => {
          if (item.metadata?.is_tour) {
            keys.add(generateTourLockKey(
              item.metadata.tour_id,
              item.metadata.tour_date
            ))
          }
        })
        return Array.from(keys)
      })
      
      // Acquire locks
      acquireLockStep({
        keys: lockKeys,
        timeout: 30,
        ttl: 120
      })
      
      try {
        // Complete cart (crea orden) - Ejecuta hook de validación
        const order = completeCartWorkflow.runAsStep({
          input: { id: input.cart_id }
        })
        
        // Crear bookings desde items del carrito (Single Line Item)
        // El step debe parsear metadata para obtener pasajeros
        createBookingsFromCartStep({ 
          cart_id: input.cart_id,
          order_id: order.id 
        })
        
        return new WorkflowResponse({ order_id: order.id })
      } finally {
        // Release locks (siempre ejecutar)
        releaseLockStep({ keys: lockKeys })
      }
    }
  )
  ```

  **Must NOT do:**
  - No olvidar release del lock (siempre en finally)
  - No usar un solo lock para todo (uno por tour+fecha)
  - No bloquear indefinidamente (usar timeout)

  **Recommended Agent Profile:**
  - **Category:** `ultrabrain` - Workflows complejos con locking
  - **Skills:** `building-with-medusa`
    - Workflow orchestration
    - Distributed locking patterns
    - Error handling en workflows

  **Parallelization:**
  - **Can Run In Parallel:** ❌ NO
  - **Parallel Group:** Wave 2
  - **Blocks:** Task 9 (tests de integración)
  - **Blocked By:** Task 2 (hook), Task 4 (locking infrastructure)

  **References:**
  - `src/workflows/create-tour-booking.ts` - Workflow actual
  - `src/utils/locking.ts` - Utilidades (Task 4)
  - Ticket Booking Recipe - Patrón completo
  - `@medusajs/medusa/core-flows` - Steps de locking

  **Acceptance Criteria:**
  - [ ] Workflow adquiere locks antes de procesar
  - [ ] Workflow libera locks en finally
  - [ ] Locks por tour+fecha (no global)
  - [ ] Timeout configurado (30s)
  - [ ] TTL configurado (120s)

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Locking previene overbooking simultáneo
    Tool: Bun test
    Preconditions: Tour con capacidad 1
    Steps:
      1. Iniciar 2 workflows simultáneos para el mismo tour
      2. Primer workflow adquiere lock y completa
      3. Segundo workflow espera o recibe "no disponible"
      4. Assert: Solo 1 booking creado
    Expected Result: No overbooking
  
  Scenario: Locks se liberan después de error
    Tool: Bun test
    Steps:
      1. Iniciar workflow que falla después de adquirir lock
      2. Assert: Error lanzado
      3. Intentar nuevo workflow
      4. Assert: Nuevo workflow puede adquirir lock
    Expected Result: Locks liberados en finally
  ```

  **Commit:** YES
  - Message: `feat(booking): add distributed locking to prevent overbooking`
  - Files: `src/workflows/create-tour-booking.ts`

- [x] **Task 6: Crear widget de calendario en Admin**

  **What to do:**
  - Crear widget React para página de detalle de tour
  - Usar librería de calendario (@mui/x-date-pickers o react-big-calendar)
  - Mostrar días disponibles, ocupados, completos
  - Permitir navegación por meses
  
  **Technical Implementation:**
  ```tsx
  // src/modules/tour-booking/admin/widgets/tour-calendar-widget.tsx
  import { useAdminQuery } from "@medusajs/framework/react"
  import { Container, Heading } from "@medusajs/ui"
  import { DateCalendar } from "@mui/x-date-pickers"
  import dayjs from "dayjs"
  
  export function TourCalendarWidget({ tour }: { tour: any }) {
    const [selectedMonth, setSelectedMonth] = useState(dayjs())
    
    // Fetch availability for current month
    const { data: availability } = useAdminQuery(
      `/admin/tours/${tour.id}/availability`,
      {
        query: {
          start_date: selectedMonth.startOf("month").format("YYYY-MM-DD"),
          end_date: selectedMonth.endOf("month").format("YYYY-MM-DD")
        }
      }
    )
    
    const getDayAvailability = (date: Dayjs) => {
      const dateStr = date.format("YYYY-MM-DD")
      return availability?.availability?.find(
        (a: any) => a.date === dateStr
      )
    }
    
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Disponibilidad</Heading>
        </div>
        <div className="px-6 py-4">
          <DateCalendar
            value={selectedMonth}
            onChange={setSelectedMonth}
            onMonthChange={setSelectedMonth}
            slots={{
              day: (props) => {
                const avail = getDayAvailability(props.day)
                const isFull = avail?.available === 0
                const isPartial = avail?.available < tour.capacity * 0.2
                
                return (
                  <Badge 
                    color={isFull ? "red" : isPartial ? "orange" : "green"}
                  >
                    {props.day.date()}
                  </Badge>
                )
              }
            }}
          />
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Pocas plazas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Completo</span>
            </div>
          </div>
        </div>
      </Container>
    )
  }
  
  // Register widget
  export const config = {
    zone: "tour.details.side",
  }
  ```

  **Must NOT do:**
  - No hacer fetch de todas las fechas (paginar por mes)
  - No bloquear UI mientras carga
  - No hardcodear colores (usar tema de Medusa)

  **Recommended Agent Profile:**
  - **Category:** `visual-engineering` - UI components
  - **Skills:** `building-admin-dashboard-customizations`, `frontend-ui-ux`
    - Widgets de Medusa Admin
    - Componentes React con Medusa UI
    - Integración con librerías de calendario

  **Parallelization:**
  - **Can Run In Parallel:** ✅ YES
  - **Parallel Group:** Wave 2
  - **Blocks:** None
  - **Blocked By:** Task 3 (API de disponibilidad)

  **References:**
  - `src/api/admin/tours/[id]/availability/route.ts` - API endpoint (Task 3)
  - Medusa Admin Widgets documentation
  - @medusajs/ui - Component library
  - @mui/x-date-pickers - Calendario

  **Acceptance Criteria:**
  - [ ] Widget aparece en página de detalle de tour
  - [ ] Muestra calendario mensual
  - [ ] Días coloreados según disponibilidad
  - [ ] Navegación por meses funciona
  - [ ] Leyenda de colores visible
  - [ ] Carga datos de API

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Widget carga en Admin
    Tool: Playwright
    Steps:
      1. Login a Admin
      2. Navegar a Tours > [Tour específico]
      3. Assert: Widget de calendario visible
      4. Assert: Calendario muestra mes actual
    Expected Result: Widget renderizado
    Evidence: .sisyphus/evidence/admin-calendar-widget.png
  
  Scenario: Días coloreados según disponibilidad
    Tool: Playwright
    Preconditions: Tour con fecha completa y fecha disponible
    Steps:
      1. Ver calendario
      2. Assert: Fecha completa tiene clase/bg rojo
      3. Assert: Fecha disponible tiene clase/bg verde
    Expected Result: Colores correctos
    Evidence: .sisyphus/evidence/calendar-colors.png
  
  Scenario: Navegación por meses
    Tool: Playwright
    Steps:
      1. Click en botón "mes siguiente"
      2. Assert: Calendario muestra mes siguiente
      3. Assert: Nuevos datos cargados (API call)
    Expected Result: Navegación funciona
  ```

  **Commit:** YES
  - Message: `feat(admin): add availability calendar widget for tours`
  - Files: `src/modules/tour-booking/admin/widgets/tour-calendar-widget.tsx`

- [x] **Task 7: Crear dashboard de reservas**

  **What to do:**
  - Crear página de Admin para ver todas las reservas
  - Tabla con filtros (por tour, fecha, estado)
  - Métricas: total reservas, ocupación, ingresos
  - Exportar a CSV
  
  **Technical Implementation:**
  ```tsx
  // src/modules/tour-booking/admin/routes/reservations/page.tsx
  import { useAdminQuery } from "@medusajs/framework/react"
  import { Container, Table, Button, DatePicker } from "@medusajs/ui"
  
  export default function ReservationsPage() {
    const [filters, setFilters] = useState({
      tour_id: "",
      start_date: "",
      end_date: "",
      status: ""
    })
    
    const { data: reservations } = useAdminQuery(
      "/admin/tour-bookings",
      { query: filters }
    )
    
    return (
      <Container>
        <div className="flex items-center justify-between mb-6">
          <Heading level="h1">Reservas</Heading>
          <Button variant="secondary" onClick={exportCSV}>
            Exportar CSV
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select
            value={filters.tour_id}
            onChange={(v) => setFilters({ ...filters, tour_id: v })}
            options={tours}
          />
          <DatePicker
            value={filters.start_date}
            onChange={(v) => setFilters({ ...filters, start_date: v })}
          />
          {/* ... */}
        </div>
        
        {/* Table */}
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Tour</Table.HeaderCell>
              <Table.HeaderCell>Fecha</Table.HeaderCell>
              <Table.HeaderCell>Cliente</Table.HeaderCell>
              <Table.HeaderCell>Pasajeros</Table.HeaderCell>
              <Table.HeaderCell>Total</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {reservations?.map((r) => (
              <Table.Row key={r.id}>
                <Table.Cell>{r.tour.name}</Table.Cell>
                <Table.Cell>{formatDate(r.tour_date)}</Table.Cell>
                <Table.Cell>{r.customer.email}</Table.Cell>
                <Table.Cell>{r.quantity}</Table.Cell>
                <Table.Cell>{formatPrice(r.total)}</Table.Cell>
                <Table.Cell>
                  <Badge color={getStatusColor(r.status)}>
                    {r.status}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    )
  }
  ```

  **Must NOT do:**
  - No cargar todas las reservas (usar paginación)
  - No exponer datos sensibles
  - No hardcodear estilos

  **Recommended Agent Profile:**
  - **Category:** `visual-engineering` - Admin UI
  - **Skills:** `building-admin-dashboard-customizations`
    - Rutas personalizadas en Admin
    - Tablas y filtros con Medusa UI
    - Queries de Admin

  **Parallelization:**
  - **Can Run In Parallel:** ✅ YES
  - **Parallel Group:** Wave 2
  - **Blocks:** None
  - **Blocked By:** Task 3 (API de disponibilidad)

  **References:**
  - Medusa Admin Routes documentation
  - @medusajs/ui - Table, filters
  - `src/api/admin/tour-bookings/` - API para listado

  **Acceptance Criteria:**
  - [ ] Página accesible en Admin > Reservas
  - [ ] Tabla muestra reservas con paginación
  - [ ] Filtros funcionan (tour, fecha, estado)
  - [ ] Exportar a CSV funciona
  - [ ] Métricas visibles

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Página de reservas carga
    Tool: Playwright
    Steps:
      1. Login a Admin
      2. Click en menú "Reservas"
      3. Assert: Tabla de reservas visible
      4. Assert: Filtros presentes
    Expected Result: Página carga correctamente
    Evidence: .sisyphus/evidence/reservations-page.png
  
  Scenario: Filtrar por tour
    Tool: Playwright
    Steps:
      1. Seleccionar tour específico en filtro
      2. Assert: Tabla solo muestra reservas de ese tour
      3. Assert: Contador actualiza
    Expected Result: Filtro funciona
  
  Scenario: Exportar a CSV
    Tool: Playwright
    Steps:
      1. Click botón "Exportar CSV"
      2. Assert: Archivo descargado
      3. Assert: CSV contiene datos correctos
    Expected Result: Exportación exitosa
  ```

  **Commit:** YES
  - Message: `feat(admin): add reservations dashboard with filters and export`
  - Files: `src/modules/tour-booking/admin/routes/reservations/page.tsx`

### Wave 3: Refinamiento

- [ ] **Task 8: Refactorizar package/ para eliminar duplicación**

  **What to do:**
  - Analizar si `package/` y `tour-booking/` pueden consolidarse
  - Opciones:
    - A. Eliminar `package/` y usar `tour-booking/` para ambos
    - B. Crear módulo base abstracto que ambos extiendan
    - C. Mantener separados pero extraer lógica común
  - Implementar refactorización elegida
  
  **Decision:** Basándome en el código, recomiendo **Opción A** - consolidar en `tour-booking/` con un campo `type: 'tour' | 'package'`

  **Must NOT do:**
  - No romper APIs existentes (mantener compatibilidad)
  - No perder datos existentes (migración)
  - No duplicar código innecesariamente

  **Recommended Agent Profile:**
  - **Category:** `deep` - Refactorización cuidadosa
  - **Skills:** `building-with-medusa`
    - Refactoring de módulos
    - Migraciones de datos
    - Backwards compatibility

  **Parallelization:**
  - **Can Run In Parallel:** ✅ YES
  - **Parallel Group:** Wave 3
  - **Blocks:** None
  - **Blocked By:** None (puede hacerse en paralelo con Wave 2)

  **References:**
  - `src/modules/tour-booking/` - Código base
  - `src/modules/package/` - Código a consolidar
  - Module Links existentes

  **Acceptance Criteria:**
  - [ ] Duplicación eliminada
  - [ ] Tests pasan
  - [ ] APIs mantienen compatibilidad
  - [ ] Datos migrados correctamente

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Endpoints de package siguen funcionando
    Tool: Bash (curl)
    Steps:
      1. Llamar endpoint de package
      2. Assert: Status 200
      3. Assert: Respuesta correcta
    Expected Result: Backwards compatibility
  ```

  **Commit:** YES
  - Message: `refactor(tour): consolidate package into tour-booking module`
  - Files: Múltiples (refactorización)

- [x] **Task 9: Tests de integración para race conditions**

  **What to do:**
  - Crear tests que simulen múltiples reservas simultáneas
  - Verificar que locking funciona correctamente
  - Medir tiempo de respuesta bajo carga
  
  **Must NOT do:**
  - No tests que dependan de timing exacto
  - No dejar locks sin liberar en tests

  **Recommended Agent Profile:**
  - **Category:** `ultrabrain` - Testing complejo
  - **Skills:** `building-with-medusa`
    - Integration testing
    - Parallel execution testing
    - Race condition testing

  **Parallelization:**
  - **Can Run In Parallel:** ❌ NO
  - **Parallel Group:** Wave 3
  - **Blocks:** None
  - **Blocked By:** Task 5 (locking implementado)

  **Acceptance Criteria:**
  - [ ] Test de concurrencia pasa
  - [ ] No hay overbooking en prueba
  - [ ] Tiempos de respuesta aceptables

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Test de carga concurrente
    Tool: Bun test
    Steps:
      1. Crear tour con capacidad 5
      2. Ejecutar 10 requests simultáneos de reserva (3 pasajeros cada uno)
      3. Assert: Solo 1-2 reservas exitosas (máx 5 pasajeros)
      4. Assert: Resto recibe error "sin disponibilidad"
    Expected Result: Locking funciona
  ```

  **Commit:** YES
  - Message: `test(integration): add race condition tests`
  - Files: `src/__tests__/tour-booking/race-conditions.test.ts`

- [x] **Task 10: Documentación técnica y de uso**

  **What to do:**
  - Documentar arquitectura del sistema
  - Documentar API endpoints
  - Crear guía de uso para el admin
  - Documentar decisiones técnicas

  **Must NOT do:**
  - No documentar lo obvio
  - No dejar sin documentar edge cases

  **Recommended Agent Profile:**
  - **Category:** `writing` - Documentación
  - **Skills:** N/A

  **Parallelization:**
  - **Can Run In Parallel:** ✅ YES
  - **Parallel Group:** Wave 3
  - **Blocks:** None
  - **Blocked By:** None

  **Acceptance Criteria:**
  - [ ] README actualizado
  - [ ] API documentada
  - [ ] Guía de admin creada
  - [ ] Decisiones documentadas

  **Commit:** YES
  - Message: `docs: add technical documentation and usage guide`
  - Files: `docs/`

---

## Success Criteria

### Verification Commands

```bash
# 1. Proyecto compila sin errores
bun run build

# 2. Tests pasan
bun test

# 3. Endpoints responden
curl http://localhost:9000/admin/tours/tour_123/availability

# 4. Admin dashboard carga
# (Verificar visualmente con Playwright)

# 5. No hay código duplicado
# (Análisis estático)
```

### Final Checklist
- [x] `/customcart/` eliminado
- [x] Validación en checkout implementada
- [x] Locking funciona (sin overbooking)
- [x] Widget de calendario en Admin
- [x] Dashboard de reservas funcional
- [x] API de disponibilidad optimizada
- [ ] Package/ consolidado con tour-booking/ (PENDIENTE - Task 8)
- [x] Tests de integración pasan
- [x] Documentación completa
- [x] Proyecto compila y despliega

---

## Architecture Decisions

### Decision 1: Extender cart nativo vs crear carrito paralelo
**Elegido:** Extender cart nativo mediante metadata
**Rationale:** 
- Patrón oficial de Medusa v2 (Ticket Booking Recipe)
- Mantiene integración con taxes, promotions, payments
- Menos código a mantener
- Reutiliza validaciones existentes

### Decision 1.5: Single Line Item vs Múltiples Items por Tipo
**Elegido:** Single Line Item (1 item = 1 reserva grupal)
**Rationale:**
- Tours son compras grupales por naturaleza (nadie viaja solo)
- Más simple visualmente en el carrito
- Facilita editar/cancelar la reserva completa como una unidad
- Metadata contiene desglose completo de pasajeros y precios
- Hook de validación parsea metadata para contar total de pasajeros

**Trade-offs aceptados:**
- Lógica custom para calcular precios (no Pricing Module nativo por tipo)
- Metadata más compleja (incluye breakdown)
- Checkout debe entender estructura de metadata

### Decision 2: Validación en dos puntos (add + checkout)
**Elegido:** Validar en ambos puntos
**Rationale:**
- Validación en add: UX inmediata
- Validación en checkout: Previene race conditions
- Hook en workflow no afecta performance

### Decision 3: Locking por tour+fecha vs lock global
**Elegido:** Lock por tour+fecha
**Rationale:**
- Máxima concurrencia (diferentes tours no se bloquean)
- Diferentes fechas del mismo tour no se bloquean
- Key: `tour:${tourId}:${date}`

### Decision 4: Calendario con @mui/x-date-pickers
**Elegido:** Material UI Date Pickers
**Rationale:**
- Integración nativa con React
- Buena documentación
- Customizable
- Alternativa: react-big-calendar (más pesado)

### Decision 5: Consolidar package/ con tour-booking/
**Elegido:** Unificar en tour-booking/ con campo `type`
**Rationale:**
- Elimina duplicación de código
- Mantiene APIs existentes (backwards compatible)
- Simplifica mantenimiento

---

## Risk Assessment

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Race conditions en producción | Media | Alto | Testing exhaustivo de locking |
| Breaking changes en APIs | Baja | Alto | Mantener backwards compatibility |
| Performance de queries | Media | Medio | Índices, paginación, caching |
| Complejidad del locking | Media | Medio | Documentación, logs claros |

## Issues Técnicos Detectados (Pre-existentes)

Durante la generación del plan, se detectaron los siguientes errores de TypeScript en código existente:

### 1. `create-tour-booking.ts` (Línea 113)
```
Excessive stack depth comparing types 'OrderLineItem[]'
```
**Impacto:** Workflow puede no compilar correctamente
**Acción:** Requiere fix como parte del Task 5

### 2. `create-booking-create.ts` (Líneas 61-64)
```
'item.items' is of type 'unknown'
'line_items' does not exist in type
```
**Impacto:** Step incompleto/fallando
**Acción:** Requiere fix como parte del Task 5

**Nota:** Estos errores serán corregidos durante la implementación del plan.

---

## Appendix: File Structure (Final)

```
src/
├── api/
│   ├── admin/
│   │   └── tours/
│   │       └── [id]/
│   │           ├── availability/
│   │           │   └── route.ts          # Task 3
│   │           └── route.ts
│   └── store/
│       └── cart/
│           └── tour-items/
│               └── route.ts              # Existente (mantener)
├── modules/
│   └── tour-booking/
│       ├── admin/
│       │   ├── routes/
│       │   │   └── reservations/
│       │   │       └── page.tsx          # Task 7
│       │   └── widgets/
│       │       └── tour-calendar-widget.tsx  # Task 6
│       ├── models/
│       │   ├── tour.ts
│       │   ├── tour-booking.ts
│       │   └── tour-variant.ts
│       ├── service.ts
│       └── index.ts
├── workflows/
│   ├── hooks/
│   │   └── validate-tour-capacity.ts     # Task 2
│   ├── create-tour-booking.ts            # Task 5 (modificado)
│   └── create-tour.ts
└── utils/
    └── locking.ts                        # Task 4
```

**Notas:**
- `/customcart/` eliminado
- `/package/` consolidado en `/tour-booking/`
- Código organizado según best practices de Medusa v2
