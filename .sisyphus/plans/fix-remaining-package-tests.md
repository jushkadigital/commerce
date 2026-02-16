# Plan: Fix Remaining Package Tests

## TL;DR

**Problem**: Dos tests fallan en package-purchase-flow.spec.ts:
1. "Multiple packages in same cart" - Error de configuración de producto (faltan opciones)
2. "Capacity exceeded" - Race condition con validación de capacidad en paralelo

**Solution**:
1. **Issue 1**: Agregar opciones al crear el producto (similar al beforeEach principal)
2. **Issue 2**: Cambiar a ejecución secuencial o mejorar el mecanismo de locking/validación

---

## Issue 1: Multiple Packages in Same Cart

### Error Actual
```
Product has 0 option values but there were 1 provided option values for the variant: Adult Ticket
```

### Causa
El test crea `product2` SIN opciones:
```typescript
const product2 = await productModule.createProducts({
  title: "Lima City Package",
  description: "Lima city tour package",
  status: "published",
  sales_channels: [{ id: salesChannel.id }],
  // ❌ Faltan opciones aquí!
})
```

Pero luego crea el variant CON opciones:
```typescript
const variant2 = await productModule.createProductVariants({
  product_id: product2.id,
  title: "Adult Ticket",
  sku: "LIMA-ADULT-001",
  options: {
    passenger_type: "adult",  // ← Opción que no existe en el producto
  },
})
```

### Fix
Agregar las opciones al crear `product2` (como se hace en el beforeEach):
```typescript
const product2 = await productModule.createProducts({
  title: "Lima City Package",
  description: "Lima city tour package",
  status: "published",
  sales_channels: [{ id: salesChannel.id }],
  options: [  // ← AGREGAR ESTO
    {
      title: "Passenger Type",
      values: ["Adult", "Child", "Infant"],
    },
  ],
})
```

---

## Issue 2: Capacity Exceeded Test

### Problema Actual
El test usa `Promise.allSettled` para ejecutar 11 workflows en paralelo:
```typescript
const results = await Promise.allSettled(
  carts.map((cart) =>
    completeCartWithPackagesWorkflow(container).run({
      input: { cart_id: cart.id },
    })
  )
)
```

### Race Condition
1. Los 11 workflows adquieren locks (diferentes cart_ids, mismo package)
2. Todos pasan validación al mismo tiempo (capacidad disponible)
3. Todos crean órdenes
4. Resultado: 11 bookings en lugar de 10

### Soluciones Posibles

#### Opción A: Ejecutar secuencialmente (Simple)
Cambiar `Promise.allSettled` por un loop secuencial:
```typescript
const results: PromiseSettledResult<any>[] = []
for (const cart of carts) {
  try {
    const result = await completeCartWithPackagesWorkflow(container).run({
      input: { cart_id: cart.id },
    })
    results.push({ status: "fulfilled", value: result })
  } catch (error) {
    results.push({ status: "rejected", reason: error })
  }
}
```

#### Opción B: Lock por package (Más complejo)
El lock actual usa `cart_id`, debería usar `package_id + date`:
```typescript
// En el workflow:
acquireLockStep({
  key: `package-${package_id}-${package_date}`,  // ← Lock por package, no por cart
  timeout: 2,
  ttl: 10,
})
```

**Recomendación**: Usar Opción A (más simple, suficiente para tests)

---

## Tasks

### Task 1: Fix "Multiple packages in same cart" test
**File**: `integration-tests/http/package-purchase-flow.spec.ts`
**Line**: ~354

**Changes**:
```typescript
// BEFORE:
const product2 = await productModule.createProducts({
  title: "Lima City Package",
  description: "Lima city tour package",
  status: "published",
  sales_channels: [{ id: salesChannel.id }],
})

// AFTER:
const product2 = await productModule.createProducts({
  title: "Lima City Package",
  description: "Lima city tour package",
  status: "published",
  sales_channels: [{ id: salesChannel.id }],
  options: [
    {
      title: "Passenger Type",
      values: ["Adult", "Child", "Infant"],
    },
  ],
})
```

---

### Task 2: Fix "Capacity exceeded" test - Sequential execution
**File**: `integration-tests/http/package-purchase-flow.spec.ts`
**Lines**: ~478-487

**Changes**:
```typescript
// BEFORE:
const results = await Promise.allSettled(
  carts.map((cart) =>
    completeCartWithPackagesWorkflow(container).run({
      input: {
        cart_id: cart.id,
      },
    })
  )
)

// AFTER:
const results: PromiseSettledResult<any>[] = []
for (const cart of carts) {
  try {
    const result = await completeCartWithPackagesWorkflow(container).run({
      input: {
        cart_id: cart.id,
      },
    })
    results.push({ status: "fulfilled", value: result })
  } catch (error) {
    results.push({ status: "rejected", reason: error })
  }
}
```

---

### Task 3: Verify both tests pass
**Command**:
```bash
npm run test:integration:http -- package-purchase-flow.spec.ts -t "should handle multiple packages in same cart"
npm run test:integration:http -- package-purchase-flow.spec.ts -t "should reject booking when capacity is exceeded"
```

**Expected**: Ambos tests pasan

---

### Task 4: Run full test suite
**Command**:
```bash
npm run test:integration:http -- package-purchase-flow.spec.ts
```

**Expected**: 12/12 tests passing

---

## Success Criteria

- ✅ "Multiple packages in same cart" pasa
- ✅ "Capacity exceeded" pasa  
- ✅ Todos los tests de package-purchase-flow: 12/12 ✅
- ✅ No regressions en otros tests

---

## Notas

- El issue 1 es un error de configuración de test (no de implementación)
- El issue 2 es un problema de diseño de test (paralelismo vs validación)
- Ambos fixes son en el archivo de test, no en el servicio/workflow
