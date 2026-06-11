# Draft: Adaptación de Carrito Medusa para Turismo

## Contexto
El usuario quiere adaptar el carrito de MedusaJS (diseñado para productos físicos) para reservas de tours y paquetes turísticos. Tiene una implementación personalizada en `src/api/store/customcart/`.

## 🎯 Descubrimiento Importante

**El proyecto YA TIENE una implementación completa** en:
- `/src/api/store/cart/tour-items/route.ts` - Endpoint para agregar tours al carrito
- `/src/modules/tour-booking/` - Módulo completo con servicios y modelos
- `/src/workflows/create-tour-booking.ts` - Workflow de carrito a orden

### Estado Actual del Proyecto

#### ✅ Módulos Implementados
1. **Tour Booking Module** (`/src/modules/tour-booking/`)
   - Models: Tour, TourVariant, TourBooking
   - Service: 344 líneas con validación de capacidad, precios, cálculos
   - Funciones: `getAvailableCapacity()`, `validateBooking()`, `getTourPricing()`, `calculateCartTotal()`

2. **Package Module** (`/src/modules/package/`)
   - **NOTA**: Es casi idéntico a tour-booking (código duplicado)
   - Mismo servicio, mismos modelos, misma lógica

#### ✅ API Endpoints
- `POST /store/cart/tour-items` - Agregar tours al carrito con:
  - Validación de fecha y capacidad
  - Tipos de pasajero (ADULT, CHILD, INFANT)
  - Metadatos en line items

#### ✅ Workflows
- `create-tour-booking.ts` - Workflow completo cart→order→booking
- `create-package-booking.ts` - Workflow idéntico para paquetes
- `create-tour.ts` - Creación de tours (7295 líneas)
- Steps para validación, creación, actualización

#### ✅ Module Links (6 links)
- TourBooking ↔ Order
- PackageBooking ↔ Order
- Tour ↔ Product
- Package ↔ Product
- TourVariant ↔ ProductVariant
- PackageVariant ↔ ProductVariant

#### ✅ Configuración
- Medusa v2.12.4
- RabbitMQ para eventos
- Stripe + Izipay para pagos
- Keycloak para autenticación

### ⚠️ Problemas Identificados

1. **Package module duplicado** - 99% idéntico a tour-booking (refactorizar)
2. **Comentarios desactualizados** en `tour-product-helper.ts` menciona conversión a centavos (incorrecto, usa unidades principales)
3. **Step incompleto** - `create-booking-validate.ts` está vacío (0 bytes)
4. **Rutas admin vacías** - placeholders sin implementación

### 🔍 Modelo de Datos Actual

**Tour:**
- destination, duration, capacity, available_dates
- Linked a Product (vía module link)

**TourVariant:**
- passenger_type: ADULT | CHILD | INFANT
- Linked a ProductVariant

**TourBooking:**
- Linked a Order (vía module link)
- Registra la reserva completada

### 💰 Modelo de Precios

- **CORRECTO**: Precios en unidades principales (S/100.00 = 100)
- Usa Pricing Module de Medusa
- Cálculo por tipo de pasajero

## Preguntas Críticas para el Usuario

### 1. Problemas Específicos con Endpoints
¿Qué errores o comportamientos inesperados estás experimentando?
- ¿El endpoint `/store/cart/tour-items` no funciona?
- ¿Las validaciones de capacidad fallan?
- ¿Los precios no se calculan correctamente?
- ¿El workflow de checkout no completa la orden?
- ¿Los bookings no se crean después del pago?

### 2. Alcance del Problema
- ¿El código actual no funciona o falta funcionalidad?
- ¿Necesitas modificar endpoints existentes o crear nuevos?
- ¿Hay errores específicos que puedas compartir?

### 3. ¿Dónde está `customcart/`?
- ¿Es un directorio que planeabas crear?
- ¿O es un error y el código ya está en `src/api/store/cart/`?
- ¿Necesitas migrar código de otro lugar?

### 4. Frontend
- ¿Tienes frontend construido que consume estos endpoints?
- ¿O necesitas construir el frontend también?

### 5. Prioridades
- ¿Qué funcionalidad es más crítica ahora mismo?
- ¿Fix bugs existentes vs agregar nuevas features?

## Opciones de Plan de Trabajo

### Opción A: Debug y Fix (Si hay errores)
- Identificar bugs en endpoints/workflows existentes
- Fix issues de validación, capacidad, precios
- Completar steps faltantes
- Verificar flujo end-to-end

### Opción B: Refactorización
- Eliminar duplicación entre tour-booking y package
- Limpiar comentarios desactualizados
- Mejorar estructura de código

### Opción C: Nuevas Features
- Admin dashboard para gestión de tours
- Reportes de ocupación
- Notificaciones automáticas
- Calendario de disponibilidad

### Opción D: Frontend Integration
- Componentes React para carrito
- Formularios de reserva
- Checkout UI

## Próximos Pasos Sugeridos

1. **Clarificar qué problema específico resolver**
2. **Verificar endpoints existentes funcionan**
3. **Completar steps faltantes si es necesario**
4. **Agregar tests de integración**
5. **Crear frontend si aplica**

---

**Nota**: La implementación actual parece bastante completa. Antes de hacer un plan de trabajo extenso, necesito entender:
1. ¿Qué no está funcionando actualmente?
2. ¿Cuál es el problema específico que necesitas resolver?

Esto evitará "reinventar la rueda" cuando ya tienes código funcional que quizás solo necesita debugging.

---

## 📁 Análisis Detallado de `customcart/`

### Endpoints Personalizados Encontrados

**1. POST `/store/customcart/add/[id]`** (`add/[id]/route.ts`)
- **Propósito:** Agregar tours al carrito
- **Input:** Array de items con `variant_id`, `quantity`, `metadata`
- **Workflow:** `addTourCartWorkflow` (de `create-cart.ts`)
- **Validación:** Zod schema

**2. POST `/store/customcart/[id]/line-items`** (`[id]/line-items/route.ts`)
- **Propósito:** Eliminar items del carrito
- **Workflow:** `deleteLineItemsWorkflow` del core
- **Input:** Array de `{ id }` a eliminar

**3. POST `/store/customcart/delete/[id]`** (`delete/[id]/route.ts`)
- **Propósito:** Eliminar items (ruta alternativa/duplicada)
- **Workflow:** Mismo `deleteLineItemsWorkflow`
- **Nota:** ⚠️ Duplica funcionalidad de `[id]/line-items`

**4. `helpers.ts`**
- **Función:** `refetchCart()` - Recarga carrito usando Remote Query
- **Uso:** Reutilizable en múltiples endpoints

### Workflow: `create-cart.ts` (`addTourCartWorkflow`)

**Concepto Clave:** Usa `group_id` para agrupar items de una misma reserva de tour

**Steps:**
1. **prepareTourItemsStep:**
   - Genera ID único: `tour_01J9...` (prefijo `tour_`)
   - Inyecta en metadata:
     ```typescript
     metadata: {
       ...item.metadata,       // Datos del pasajero
       group_id: groupId,      // ID único de grupo
       is_tour: true          // Flag identificador
     }
     ```

2. **addToCartWorkflow:** Usa workflow nativo de Medusa

**Problema detectado:**
- Usa `transform()` para crear `tourData` pero luego crea `lineItems` manualmente
- El resultado del `transform` no se usa (lógica duplicada/inconsistente)

### ⚠️ PROBLEMAS ENCONTRADOS en customcart/

**1. Archivo vacío:**
- `[id]/line-items/[line_id]/route.ts` - Solo 1 línea (vacío)

**2. Duplicación de rutas:**
- `POST /delete/[id]` y `POST /[id]/line-items` hacen exactamente lo mismo
- Debería consolidarse en una sola

**3. Doble implementación de carrito:**
- **Sistema A:** `customcart/` - Tu implementación personalizada
- **Sistema B:** `cart/tour-items/` - Otra implementación paralela
- **¿Cuál es el oficial?** Necesitas elegir uno y deprecar el otro

**4. Lógica inconsistente en workflow:**
```typescript
// Código actual (redundante):
const tourData = transform({ input }, (data) => { ... })  // Se crea pero NO se usa
const lineItems = input.items.map(...)                    // Se usa este
return new StepResponse({ tourData, groupId })           // Devuelve tourData

// Pero luego:
items: preparationData.tourData,  // ¿Usa tourData o no?
```

**5. Falta funcionalidad:**
- No hay endpoint para actualizar items (solo add/delete)
- No hay endpoint GET para obtener carrito
- No hay validación de capacidad/disponibilidad en el workflow

### 🔄 Comparación: customcart/ vs cart/tour-items/

| Característica | customcart/ | cart/tour-items/ |
|----------------|-------------|------------------|
| **Agregar items** | ✅ Sí (workflow personalizado) | ✅ Sí (endpoint directo) |
| **Validación capacidad** | ❌ No | ✅ Sí (con validaciones) |
| **Tipos pasajero** | ❌ No explícito | ✅ Sí (ADULT, CHILD, INFANT) |
| **Metadata estructurada** | ✅ group_id | ✅ Fecha, tipo pasajero |
| **Eliminar items** | ✅ Sí | ❌ No (usa endpoint nativo) |
| **Integración módulos** | ❌ Básica | ✅ Profunda (TourModule) |

**Recomendación:** Consolidar ambos - usar `cart/tour-items/` como base pero agregarle el concepto de `group_id` de `customcart/`

### 🔧 Issues de TypeScript Detectados

**En otros archivos del proyecto:**
1. `create-booking-create.ts`: `'item.items' is of type 'unknown'`
2. `create-package-booking.ts`: `Excessive stack depth comparing types`

Estos errores pueden estar causando que los workflows fallen silenciosamente.
