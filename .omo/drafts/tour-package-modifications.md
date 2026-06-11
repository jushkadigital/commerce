# Draft: Modificación de Modelos Tours y Packages

## Resumen del Proyecto
- **Framework**: Medusa v2.12.4 (Headless e-commerce)
- **Stack**: TypeScript 5.6.2, SQLite (compatible con PostgreSQL)
- **Módulos**: `src/modules/tour/` y `src/modules/package/` (separados)

## Estructura Actual de Modelos

### Tours (`src/modules/tour/models/`)
- `tour.ts` - Modelo principal
- `tour-variant.ts` - Variantes (adult, child, infant)
- `tour-booking.ts` - Reservas
- `tour-service-variant.ts` - Servicios de variantes

### Packages (`src/modules/package/models/`)
- `package.ts` - Modelo principal
- `package-variant.ts` - Variantes (adult, child, infant)
- `package-booking.ts` - Reservas
- `package-service-variant.ts` - Servicios de variantes

**Nota**: Ambos módulos tienen estructura idéntica pero están completamente separados.

---

## Requerimientos del Usuario (En proceso de confirmación)

### 1. Clasificación por Duración
- **Tour**: Duración de un solo día (`duration_days = 1`)
- **Package**: Duración de más de un día (`duration_days > 1`)

### 2. Disponibilidad y Reservas
- **Anticipación**: El sistema debe recibir reservas con **2 días de anticipación** de la fecha de compra
- **Filtro de días no disponibles**: Filtrar días no disponibles con:
  - Días fijos específicos
  - Intervalos semanales (ej: todos los martes, fines de semana)

### 3. Ventana de Reserva (Booking Window)
- **Tours**: Las fechas disponibles para reservar deben ser mínimo **2 días después** de la fecha de compra
  - Si hoy es 10 de enero, las primeras fechas disponibles son 12 de enero en adelante
- **Packages**: Las fechas disponibles para reservar deben ser mínimo **2 meses después** de la fecha de compra
  - Si hoy es 10 de enero, las primeras fechas disponibles son 10 de marzo en adelante

### 4. Cancelación de Reservas
- **Ventana de cancelación**: 12 horas después de la compra
- **Regla**: Después de 12 horas de haber realizado la compra, ya no se puede cancelar la reserva
- Esto aplica tanto para Tours como para Packages

### 5. Tamaño de Grupo
- Al comprar un Tour o Package, el número de variantes (sin contar infantes) no podrá ser mayor al tamaño asignado (`max_capacity`)

### 6. Campo Especial (is_special)
- **Nombre del campo**: `is_special` (booleano)
- **Default**: `false`
- **Propósito**: Identificar Tours y Packages que tendrán lógica diferente/customizada
- **Nota**: Campo para uso futuro, por ahora solo es un flag que puede ser activado manualmente

---

## Requerimientos Confirmados

✅ **Reservas con anticipación**: Tours = 2 días, Packages = 2 meses
✅ **Cancelación**: 12 horas después de la compra
✅ **Campo especial**: `is_special` (boolean, default false)
✅ **Días no disponibles**: Fechas fijas + reglas semanales
✅ **Testing**: Tests después de implementar (Jest)

---

## Notas Técnicas

### Campos actuales relevantes para los cambios:

**Tour/Package:**
- `duration_days: number` - Para clasificar tour vs package
- `max_capacity: number` - Para validar tamaño de grupo
- `available_dates: string[]` - Para disponibilidad actual

**TourVariant/PackageVariant:**
- `passenger_type: "adult" | "child" | "infant"` - Para excluir infantes del conteo

**TourBooking/PackageBooking:**
- `tour_date` / `package_date: DateTime` - Para validar fechas de modificación
- `line_items: Record[]` - Para contar cantidad de variantes

### Lógica de validación a implementar:

1. **Ventana de reserva (Tours)**:
   ```
   tour_date - purchase_date >= 2 days
   ```

2. **Ventana de reserva (Packages)**:
   ```
   package_date - purchase_date >= 2 months
   ```

3. **Cancelación** (12 horas después de compra):
   ```
   current_time - purchase_time <= 12 hours → puede cancelar
   current_time - purchase_time > 12 hours → no puede cancelar
   ```

4. **Conteo de variantes** (excluyendo infantes):
   ```
   total = sum(line_items.filter(item => item.passenger_type !== 'infant'))
   total <= max_capacity
   ```

5. **Verificación de disponibilidad** (combinado):
   ```
   // Fechas fijas bloqueadas
   requested_date not in blocked_dates
   
   // Reglas semanales (0=domingo, 1=lunes, ...)
   day_of_week(requested_date) not in blocked_week_days
   ```

### Campos a agregar:

**Tour y Package:**
1. `is_special: boolean` (default: false) - Para lógica custom futura
2. `blocked_dates: string[]` - Fechas específicas bloqueadas (ISO format)
3. `blocked_week_days: number[]` - Días de semana bloqueados (0-6)
4. `cancellation_deadline_hours: number` (default: 12) - Horas para cancelar

**Tour:**
5. `booking_min_days_ahead: number` (default: 2) - Días mínimos de anticipación

**Package:**
5. `booking_min_months_ahead: number` (default: 2) - Meses mínimos de anticipación
