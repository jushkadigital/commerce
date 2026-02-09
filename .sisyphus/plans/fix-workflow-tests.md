# Plan de Corrección: Tests de Workflows sin available_dates

## Problema
Los modelos Tour y Package fueron modificados eliminando el campo `available_dates`. Los tests de workflows se rompieron porque:
1. Las migraciones eliminan la columna `available_dates` de la base de datos
2. Los tests pueden estar intentando crear datos que esperaban ese campo
3. El índice de base de datos `IDX_tour_destination_available_dates` fue removido

## Solución
Actualizar los tests de workflows para:
1. No depender del campo `available_dates`
2. Usar los nuevos campos de disponibilidad (`blocked_dates`, `blocked_week_days`)
3. Asegurar que los tests pasen con el nuevo esquema

## Tasks

### Task 1: Verificar y corregir Tour Workflow Tests
**Archivo**: `integration-tests/http/tour-workflow.spec.ts`

**Acciones**:
- [x] Revisar si hay referencias a `available_dates`
- [x] Eliminar cualquier uso de `available_dates` en los tests
- [x] Actualizar tests para usar `blocked_dates` y `blocked_week_days` si es necesario
- [x] Verificar que los tests pasen: `npm run test:integration:http -- tour-workflow.spec.ts`

### Task 2: Verificar y corregir Package Workflow Tests
**Archivo**: `integration-tests/http/package-workflow.spec.ts`

**Acciones**:
- [x] Revisar si hay referencias a `available_dates`
- [x] Eliminar cualquier uso de `available_dates` en los tests
- [x] Actualizar tests para usar `blocked_dates` y `blocked_week_days` si es necesario
- [x] Verificar que los tests pasen: `npm run test:integration:http -- package-workflow.spec.ts`

### Task 3: Verificar Tests de Servicio
**Archivos**:
- `src/modules/tour/__tests__/tour-service.spec.ts`
- `src/modules/package/__tests__/package-service.spec.ts`

**Acciones**:
- [x] Revisar si usan `available_dates`
- [x] Corregir si es necesario
- [x] Verificar que pasen: `npm run test:integration:modules`

### Task 4: Ejecutar todas las pruebas
**Comando**:
```bash
npm run test:unit
npm run test:integration:modules
npm run test:integration:http
```

**Verificación**:
- [x] Todos los tests pasan
- [x] No hay errores relacionados con `available_dates`

## Notas
- Las migraciones ya existen para eliminar `available_dates`
- Los modelos ya no tienen el campo
- Los workflows ya fueron actualizados
- Solo falta corregir los tests
