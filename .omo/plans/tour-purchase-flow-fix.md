# Plan: Fix Tour Purchase Flow Integration Test (CORREGIDO)

## TL;DR

**Quick Summary**: Corregir el test de integración `integration-tests/http/tour-purchase-flow.spec.ts`. El import del workflow ES CORRECTO, pero hay errores de tipos (blocked_week_days) y falta shipping setup.

**Deliverables**:
- Test corregido con shipping setup completo
- Fix de tipos en blocked_week_days (array de strings, no números)
- Simplificación del payment flow
- Casos de éxito + validaciones de negocio funcionando

**Estimated Effort**: Medium (4-5 tasks)
**Parallel Execution**: NO - Secuencial
**Critical Path**: Fix tipos → Add shipping → Fix payment → Fix metadata → Full test run

---

## Context

### Corrección Crítica Descubierta
Los errores LSP revelaron que:
1. ✅ **El import ES CORRECTO**: `../../src/modules/tour/workflows/create-tour-booking` 
2. ❌ **Error de tipos**: `blocked_week_days` debe ser `string[]` no `number[]`
3. ❌ **Falta shipping setup**: El workflow necesita fulfillment para crear órdenes
4. ❌ **Payment flow**: Demasiado complejo, debe simplificarse

### Infrastructure Existente
- **Tour Module**: Models (Tour, TourBooking, TourVariant), Service, Workflow
- **Workflow**: `completeCartWithToursWorkflow` en `src/modules/tour/workflows/create-tour-booking.ts`
- **Steps**: validate-tour-booking, create-booking-create, create-order-from-cart
- **Link**: tour-booking-order entre TourBooking y Order

### Modelos de Datos
```typescript
// Tour (src/modules/tour/models/tour.ts)
{
  blocked_dates: string[]      // ej: ["2026-04-15"]
  blocked_week_days: string[]  // ej: ["0", "1"] (0=Domingo, strings!)
  booking_min_days_ahead: number
  max_capacity: number
}

// TourBooking (src/modules/tour/models/tour-booking.ts)
{
  order_id: string
  tour_id: string
  tour_date: Date
  status: "pending" | "confirmed" | "cancelled" | "completed"
  line_items: JSON
}
```

### Errores Actuales Identificados

| Error | Ubicación | Solución |
|-------|-----------|----------|
| Type 'number' not assignable to 'string' | Line 376: `blocked_week_days: [dayOfWeek]` | Usar `blocked_week_days: [dayOfWeek.toString()]` |
| 'item' is possibly 'null' | validate-tour-booking.ts:40 | Agregar check de null |
| Cannot find module '../../src/workflows/create-tour-booking' | tour-booking-locking.spec.ts:5 | El workflow está en modules/tour/workflows/ |

---

## Work Objectives

### Core Objective
Corregir el test para que compile y ejecute exitosamente todos los casos de compra de tours con validaciones.

### Concrete Deliverables
1. Test compilando sin errores de TypeScript
2. Shipping setup completo (profile, option, method)
3. Payment flow simplificado
4. Todos los casos de éxito pasando
5. Todos los casos de validación rechazando correctamente

### Definition of Done
- [ ] `bun tsc --noEmit` pasa sin errores
- [ ] Test suite completo pasa (`bun test tour-purchase-flow.spec.ts`)
- [ ] Todos los casos de validación funcionan
- [ ] Cleanup de datos funciona correctamente

### Must Have
- Shipping setup completo en beforeEach
- Corrección de tipos en blocked_week_days
- Simplificación del payment flow
- Casos: compra simple, fechas bloqueadas, días bloqueados, capacidad, anticipación, fechas pasadas

### Must NOT Have
- No cambiar el import del workflow (ya es correcto)
- No modificar el workflow o steps existentes
- No cambiar modelos de datos

---

## Verification Strategy

### Agent-Executed QA Scenarios

**Scenario: Compilación exitosa**
```
Tool: Bash
Steps:
  1. bun tsc --noEmit integration-tests/http/tour-purchase-flow.spec.ts 2>&1
  2. Verificar: No errors
Expected: Compilación limpia
Evidence: .sisyphus/evidence/compile.log
```

**Scenario: Test suite completo**
```
Tool: Bash
Steps:
  1. bun test integration-tests/http/tour-purchase-flow.spec.ts 2>&1 | tee test.log
  2. Verificar: "PASS" o todos los ✓
Expected: Todos los tests pasan
Evidence: .sisyphus/evidence/test-full.log
```

---

## TODOs

### Task 1: Corregir Errores de Tipos en el Test

**What to do**:
El error LSP indica:
```
Type 'number' is not assignable to type 'string'
```

En el test hay:
```typescript
await tourModuleService.updateTours({
  id: tour.id,
  blocked_week_days: [dayOfWeek]  // dayOfWeek es number, pero debe ser string
})
```

Cambiar a:
```typescript
await tourModuleService.updateTours({
  id: tour.id,
  blocked_week_days: [dayOfWeek.toString()]
})
```

**Ubicaciones a corregir:**
- Line ~376: blocked_week_days en test de "blocked weekday"
- Verificar otras ocurrencias de blocked_week_days

**Must NOT do**:
- No cambiar el tipo en el modelo (ya es correcto)
- No usar parseInt o conversiones innecesarias

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: Ninguno especial
- **Justification**: Cambio simple de tipo

**Parallelization**:
- **Can Run In Parallel**: NO (prerequisite)
- **Blocks**: Tasks 2, 3, 4, 5
- **Blocked By**: None

**References**:
- Error LSP: Line 376, `blocked_week_days: [dayOfWeek]`
- Modelo: `src/modules/tour/models/tour.ts:16` - `blocked_week_days: model.array().default([])`

**Acceptance Criteria**:
- [ ] Error de tipo en blocked_week_days corregido
- [ ] `bun tsc --noEmit` no muestra error de tipo en updateTours

**Agent-Executed QA**:
```bash
# Verificar corrección
grep -n "blocked_week_days" integration-tests/http/tour-purchase-flow.spec.ts
# Debe mostrar .toString() o similar

# Compilar
bun tsc --noEmit integration-tests/http/tour-purchase-flow.spec.ts 2>&1 | head -20
```

**Commit**: YES
- Message: `test(integration): fix type error in blocked_week_days`
- Files: `integration-tests/http/tour-purchase-flow.spec.ts`

---

### Task 2: Agregar Shipping Setup Completo

**What to do**:
El workflow necesita fulfillment para crear órdenes. Agregar:

1. **En beforeAll**: Resolver `Modules.FULFILLMENT`
```typescript
fulfillmentModule: any = container.resolve(Modules.FULFILLMENT)
```

2. **En beforeEach**: Crear shipping profile y option
```typescript
// Crear shipping profile
shippingProfile = await fulfillmentModule.createShippingProfiles({
  name: "Test Shipping Profile",
  type: "default",
})

// Crear shipping option
shippingOption = await fulfillmentModule.createShippingOptions({
  name: "Standard Shipping",
  service_zone_id: region.id,
  shipping_profile_id: shippingProfile.id,
  provider_id: "manual_manual",
  price_type: "flat",
  type: {
    label: "Standard",
    description: "Standard shipping",
    code: "standard",
  },
})
```

3. **En createCartWithTour helper**: Agregar shipping address y method
```typescript
// Agregar al crear cart:
shipping_address: {
  first_name: "Test",
  last_name: "Customer",
  address_1: "123 Test St",
  city: "Test City",
  country_code: "us",
  postal_code: "12345",
}

// Después de crear cart:
await cartModule.addShippingMethod({
  cart_id: cart.id,
  option_id: shippingOption.id,
})
```

4. **En afterEach**: Limpiar shipping (antes de borrar region)
```typescript
await fulfillmentModule.deleteShippingOptions(shippingOption.id)
await fulfillmentModule.deleteShippingProfiles(shippingProfile.id)
```

**Must NOT do**:
- No omitir el shipping address (requerido)
- No olvidar agregar shipping method al cart

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `building-with-medusa`
- **Justification**: Setup de fulfillment requiere entender relaciones Medusa

**Parallelization**:
- **Can Run In Parallel**: NO (depends on Task 1)
- **Blocks**: Tasks 3, 4, 5
- **Blocked By**: Task 1

**References**:
- `tour-booking-locking.spec.ts:28-32` - Declaración fulfillmentModule
- `tour-booking-locking.spec.ts:74-99` - Create shipping profile/option
- `tour-booking-locking.spec.ts:220-230` - Shipping address
- `tour-booking-locking.spec.ts:261-265` - addShippingMethod
- `tour-booking-locking.spec.ts:176-177` - Cleanup

**Acceptance Criteria**:
- [ ] fulfillmentModule resuelto en beforeAll
- [ ] shippingProfile creado en beforeEach
- [ ] shippingOption creado con provider "manual_manual"
- [ ] shipping address en createCartWithTour
- [ ] addShippingMethod llamado después de crear cart
- [ ] Cleanup de shipping en afterEach

**Agent-Executed QA**:
```bash
# Verificar shipping setup
grep -n "FULFILLMENT\|shippingProfile\|shippingOption\|addShippingMethod\|shipping_address" \
  integration-tests/http/tour-purchase-flow.spec.ts | head -20

# Compilar para verificar tipos
bun tsc --noEmit integration-tests/http/tour-purchase-flow.spec.ts 2>&1 | grep -i "shipping\|fulfillment"
```

**Commit**: YES
- Message: `test(integration): add shipping setup for tour purchase test`
- Files: `integration-tests/http/tour-purchase-flow.spec.ts`

---

### Task 3: Simplificar Payment Flow

**What to do**:
El helper `createCartWithTour` actualmente:
1. Crea payment collection manualmente
2. Crea payment session manualmente

El workflow `completeCartWithToursWorkflow` incluye `createOrderFromCartStep` que:
1. Lista payment sessions del cart
2. Autoriza el payment session
3. Crea la orden

**Simplificación**: Eliminar la creación manual de payment collection y session. El workflow maneja el payment internamente.

**Cambios en createCartWithTour:**
```typescript
// ELIMINAR:
// - createPaymentCollectionForCartWorkflow call
// - paymentModule.createPaymentSession call
// - Query de payment_collection

// MANTENER:
// - Cart creation con items y metadata
// - Shipping address
// - addShippingMethod
```

**Must NOT do**:
- No crear payment session manualmente
- No llamar createPaymentCollectionForCartWorkflow

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `building-with-medusa`
- **Justification**: Entender flujo de payment de Medusa

**Parallelization**:
- **Can Run In Parallel**: NO (depends on Task 2)
- **Blocks**: Tasks 4, 5
- **Blocked By**: Task 2

**References**:
- `src/workflows/steps/create-order-from-cart.ts:40-50` - Workflow maneja payment
- `tour-booking-locking.spec.ts:187-267` - createCartWithTour sin payment manual
- `tour-purchase-flow.spec.ts:284-305` - Payment manual a eliminar

**Acceptance Criteria**:
- [ ] Eliminada creación manual de payment collection
- [ ] Eliminada creación manual de payment session
- [ ] Helper solo crea cart con items y shipping
- [ ] Workflow se ejecuta sin errores de payment

**Agent-Executed QA**:
```bash
# Verificar que no hay payment manual
grep -n "createPayment\|paymentSession\|authorizePayment" \
  integration-tests/http/tour-purchase-flow.spec.ts
# Debe retornar vacío o solo referencias en comentarios

# Verificar createCartWithTour simplificado
grep -A 30 "async function createCartWithTour" \
  integration-tests/http/tour-purchase-flow.spec.ts | head -40
```

**Commit**: YES
- Message: `test(integration): simplify payment flow in tour purchase test`
- Files: `integration-tests/http/tour-purchase-flow.spec.ts`

---

### Task 4: Corregir Metadata Structure

**What to do**:
Verificar que la metadata de los items del cart tenga la estructura correcta que esperan los steps.

**Estructura requerida por validateTourBookingStep:**
```typescript
metadata: {
  is_tour: true,
  tour_id: string,
  tour_date: string,  // "YYYY-MM-DD"
  total_passengers: number,  // > 0
  passengers: {
    adults: number,
    children: number,
    infants: number,
  }
}
```

**Estructura requerida por createTourBookingsStep:**
```typescript
metadata: {
  group_id: string,  // para agrupar items
  tour_date: string,
  // ... lo anterior
}
```

**Verificar en createCartWithTour:**
- Cada item tiene `is_tour: true`
- Cada item tiene `tour_id`, `tour_date` válidos
- `total_passengers` > 0
- `group_id` consistente para items del mismo tour/fecha

**Must NOT do**:
- No cambiar nombres de propiedades en metadata
- No usar formatos de fecha diferentes

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `building-with-medusa`
- **Justification**: Contrato entre test y workflow steps

**Parallelization**:
- **Can Run In Parallel**: NO (depends on Task 3)
- **Blocks**: Tasks 5
- **Blocked By**: Task 3

**References**:
- `src/workflows/steps/validate-tour-booking.ts:33-70` - Validación de metadata
- `src/workflows/steps/create-booking-create.ts:34-53` - Uso de metadata
- `tour-booking-locking.spec.ts:231-258` - Metadata correcta

**Acceptance Criteria**:
- [ ] Todos los items tienen is_tour, tour_id, tour_date
- [ ] total_passengers > 0 en todos los items
- [ ] group_id presente y consistente
- [ ] Formato de fecha es string "YYYY-MM-DD"

**Agent-Executed QA**:
```bash
# Verificar metadata
grep -A 25 "metadata:" integration-tests/http/tour-purchase-flow.spec.ts | head -60
```

**Commit**: YES
- Message: `test(integration): verify metadata structure for tour items`
- Files: `integration-tests/http/tour-purchase-flow.spec.ts`

---

### Task 5: Ejecutar Test Completo y Verificar

**What to do**:
1. Ejecutar compilación: `bun tsc --noEmit`
2. Ejecutar test suite completo
3. Verificar que todos los tests pasen
4. Verificar cleanup funciona
5. Capturar evidence

**Tests a verificar:**
- ✅ "should complete full purchase flow for a single adult passenger"
- ✅ "should reject booking for blocked date"
- ✅ "should reject booking for blocked weekday"
- ✅ "should reject booking when capacity is exceeded"
- ✅ "should reject booking when min days ahead not met"
- ✅ "should reject booking for past dates"

**Must NOT do**:
- No ignorar tests fallidos
- No dejar datos de prueba en DB

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: Ninguno
- **Justification**: Ejecución y verificación

**Parallelization**:
- **Can Run In Parallel**: NO (depends on Tasks 1-4)
- **Blocks**: None (final)
- **Blocked By**: Tasks 1, 2, 3, 4

**Acceptance Criteria**:
- [ ] Compilación sin errores
- [ ] Todos los tests pasan
- [ ] Cleanup funciona
- [ ] Tiempo < 120s

**Agent-Executed QA**:
```bash
# Compilación
bun tsc --noEmit integration-tests/http/tour-purchase-flow.spec.ts 2>&1 | tee .sisyphus/evidence/final-compile.log

# Test completo
bun test integration-tests/http/tour-purchase-flow.spec.ts 2>&1 | tee .sisyphus/evidence/final-test.log

# Verificar éxito
echo $?  # Debe ser 0
```

**Commit**: YES
- Message: `test(integration): verify complete tour purchase flow test suite`
- Files: `integration-tests/http/tour-purchase-flow.spec.ts`

---

## Commit Strategy

| Task | Message | Files |
|------|---------|-------|
| 1 | `test(integration): fix type error in blocked_week_days` | tour-purchase-flow.spec.ts |
| 2 | `test(integration): add shipping setup for tour purchase test` | tour-purchase-flow.spec.ts |
| 3 | `test(integration): simplify payment flow in tour purchase test` | tour-purchase-flow.spec.ts |
| 4 | `test(integration): verify metadata structure for tour items` | tour-purchase-flow.spec.ts |
| 5 | `test(integration): verify complete tour purchase flow test suite` | tour-purchase-flow.spec.ts |

---

## Success Criteria

### Comandos de Verificación
```bash
# 1. Compilación limpia
bun tsc --noEmit integration-tests/http/tour-purchase-flow.spec.ts
# Expected: Sin errores

# 2. Test completo
bun test integration-tests/http/tour-purchase-flow.spec.ts
# Expected: All tests pass

# 3. Test específicos
bun test integration-tests/http/tour-purchase-flow.spec.ts -t "single adult"
bun test integration-tests/http/tour-purchase-flow.spec.ts -t "blocked date"
bun test integration-tests/http/tour-purchase-flow.spec.ts -t "blocked weekday"
bun test integration-tests/http/tour-purchase-flow.spec.ts -t "capacity"
bun test integration-tests/http/tour-purchase-flow.spec.ts -t "min days"
bun test integration-tests/http/tour-purchase-flow.spec.ts -t "past dates"
```

### Checklist Final
- [ ] ✅ Compilación sin errores de TypeScript
- [ ] ✅ Test de compra simple pasa
- [ ] ✅ Test de fecha bloqueada rechaza correctamente
- [ ] ✅ Test de día de semana bloqueado rechaza correctamente
- [ ] ✅ Test de capacidad excedida rechaza correctamente
- [ ] ✅ Test de días mínimos rechaza correctamente
- [ ] ✅ Test de fechas pasadas rechaza correctamente
- [ ] ✅ Cleanup funciona sin errores
- [ ] ✅ Tiempo total < 120 segundos

---

## Correcciones Aplicadas al Plan Original

| Issue Original | Corrección |
|----------------|------------|
| Cambiar import a `../../src/workflows/create-tour-booking` | **NO** - El import actual es correcto |
| Error de tipo en blocked_week_days | **SÍ** - Agregar `.toString()` |
| Falta shipping setup | **SÍ** - Agregar fulfillmentModule y shipping |
| Payment flow complejo | **SÍ** - Simplificar, dejar que workflow lo maneje |

**Nota**: El test `tour-booking-locking.spec.ts` tiene un import incorrecto (busca en `../../src/workflows/` cuando el workflow está en `../../src/modules/tour/workflows/`). El test `tour-purchase-flow.spec.ts` ya tiene el import correcto.
