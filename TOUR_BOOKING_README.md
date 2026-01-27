# Sistema de Reserva de Tours

Este documento describe el sistema de reserva de tours implementado en esta aplicación Medusa, basado en el tutorial oficial de ticket-booking.

## 🎨 Interfaz de Administración

El sistema incluye una interfaz gráfica completa en el Admin Dashboard de Medusa para gestionar tours.

### Acceso a la UI de Tours

1. Inicia el servidor: `npm run dev`
2. Accede al Admin Dashboard: `http://localhost:9000/app`
3. En el menú lateral, haz clic en **"Tours"** (ícono de edificio)

### Funcionalidades de la UI

**Página de Listado de Tours:**
- Ver todos los tours creados en una tabla
- Información rápida: destino, duración, capacidad, número de fechas
- Botones de acción: Ver/Editar y Eliminar
- Botón "Crear Tour" para agregar nuevos tours

**Página de Creación de Tour:**
- Formulario completo con validación
- Campos:
  - Product ID (requerido)
  - Destino (requerido)
  - Descripción
  - Duración en días (requerido)
  - Capacidad máxima (requerido)
  - Fechas disponibles (dinámico, agregar/eliminar múltiples)
- Se crean automáticamente las 3 variantes de pasajeros (adulto, niño, infante)

**Página de Detalle/Edición:**
- Editar información del tour
- Ver variantes de pasajeros con badges de colores
- Ver reservas recientes con estados
- Información del tour y product ID

**Características:**
- ✅ Interfaz moderna con componentes de Medusa UI
- ✅ Validación de formularios
- ✅ Gestión dinámica de fechas múltiples
- ✅ Confirmación antes de eliminar
- ✅ Mensajes de error y éxito
- ✅ Responsive y accesible

## Descripción General

El sistema permite gestionar tours turísticos con tres tipos de pasajeros:
- **Adulto** (adult)
- **Niño** (child)
- **Infante** (infant)

Cada tour puede tener múltiples fechas disponibles, capacidad limitada, y las reservas se validan automáticamente para evitar sobreventa.

## Arquitectura

### Modelos de Datos

#### 1. Tour (`tour`)
Representa un tour turístico.

Campos:
- `id`: ID único del tour
- `product_id`: ID del producto de Medusa vinculado
- `destination`: Destino del tour
- `description`: Descripción del tour
- `duration_days`: Duración en días
- `max_capacity`: Capacidad máxima de pasajeros
- `available_dates`: Array de fechas disponibles

#### 2. TourVariant (`tour_variant`)
Representa un tipo de pasajero para un tour.

Campos:
- `id`: ID único de la variante
- `variant_id`: ID de la variante de producto de Medusa vinculada
- `passenger_type`: Tipo de pasajero (adult, child, infant)
- `tour_id`: Relación con el tour

#### 3. TourBooking (`tour_booking`)
Representa una reserva de un pasajero para un tour.

Campos:
- `id`: ID único de la reserva
- `order_id`: ID de la orden de Medusa
- `tour_id`: ID del tour
- `tour_variant_id`: ID de la variante (tipo de pasajero)
- `passenger_name`: Nombre del pasajero
- `passenger_email`: Email del pasajero (opcional)
- `passenger_phone`: Teléfono del pasajero (opcional)
- `tour_date`: Fecha del tour
- `status`: Estado (pending, confirmed, cancelled, completed)

## API Endpoints

### Endpoints de Tienda (Store)

#### Listar Tours
```http
GET /store/tours
Query params: ?destination=Machu%20Picchu
```

#### Obtener Tour Individual
```http
GET /store/tours/:id
```

#### Verificar Disponibilidad
```http
GET /store/tours/:id/availability?date=2025-02-15&quantity=2
```

Respuesta:
```json
{
  "available": true,
  "capacity": 28
}
```

#### Crear Reservas
```http
POST /store/tour-bookings
Content-Type: application/json

{
  "bookings": [
    {
      "tour_id": "tour_123",
      "tour_variant_id": "variant_adult",
      "passenger_name": "Juan Pérez",
      "passenger_email": "juan@example.com",
      "passenger_phone": "+51999888777",
      "tour_date": "2025-02-15T00:00:00Z",
      "order_id": "order_123"
    },
    {
      "tour_id": "tour_123",
      "tour_variant_id": "variant_child",
      "passenger_name": "María Pérez",
      "tour_date": "2025-02-15T00:00:00Z",
      "order_id": "order_123"
    }
  ]
}
```

### Endpoints de Administración (Admin)

#### Listar Todos los Tours
```http
GET /admin/tours
```

#### Crear Tour
```http
POST /admin/tours
Content-Type: application/json

{
  "product_id": "tour_prod_001",
  "destination": "Machu Picchu, Peru",
  "description": "Tour guiado de día completo",
  "duration_days": 1,
  "max_capacity": 30,
  "available_dates": [
    "2025-02-15T00:00:00Z",
    "2025-02-20T00:00:00Z"
  ]
}
```

Si no se proporcionan variantes, se crean automáticamente para adulto, niño e infante.

#### Obtener Tour Individual
```http
GET /admin/tours/:id
```

#### Actualizar Tour
```http
PUT /admin/tours/:id
Content-Type: application/json

{
  "max_capacity": 35,
  "available_dates": ["2025-02-15T00:00:00Z", "2025-03-01T00:00:00Z"]
}
```

#### Eliminar Tour
```http
DELETE /admin/tours/:id
```

#### Listar Reservas
```http
GET /admin/tour-bookings?tour_id=tour_123&status=confirmed
```

#### Obtener Reserva Individual
```http
GET /admin/tour-bookings/:id
```

#### Actualizar Reserva
```http
PUT /admin/tour-bookings/:id
Content-Type: application/json

{
  "status": "completed"
}
```

#### Eliminar Reserva
```http
DELETE /admin/tour-bookings/:id
```

## Workflow de Reserva

El workflow `create-tour-booking` maneja la creación de reservas con los siguientes pasos:

1. **Validar Disponibilidad**: Verifica que el tour esté disponible en la fecha solicitada
2. **Crear Reserva**: Crea el registro de reserva en la base de datos
3. **Rollback**: Si algo falla, elimina la reserva automáticamente

## Uso

### 1. Inicializar Datos de Ejemplo

```bash
npx medusa exec ./src/scripts/seed-tours.ts
```

Este script crea 3 tours de ejemplo:
- Machu Picchu, Peru
- Islas Galápagos, Ecuador
- Patagonia, Argentina

### 2. Crear Productos en Medusa

Para cada tour creado, debes:
1. Crear un producto en el admin dashboard
2. Usar el mismo `product_id` que especificaste en el tour
3. Crear variantes de producto para cada tipo de pasajero
4. Configurar precios para cada variante

### 3. Realizar Reservas

Los clientes pueden:
1. Ver tours disponibles
2. Verificar disponibilidad para una fecha específica
3. Crear reservas para múltiples pasajeros
4. Cada reserva se vincula a una orden de Medusa

## Validaciones

El sistema incluye validaciones automáticas:

- **Fecha válida**: El tour debe estar disponible en la fecha solicitada
- **Capacidad**: No se pueden hacer reservas si se excede la capacidad máxima
- **Datos requeridos**: Todos los campos obligatorios deben estar presentes

## Integración con Medusa

El módulo de tours se integra con Medusa mediante:

1. **Links**: Conexiones entre tour/product, tourVariant/productVariant, y tourBooking/order
2. **Workflows**: Proceso de reserva con pasos transaccionales
3. **Container**: Acceso al servicio del módulo mediante dependency injection

## Ejemplo de Flujo Completo

1. Admin crea un tour con `POST /admin/tours`
2. Admin crea productos y variantes en Medusa Admin Dashboard
3. Cliente lista tours con `GET /store/tours`
4. Cliente verifica disponibilidad con `GET /store/tours/:id/availability`
5. Cliente agrega items al carrito usando los variant_ids
6. Cliente completa el checkout creando una orden
7. Sistema crea las reservas con `POST /store/tour-bookings` usando el order_id
8. Admin puede ver y gestionar reservas con los endpoints de admin

## Tipos de Pasajeros

El sistema soporta tres tipos de pasajeros definidos en `PassengerType`:

```typescript
enum PassengerType {
  ADULT = "adult",
  CHILD = "child",
  INFANT = "infant"
}
```

Cada tour automáticamente tiene variantes para los 3 tipos de pasajeros, lo que permite:
- Precios diferenciados por tipo de pasajero
- Control de inventario por tipo
- Informes y métricas por categoría de pasajero
