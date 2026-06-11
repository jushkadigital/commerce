# Plan: Restaurar Módulo Package Separado

## Objetivo
Restaurar el módulo `package/` como entidad separada de `tour-booking/`, manteniendo TODOS los avances implementados:
- ✅ Single Line Item en cart
- ✅ Sistema de locking
- ✅ Validación en checkout
- ✅ Admin widgets
- ✅ Tests de integración

## Estrategia
1. **Restaurar** el módulo package/ desde el último commit donde existía
2. **Mantener** tour-booking/ con todas las mejoras
3. **Actualizar** medusa-config.ts para incluir AMBOS módulos
4. **Mantener** los cambios en bookings API (ahora solo usa tour-booking)
5. **Opcional:** Crear endpoints unificados si se desea

## Cambios Necesarios

### 1. Restaurar módulo package/
```bash
git checkout <commit-antes-de-eliminar> -- src/modules/package/
```

### 2. Actualizar medusa-config.ts
```typescript
modules: [
  {
    resolve: './src/modules/tour-booking',
  },
  {
    resolve: './src/modules/package',  // Restaurado
  },
]
```

### 3. Mantener mejoras en tour-booking/
- Single Line Item (ya implementado)
- Locking (ya implementado)
- Validación (ya implementada)
- Admin widgets (ya implementados)

### 4. Bookings API
- Actualmente usa solo tour-booking (correcto)
- Si se necesita packages, agregar lógica condicional

## Ventajas de esta Arquitectura
- **Tour-booking**: Optimizado con todas las mejoras (locking, single item, etc.)
- **Package**: Disponible para futura diferenciación
- **Flexibilidad**: Pueden divergir cuando el negocio lo requiera
- **Sin pérdida**: Todo el trabajo avanzado se mantiene

## Notas
- El error de Tax es independiente (necesita migraciones de Medusa)
- Ambos módulos pueden coexistir sin problema
- Las mejoras en tour-booking no afectan a package
