# Plan de Corrección: Errores de Sintaxis en Tests

## Problema
El archivo `src/modules/tour/__tests__/tour-service.spec.ts` tiene múltiples errores de sintaxis después de la eliminación de `available_dates`:

1. Código suelto de `formatDate()` siendo tratado como propiedades
2. Errores en llamadas a `updateTours` con formato incorrecto
3. Problemas de tipos con `blocked_week_days` (number[] vs string[])
4. Variables no definidas en ciertos contextos

## Tareas

### Task 1: Corregir llamadas con formatDate suelto
**Líneas afectadas**: Múltiples (587, 1023, etc.)
**Problema**: `formatDate()` aparece como propiedad en lugar de ser llamado correctamente
**Solución**: Eliminar estas líneas o corregir la sintaxis

### Task 2: Corregir updateTours
**Líneas afectadas**: 95, 739
**Problema**: Formato incorrecto de parámetros
**Solución**: Usar formato correcto `{ selector: { id }, data: {...} }`

### Task 3: Corregir tipos de blocked_week_days
**Líneas afectadas**: 700, 715, 730, 749, 767, 785
**Problema**: `number[]` vs `string[]` - el servicio espera strings
**Solución**: Convertir números a strings o usar formato correcto

### Task 4: Verificar ejecución de tests
**Comando**: `npm run test:integration:modules -- tour-service.spec.ts`
**Verificación**: Todos los tests deben pasar

## Archivos a Modificar
- `src/modules/tour/__tests__/tour-service.spec.ts`

## Notas
- El modelo usa `blocked_week_days: number[]`
- El servicio puede requerir conversión a string
- No usar `available_dates` en ningún lugar
