# Plan de Refactorización: Eliminar available_dates de Tour y Package

## TL;DR

> **Objetivo**: Eliminar completamente el campo `available_dates` de los modelos Tour y Package, ya que fue reemplazado por `blocked_dates`.
> 
> **Alcance**: 61 archivos afectados con 264+ referencias a `available_dates`
> 
> **Entregables**:
> - Modelos actualizados (sin available_dates)
> - APIs y workflows actualizados
> - UI de admin actualizada
> - Tests actualizados y pasando
> - Migración de base de datos
> 
> **Esfuerzo estimado**: Large (2-3 días)
> **Ejecución paralela**: NO - secuencial obligatoria
> **Path crítico**: Modelos → APIs → Workflows → UI → Tests → Migración

---

## Contexto

### Solicitud Original
El usuario identificó que `blocked_dates` fue agregado correctamente a los modelos Tour y Package, pero `available_dates` sigue existiendo y ya no tiene sentido mantenerlo. Se requiere eliminar `available_dates` de ambos modelos y corregir todos los tests.

### Análisis de Impacto (Investigación)

**Modelos afectados:**
- `src/modules/tour/models/tour.ts` - línea 14
- `src/modules/package/models/package.ts` - línea 14

**Archivos con referencias a `available_dates` (264 matches en 61 archivos):**

| Categoría | Archivos principales | Cantidad de referencias |
|-----------|---------------------|------------------------|
| **Modelos** | tour.ts, package.ts | 2 |
| **API Admin** | tours/route.ts, tours/[id]/route.ts, packages/route.ts, packages/[id]/route.ts, tours/[id]/[group]/route.ts | ~5 |
| **API Store** | tours/route.ts, tours/validators.ts, packages/route.ts, packages/validators.ts | ~8 |
| **Workflows** | create-tour.ts, create-package.ts, update-tour.ts, update-package.ts, update-tour-no-prices.ts, update-package-no-prices.ts | ~12 |
| **Steps** | create-tour-validate.ts, create-tour-create.ts, create-tour-record.ts, update-tour.ts, create-package-validate.ts, create-package-create.ts, create-package-record.ts, update-package.ts | ~16 |
| **Admin UI** | tours/page.tsx, packages/page.tsx, create-tour-modal.tsx, create-package-modal.tsx | ~8 |
| **Tests Unitarios** | tour-service.spec.ts, package-service.spec.ts, tour-module.service.unit.spec.ts, package-module.service.unit.spec.ts, tour-model.unit.spec.ts, package-model.unit.spec.ts | ~100+ |
| **Tests E2E** | tour-workflow.spec.ts, package-workflow.spec.ts, tour-purchase-flow.spec.ts, package-purchase-flow.spec.ts, workflow-steps.spec.ts, tour-booking-locking.spec.ts | ~100+ |
| **Types** | admin/types.ts | 2 |
| **Middlewares** | src/api/middlewares.ts | 2 |
| **Scripts** | src/scripts/check-tours.ts | 1 |
| **Migraciones** | Migration20260206073934.ts, Migration20260127204825.ts, .snapshot-tour-module.json, .snapshot-package-module.json | ~10 |

### Hallazgos de Metis

**Guardrails identificados:**
1. Backup de datos antes de migración (no negociable)
2. Tests de integración E2E obligatorios para flujos de checkout
3. Validación de formato de fechas en blocked_dates
4. Documentación de breaking changes para API consumers

**Scope creep a bloquear:**
- NO agregar nuevos campos de fecha (fuera de scope)
- NO modificar lógica de precios por fecha (distinto feature)
- NO cambiar estructura de respuesta de APIs (mantener compatibilidad)
- NO refactor de componentes UI no relacionados (solo actualizar referencias)

**Casos edge críticos:**
- Datos existentes en `available_dates` necesitan estrategia de migración
- Integraciones externas pueden depender de `available_dates` en API responses
- Bookings en curso durante migración (race conditions)
- Queries SQL directas en scripts/reports

---

## Work Objectives

### Objetivo Principal
Eliminar completamente el campo `available_dates` de los modelos Tour y Package, junto con todas sus referencias en el codebase, manteniendo la funcionalidad existente mediante `blocked_dates`.

### Entregables Concretos
1. **Modelos actualizados** (`src/modules/tour/models/tour.ts`, `src/modules/package/models/package.ts`)
   - Remover campo `available_dates`
   - Actualizar índice de base de datos
   
2. **Migración de base de datos**
   - Nueva migración para eliminar columna `available_dates`
   - Script de migración de datos si es necesario
   
3. **APIs actualizadas** (Admin y Store)
   - Remover `available_dates` de validators
   - Remover `available_dates` de request/response schemas
   - Actualizar middlewares
   
4. **Workflows y Steps actualizados**
   - Remover `available_dates` de inputs/outputs
   - Actualizar validaciones
   
5. **UI de Admin actualizada**
   - Remover campos de available_dates de modales
   - Actualizar tablas y columnas
   
6. **Tests actualizados**
   - Actualizar todos los tests unitarios
   - Actualizar todos los tests E2E
   - Todos los tests deben pasar

### Definition of Done
- [ ] `grep -r "available_dates" src/` retorna 0 resultados (excepto en migraciones históricas)
- [ ] `bun test` pasa todos los tests (0 fallos)
- [ ] `npx medusa db:migrate` ejecuta sin errores
- [ ] API admin no expone `available_dates` en ningún endpoint
- [ ] API store responde correctamente sin `available_dates`

### Must Have (No negociables)
- [ ] Eliminación completa de `available_dates` de modelos
- [ ] Migración de base de datos para eliminar columna
- [ ] Actualización de TODOS los tests
- [ ] Todos los tests pasando

### Must NOT Have (Guardrails - explícitamente excluido)
- [ ] NO agregar nuevos campos de fecha
- [ ] NO modificar lógica de precios por fecha
- [ ] NO cambiar comportamiento de `blocked_dates`
- [ ] NO modificar estructura de variantes o bookings
- [ ] NO eliminar migraciones históricas (solo crear nuevas)

---

## Verification Strategy

### Estrategia de Testing

> **TODAS las verificaciones son ejecutadas por el agente. NINGUNA requiere intervención humana.**

**Decisión de Testing:**
- **Infraestructura existe**: SÍ (bun test configurado)
- **Tests automatizados**: SÍ (Tests-after) - No es TDD porque es refactorización
- **Framework**: bun test

**Comandos de verificación:**
```bash
# Verificar que no quedan referencias a available_dates (excepto migraciones)
grep -r "available_dates" src/ --include="*.ts" | grep -v "migrations" | grep -v ".spec.ts"

# Ejecutar todos los tests
bun test

# Verificar migraciones
npx medusa db:migrate
```

### Escenarios de QA (Agent-Executed)

#### Escenario 1: Modelos sin available_dates
```
Scenario: Verificar que modelos no tienen available_dates
  Tool: Bash (grep)
  Precondiciones: Ninguna
  Pasos:
    1. Ejecutar: grep -n "available_dates" src/modules/tour/models/tour.ts
    2. Ejecutar: grep -n "available_dates" src/modules/package/models/package.ts
    3. Ejecutar: grep -n "available_dates" src/admin/types.ts
  Resultado Esperado: 
    - Comando 1: Sin resultados (o solo en comentarios)
    - Comando 2: Sin resultados (o solo en comentarios)
    - Comando 3: Sin resultados
  Indicadores de Fallo: 
    - Algún grep encuentra "available_dates:"
  Evidencia: Terminal output capturado
```

#### Escenario 2: Tests unitarios pasan
```
Scenario: Todos los tests unitarios pasan
  Tool: Bash (bun test)
  Precondiciones: Dependencias instaladas
  Pasos:
    1. Ejecutar: bun test src/modules/tour/__tests__/tour-service.spec.ts
    2. Ejecutar: bun test src/modules/package/__tests__/package-service.spec.ts
    3. Ejecutar: bun test src/modules/tour/__tests__/tour-module.service.unit.spec.ts
    4. Ejecutar: bun test src/modules/package/__tests__/package-module.service.unit.spec.ts
  Resultado Esperado: 
    - Cada comando: "passing" o "0 fail"
  Indicadores de Fallo: 
    - Algún test falla con error relacionado a available_dates
  Evidencia: Test output capturado
```

#### Escenario 3: Tests E2E pasan
```
Scenario: Tests de integración E2E pasan
  Tool: Bash (bun test)
  Precondiciones: Servidor de test corriendo
  Pasos:
    1. Ejecutar: bun test integration-tests/http/tour-workflow.spec.ts
    2. Ejecutar: bun test integration-tests/http/package-workflow.spec.ts
    3. Ejecutar: bun test integration-tests/http/tour-purchase-flow.spec.ts
    4. Ejecutar: bun test integration-tests/http/package-purchase-flow.spec.ts
  Resultado Esperado: 
    - Cada test suite: All tests passing
  Indicadores de Fallo: 
    - Error 400/500 en endpoints por campo faltante
    - Assertion failures sobre available_dates
  Evidencia: Test output capturado
```

#### Escenario 4: Migraciones aplican correctamente
```
Scenario: Migración de base de datos ejecuta sin errores
  Tool: Bash (npx medusa db:migrate)
  Precondiciones: Base de datos accesible
  Pasos:
    1. Ejecutar: npx medusa db:migrate
    2. Verificar output por errores
    3. Opcional: Query SQL para verificar que columna available_dates no existe
  Resultado Esperado: 
    - Migración completa sin errores
    - Mensaje de éxito
  Indicadores de Fallo: 
    - Error SQL relacionado a constraint o columna
  Evidencia: Output de migración capturado
```

#### Escenario 5: APIs no exponen available_dates
```
Scenario: Endpoints no aceptan ni retornan available_dates
  Tool: Bash (curl/httpie)
  Precondiciones: Servidor corriendo en localhost:9000
  Pasos:
    1. POST /admin/tours con body que incluye available_dates
    2. Verificar que la API rechaza el campo o lo ignora (no error 500)
    3. GET /admin/tours y verificar que response no tiene available_dates
    4. Repetir para /store/tours, /admin/packages, /store/packages
  Resultado Esperado: 
    - API funciona sin available_dates
    - Response no contiene available_dates
  Indicadores de Fallo: 
    - Error 500 por campo requerido
    - Response aún incluye available_dates
  Evidencia: HTTP responses capturados
```

---

## Execution Strategy

### Ejecución Secuencial (NO paralela)

Este refactor NO permite paralelización porque:
1. Los modelos deben cambiar primero (las APIs dependen de ellos)
2. Las APIs deben actualizarse antes de los tests (los tests usan las APIs)
3. Los tests E2E deben ejecutarse al final (validan todo el stack)

```
Secuencia de ejecución:

Fase 1: Modelos y Base de Datos
└── Task 1: Actualizar modelos Tour y Package
    └── Task 2: Crear migración para eliminar columna
        └── Fase 2: APIs y Workflows
            └── Task 3: Actualizar API Admin (tours y packages)
                └── Task 4: Actualizar API Store (tours y packages)
                    └── Task 5: Actualizar Workflows y Steps
                        └── Fase 3: UI y Types
                            └── Task 6: Actualizar Admin UI components
                                └── Task 7: Actualizar Types y Middlewares
                                    └── Fase 4: Tests
                                        └── Task 8: Actualizar tests unitarios
                                            └── Task 9: Actualizar tests E2E
                                                └── Task 10: Verificación final y cleanup
```

### Matriz de Dependencias

| Task | Depende de | Bloquea | Estado DB requerido |
|------|------------|---------|---------------------|
| 1 | Ninguno | 2, 3, 4, 5, 6, 7 | Modelos actualizados en código |
| 2 | 1 | 9, 10 | Migración aplicada |
| 3 | 1 | 8, 9, 10 | - |
| 4 | 1 | 8, 9, 10 | - |
| 5 | 1 | 8, 9, 10 | - |
| 6 | 3, 4 | 8, 9, 10 | - |
| 7 | 3, 4 | 8, 9, 10 | - |
| 8 | 3, 4, 5, 6, 7 | 9, 10 | - |
| 9 | 2, 8 | 10 | Migración aplicada |
| 10 | 9 | Ninguno | - |

---

## TODOs

> **TODOS los tasks requieren un perfil de agente recomendado.**
> **TODOS los tasks incluyen escenarios de QA ejecutados por el agente.**
> **Verificación: Cada task debe poder verificarse SIN intervención humana.**

---

### Task 1: Actualizar Modelos Tour y Package

**Qué hacer:**
- [ ] Editar `src/modules/tour/models/tour.ts`:
  - Remover línea 14: `available_dates: model.array(),`
  - Actualizar índice línea 32: cambiar `["destination", "available_dates"]` a `["destination"]` (o índice alternativo)
- [ ] Editar `src/modules/package/models/package.ts`:
  - Remover línea 14: `available_dates: model.array(),`
  - Actualizar índice línea 31: cambiar `["destination", "available_dates"]` a `["destination"]`

**Qué NO hacer:**
- NO modificar otros campos (blocked_dates, blocked_week_days, etc.)
- NO eliminar migraciones existentes
- NO modificar relaciones (variants, bookings, etc.)

**Perfil de Agente Recomendado:**
- **Categoría**: `quick`
  - Razón: Cambios directos y localizados en archivos pequeños, alta confianza en el scope
- **Skills**: `building-with-medusa`
  - `building-with-medora`: Necesario para entender la sintaxis de modelos Medusa y migraciones
- **Skills evaluados pero omitidos**:
  - `building-admin-dashboard-customizations`: No aplica, no es UI
  - `vercel-react-best-practices`: No aplica, no es React

**Paralelización:**
- **Puede ejecutarse en paralelo**: NO
- **Grupo paralelo**: Task 1 (secuencial)
- **Bloquea**: Tasks 2, 3, 4, 5, 6, 7
- **Bloqueado por**: Ninguno (puede iniciar inmediatamente)

**Referencias:**
- **Pattern References**:
  - `src/modules/tour/models/tour.ts:1-37` - Estructura actual del modelo Tour
  - `src/modules/package/models/package.ts:1-36` - Estructura actual del modelo Package
  - `src/modules/tour/migrations/Migration20260209173550.ts` - Ejemplo de migración que agrega campos (para entender cómo hacer la reversa)
- **API/Type References**:
  - Documentación Medusa: https://docs.medusajs.com/learn/fundamentals/modules#1-create-a-data-model - Sintaxis de modelos

**Criterios de Aceptación:**
- [ ] Línea 14 eliminada de tour.ts
- [ ] Línea 14 eliminada de package.ts
- [ ] Índices actualizados en ambos modelos
- [ ] `grep "available_dates" src/modules/tour/models/tour.ts` → 0 resultados
- [ ] `grep "available_dates" src/modules/package/models/package.ts` → 0 resultados

**Escenarios de QA:**
```
Scenario: Modelo Tour no tiene available_dates
  Tool: Bash (cat + grep)
  Pasos:
    1. cat src/modules/tour/models/tour.ts | grep -c "available_dates"
  Resultado Esperado: 0
  Evidencia: Terminal output

Scenario: Modelo Package no tiene available_dates
  Tool: Bash (cat + grep)
  Pasos:
    1. cat src/modules/package/models/package.ts | grep -c "available_dates"
  Resultado Esperado: 0
  Evidencia: Terminal output

Scenario: Modelos tienen sintaxis válida
  Tool: Bash (npx tsc --noEmit)
  Pasos:
    1. npx tsc --noEmit src/modules/tour/models/tour.ts
    2. npx tsc --noEmit src/modules/package/models/package.ts
  Resultado Esperado: No errors
  Evidencia: TypeScript output
```

**Commit**: SÍ
- Mensaje: `refactor(tour,package): remove available_dates field from models`
- Archivos: 
  - `src/modules/tour/models/tour.ts`
  - `src/modules/package/models/package.ts`
- Pre-commit: `bun test --run src/modules/tour/__tests__/tour-model.unit.spec.ts src/modules/package/__tests__/package-model.unit.spec.ts` (puede fallar si tests aún referencian available_dates, es aceptable)

---

### Task 2: Crear Migración para Eliminar Columna available_dates

**Qué hacer:**
- [ ] Generar nueva migración para Tour: `npx medusa db:generate tour-module`
- [ ] Generar nueva migración para Package: `npx medusa db:generate package-module`
- [ ] Verificar que las migraciones incluyen:
  - `ALTER TABLE tour DROP COLUMN IF EXISTS available_dates`
  - `ALTER TABLE package DROP COLUMN IF EXISTS available_dates`
  - Eliminación del índice `IDX_tour_destination_available_dates` si existe
  - Eliminación del índice `IDX_package_destination_available_dates` si existe
- [ ] Opcional: Crear script de backup de datos si hay datos existentes

**Qué NO hacer:**
- NO modificar migraciones existentes (Migration20260206073934.ts, etc.)
- NO eliminar datos sin backup si hay registros en producción
- NO olvidar eliminar los índices asociados

**Perfil de Agente Recomendado:**
- **Categoría**: `quick`
  - Razón: Uso de CLI de Medusa para generar migraciones
- **Skills**: `building-with-medusa`
  - `building-with-medusa`: Esencial para comandos de migración de Medusa

**Paralelización:**
- **Puede ejecutarse en paralelo**: NO (después de Task 1)
- **Grupo paralelo**: Secuencial
- **Bloquea**: Task 9 (tests E2E)
- **Bloqueado por**: Task 1

**Referencias:**
- **Pattern References**:
  - `src/modules/tour/migrations/Migration20260209173550.ts` - Ejemplo de migración (agrega columnas)
  - `src/modules/tour/migrations/.snapshot-tour-module.json` - Snapshot actual de la DB
  - `src/modules/package/migrations/Migration20260209173822.ts` - Ejemplo de migración Package

**Criterios de Aceptación:**
- [ ] Migración generada para tour-module
- [ ] Migración generada para package-module
- [ ] Ambas migraciones incluyen DROP COLUMN available_dates
- [ ] Índices asociados eliminados
- [ ] `npx medusa db:migrate` ejecuta sin errores

**Escenarios de QA:**
```
Scenario: Migraciones generadas correctamente
  Tool: Bash (ls)
  Pasos:
    1. ls -la src/modules/tour/migrations/Migration*.ts | tail -1
    2. ls -la src/modules/package/migrations/Migration*.ts | tail -1
  Resultado Esperado: 
    - Archivos nuevos creados recientemente
    - Nombres siguen patrón MigrationYYYYMMDDHHMMSS.ts
  Evidencia: Lista de archivos

Scenario: Migración ejecuta sin errores
  Tool: Bash (npx medusa db:migrate)
  Precondiciones: DB accesible, modelos actualizados
  Pasos:
    1. npx medusa db:migrate
  Resultado Esperado: 
    - Mensaje de éxito
    - Sin errores de SQL
  Evidencia: Output de migración
```

**Commit**: SÍ
- Mensaje: `chore(migrations): add migration to drop available_dates column`
- Archivos: 
  - `src/modules/tour/migrations/Migration*.ts` (nuevo)
  - `src/modules/package/migrations/Migration*.ts` (nuevo)
- Pre-commit: `npx medusa db:migrate --dry-run` (si existe, o verificar sintaxis SQL)

---

### Task 3: Actualizar API Admin (Tours y Packages)

**Qué hacer:**
- [ ] Actualizar `src/api/admin/tours/route.ts`:
  - Remover `available_dates` del schema de Zod (línea 37)
  - Remover `available_dates` del objeto enviado al workflow
- [ ] Actualizar `src/api/admin/tours/[id]/route.ts`:
  - Remover `available_dates` del schema de Zod (línea 41)
  - Remover `available_dates` del objeto de update
- [ ] Actualizar `src/api/admin/tours/[id]/[group]/route.ts`:
  - Remover `available_dates` del schema (línea 13)
- [ ] Actualizar `src/api/admin/packages/route.ts`:
  - Remover `available_dates` del schema de Zod (línea 37)
- [ ] Actualizar `src/api/admin/packages/[id]/route.ts`:
  - Remover `available_dates` del schema de Zod (línea 38)

**Qué NO hacer:**
- NO cambiar rutas o paths de endpoints
- NO modificar otros campos de los schemas
- NO cambiar lógica de autenticación/permisos

**Perfil de Agente Recomendado:**
- **Categoría**: `quick`
  - Razón: Cambios localizados en schemas Zod
- **Skills**: `building-with-medusa`
  - `building-with-medusa`: Necesario para API routes de Medusa

**Paralelización:**
- **Puede ejecutarse en paralelo**: NO (después de Task 1)
- **Grupo paralelo**: Tasks 3-7 pueden hacerse en cualquier orden
- **Bloquea**: Tasks 8, 9, 10
- **Bloqueado por**: Task 1

**Referencias:**
- **Pattern References**:
  - `src/api/admin/tours/route.ts` - Estructura actual de API
  - `src/api/admin/packages/route.ts` - Estructura actual de API

**Criterios de Aceptación:**
- [ ] Ningún archivo en `src/api/admin/` referencia `available_dates`
- [ ] `grep -r "available_dates" src/api/admin/` → 0 resultados
- [ ] Schemas de Zod no tienen available_dates

**Escenarios de QA:**
```
Scenario: APIs admin no tienen available_dates
  Tool: Bash (grep)
  Pasos:
    1. grep -r "available_dates" src/api/admin/ --include="*.ts" | wc -l
  Resultado Esperado: 0
  Evidencia: Terminal output

Scenario: TypeScript compila sin errores
  Tool: Bash (npx tsc)
  Pasos:
    1. npx tsc --noEmit src/api/admin/tours/route.ts
    2. npx tsc --noEmit src/api/admin/packages/route.ts
  Resultado Esperado: Sin errores
  Evidencia: tsc output
```

**Commit**: SÍ (agrupa con Tasks 4-7)
- Mensaje: `refactor(api): remove available_dates from admin and store endpoints`
- Archivos: Todos los archivos de src/api/ modificados
- Pre-commit: `npx tsc --noEmit` para APIs

---

### Task 4: Actualizar API Store (Tours y Packages)

**Qué hacer:**
- [ ] Actualizar `src/api/store/tours/route.ts`:
  - Remover `available_dates` de la destructuración (línea 40)
  - Remover `available_dates` del objeto creado (línea 52)
  - Remover `available_dates` de la respuesta (línea 71)
- [ ] Actualizar `src/api/store/tours/validators.ts`:
  - Remover `available_dates` del schema de Zod (línea 31)
- [ ] Actualizar `src/api/store/packages/route.ts`:
  - Remover `available_dates` de la destructuración (línea 40)
  - Remover `available_dates` del objeto creado (línea 51)
  - Remover `available_dates` de la respuesta (línea 69)
- [ ] Actualizar `src/api/store/packages/validators.ts`:
  - Remover `available_dates` del schema de Zod (línea 31)

**Qué NO hacer:**
- NO modificar la lógica de búsqueda/filtrado (mantener por destination, etc.)
- NO cambiar el formato de respuesta de otros campos

**Perfil de Agente Recomendado:**
- **Categoría**: `quick`
- **Skills**: `building-with-medusa`

**Paralelización:**
- **Puede ejecutarse en paralelo**: SÍ (con Task 3)
- **Grupo paralelo**: Tasks 3-7
- **Bloquea**: Tasks 8, 9, 10
- **Bloqueado por**: Task 1

**Referencias:**
- `src/api/store/tours/route.ts`
- `src/api/store/tours/validators.ts`
- `src/api/store/packages/route.ts`
- `src/api/store/packages/validators.ts`

**Criterios de Aceptación:**
- [ ] Ningún archivo en `src/api/store/` referencia `available_dates`
- [ ] Validators no requieren available_dates
- [ ] Respuestas de API no incluyen available_dates

**Escenarios de QA:**
```
Scenario: Store APIs no tienen available_dates
  Tool: Bash (grep)
  Pasos:
    1. grep -r "available_dates" src/api/store/ --include="*.ts" | wc -l
  Resultado Esperado: 0
  Evidencia: Terminal output
```

**Commit**: Agrupa con Task 3

---

### Task 5: Actualizar Workflows y Steps

**Qué hacer:**
- [ ] Actualizar `src/workflows/create-tour.ts`:
  - Remover `available_dates` de input type (línea 32)
  - Remover del objeto pasado al step (línea 54)
  - Remover del objeto retornado (línea 142)
  - Remover de fieldsToUpdate (línea 212)
- [ ] Actualizar `src/workflows/update-tour.ts`:
  - Remover `available_dates` de input type (línea 19)
  - Remover del objeto (línea 52)
  - Remover de fieldsToUpdate (línea 115)
- [ ] Actualizar `src/workflows/update-tour-no-prices.ts`:
  - Remover `available_dates` de input type (línea 19)
  - Remover del objeto (línea 53)
  - Remover de fieldsToUpdate (línea 113)
- [ ] Actualizar `src/workflows/create-package.ts`:
  - Remover `available_dates` de input type (línea 30)
  - Remover del objeto (línea 50)
  - Remover del objeto retornado (línea 131)
  - Remover de fieldsToUpdate (línea 212)
- [ ] Actualizar `src/workflows/update-package.ts`:
  - Remover `available_dates` de input type (línea 19)
  - Remover del objeto (línea 48)
  - Remover de fieldsToUpdate (línea 99)
- [ ] Actualizar `src/workflows/update-package-no-prices.ts`:
  - Remover `available_dates` de input type (línea 19)
  - Remover del objeto (línea 48)
  - Remover de fieldsToUpdate (línea 94)
- [ ] Actualizar Steps en `src/workflows/steps/`:
  - `create-tour-validate.ts` - Remover de input (línea 7)
  - `create-tour-create.ts` - Remover de input (línea 12)
  - `create-tour-record.ts` - Remover de input (línea 14) y objeto (línea 26)
  - `update-tour.ts` - Remover de input (línea 12) y lógica de preservación (línea 43)
  - `create-package-validate.ts` - Remover de input (línea 7)
  - `create-package-create.ts` - Remover de input (línea 12)
  - `create-package-record.ts` - Remover de input (línea 14) y objeto (línea 26)
  - `update-package.ts` - Remover de input (línea 12) y lógica de preservación (línea 40)

**Qué NO hacer:**
- NO modificar la lógica de `blocked_dates`
- NO cambiar la estructura de otros steps
- NO eliminar steps, solo remover el campo

**Perfil de Agente Recomendado:**
- **Categoría**: `quick`
- **Skills**: `building-with-medusa`

**Paralelización:**
- **Puede ejecutarse en paralelo**: SÍ (con Tasks 3-4)
- **Grupo paralelo**: Tasks 3-7
- **Bloquea**: Tasks 8, 9, 10
- **Bloqueado por**: Task 1

**Referencias:**
- `src/workflows/create-tour.ts`
- `src/workflows/update-tour.ts`
- `src/workflows/create-package.ts`
- `src/workflows/update-package.ts`
- `src/workflows/steps/*.ts`

**Criterios de Aceptación:**
- [ ] Ningún archivo en `src/workflows/` referencia `available_dates`
- [ ] Inputs/Outputs de workflows no incluyen available_dates
- [ ] Steps no reciben ni retornan available_dates

**Escenarios de QA:**
```
Scenario: Workflows no tienen available_dates
  Tool: Bash (grep)
  Pasos:
    1. grep -r "available_dates" src/workflows/ --include="*.ts" | wc -l
  Resultado Esperado: 0
  Evidencia: Terminal output
```

**Commit**: Agrupa con Task 3

---

### Task 6: Actualizar Admin UI Components

**Qué hacer:**
- [ ] Actualizar `src/admin/routes/tours/page.tsx`:
  - Remover accessor de `available_dates` (línea 59)
  - Remover render de fechas si existe
- [ ] Actualizar `src/admin/routes/packages/page.tsx`:
  - Remover accessor de `available_dates` (línea 55)
- [ ] Actualizar `src/admin/components/create-tour-modal.tsx`:
  - Remover state de `availableDates` (línea 79)
  - Remover input field para available_dates
  - Remover de objeto enviado (línea 174)
- [ ] Actualizar `src/admin/components/create-package-modal.tsx`:
  - Remover state de `availableDates` (línea 79)
  - Remover input field para available_dates
  - Remover de objeto enviado (línea 145)

**Qué NO hacer:**
- NO modificar la UI de `blocked_dates` (mantenerla si existe)
- NO cambiar diseño general de los modales
- NO eliminar otros campos del formulario

**Perfil de Agente Recomendado:**
- **Categoría**: `visual-engineering`
  - Razón: Cambios en componentes React de la UI
- **Skills**: `building-admin-dashboard-customizations`
  - `building-admin-dashboard-customizations`: Especializado en UI del admin de Medusa

**Paralelización:**
- **Puede ejecutarse en paralelo**: SÍ (con Tasks 3-5)
- **Grupo paralelo**: Tasks 3-7
- **Bloquea**: Tasks 8, 9, 10
- **Bloqueado por**: Task 1

**Referencias:**
- `src/admin/routes/tours/page.tsx`
- `src/admin/routes/packages/page.tsx`
- `src/admin/components/create-tour-modal.tsx`
- `src/admin/components/create-package-modal.tsx`

**Criterios de Aceptación:**
- [ ] Ningún archivo en `src/admin/` referencia `available_dates`
- [ ] UI no muestra campo de available_dates
- [ ] Modales no envían available_dates

**Escenarios de QA:**
```
Scenario: Admin UI no tiene available_dates
  Tool: Bash (grep)
  Pasos:
    1. grep -r "available_dates" src/admin/ --include="*.tsx" --include="*.ts" | wc -l
  Resultado Esperado: 0
  Evidencia: Terminal output
```

**Commit**: Agrupa con Task 3

---

### Task 7: Actualizar Types y Middlewares

**Qué hacer:**
- [ ] Actualizar `src/admin/types.ts`:
  - Remover `available_dates` de interface Tour (línea 8)
  - Remover `available_dates` de interface Package (línea 43)
- [ ] Actualizar `src/api/middlewares.ts`:
  - Remover `available_dates` de allowed fields (líneas 61, 81)
- [ ] Actualizar `src/scripts/check-tours.ts`:
  - Remover referencia a `available_dates` (línea 22)

**Qué NO hacer:**
- NO modificar otros types
- NO cambiar lógica de middlewares de autenticación
- NO eliminar scripts, solo actualizarlos

**Perfil de Agente Recomendado:**
- **Categoría**: `quick`
- **Skills**: `building-with-medusa`, `building-admin-dashboard-customizations`

**Paralelización:**
- **Puede ejecutarse en paralelo**: SÍ (con Tasks 3-6)
- **Grupo paralelo**: Tasks 3-7
- **Bloquea**: Tasks 8, 9, 10
- **Bloqueado por**: Task 1

**Referencias:**
- `src/admin/types.ts`
- `src/api/middlewares.ts`
- `src/scripts/check-tours.ts`

**Criterios de Aceptación:**
- [ ] Types no incluyen available_dates
- [ ] Middlewares no permiten available_dates
- [ ] Scripts no referencian available_dates

**Escenarios de QA:**
```
Scenario: Types y middlewares actualizados
  Tool: Bash (grep)
  Pasos:
    1. grep "available_dates" src/admin/types.ts | wc -l
    2. grep "available_dates" src/api/middlewares.ts | wc -l
    3. grep "available_dates" src/scripts/check-tours.ts | wc -l
  Resultado Esperado: 0 para cada comando
  Evidencia: Terminal output
```

**Commit**: Agrupa con Task 3

---

### Task 8: Actualizar Tests Unitarios

**Qué hacer:**
- [ ] Actualizar `src/modules/tour/__tests__/tour-service.spec.ts`:
  - Remover `available_dates` de todos los objetos de test (~100 referencias)
  - Actualizar tests que verifican available_dates
- [ ] Actualizar `src/modules/package/__tests__/package-service.spec.ts`:
  - Remover `available_dates` de todos los objetos de test
- [ ] Actualizar `src/modules/tour/__tests__/tour-module.service.unit.spec.ts`:
  - Remover `available_dates` de mocks y assertions
- [ ] Actualizar `src/modules/package/__tests__/package-module.service.unit.spec.ts`:
  - Remover `available_dates` de mocks y assertions
- [ ] Actualizar `src/modules/tour/__tests__/tour-model.unit.spec.ts`:
  - Remover tests específicos de available_dates si existen
- [ ] Actualizar `src/modules/package/__tests__/package-model.unit.spec.ts`:
  - Remover tests específicos de available_dates si existen

**Qué NO hacer:**
- NO eliminar tests de `blocked_dates` (mantenerlos)
- NO modificar tests de otras funcionalidades
- NO skip tests, actualizarlos correctamente

**Perfil de Agente Recomendado:**
- **Categoría**: `unspecified-high`
  - Razón: Muchos archivos, muchas referencias, alta complejidad
- **Skills**: `building-with-medusa`

**Paralelización:**
- **Puede ejecutarse en paralelo**: NO (después de Tasks 3-7)
- **Grupo paralelo**: Task 8
- **Bloquea**: Task 9
- **Bloqueado por**: Tasks 3, 4, 5, 6, 7

**Referencias:**
- `src/modules/tour/__tests__/tour-service.spec.ts`
- `src/modules/package/__tests__/package-service.spec.ts`
- `src/modules/tour/__tests__/tour-module.service.unit.spec.ts`
- `src/modules/package/__tests__/package-module.service.unit.spec.ts`

**Criterios de Aceptación:**
- [ ] Tests unitarios no referencian `available_dates`
- [ ] `bun test src/modules/tour/__tests__/` → passing
- [ ] `bun test src/modules/package/__tests__/` → passing

**Escenarios de QA:**
```
Scenario: Tests unitarios pasan
  Tool: Bash (bun test)
  Pasos:
    1. bun test src/modules/tour/__tests__/tour-service.spec.ts 2>&1 | tail -5
    2. bun test src/modules/package/__tests__/package-service.spec.ts 2>&1 | tail -5
  Resultado Esperado: 
    - "passing" o número de tests exitosos
    - Sin errores relacionados a available_dates
  Evidencia: Test output

Scenario: Tests de modelos pasan
  Tool: Bash (bun test)
  Pasos:
    1. bun test src/modules/tour/__tests__/tour-model.unit.spec.ts
    2. bun test src/modules/package/__tests__/package-model.unit.spec.ts
  Resultado Esperado: Passing
  Evidencia: Test output
```

**Commit**: SÍ (agrupa con Task 9)
- Mensaje: `test: remove available_dates from unit and integration tests`
- Archivos: Todos los archivos de test modificados
- Pre-commit: `bun test src/modules/tour/__tests__/ src/modules/package/__tests__/` debe pasar

---

### Task 9: Actualizar Tests E2E

**Qué hacer:**
- [ ] Actualizar `integration-tests/http/tour-workflow.spec.ts`:
  - Remover `available_dates` de todos los objetos de test (~50+ referencias)
  - Actualizar assertions que verifican available_dates
- [ ] Actualizar `integration-tests/http/package-workflow.spec.ts`:
  - Remover `available_dates` de todos los objetos de test
- [ ] Actualizar `integration-tests/http/tour-purchase-flow.spec.ts`:
  - Remover `available_dates` de test data
- [ ] Actualizar `integration-tests/http/package-purchase-flow.spec.ts`:
  - Remover `available_dates` de test data
- [ ] Actualizar `integration-tests/http/workflow-steps.spec.ts`:
  - Remover `available_dates` de objetos y assertions
- [ ] Actualizar `integration-tests/http/tour-booking-locking.spec.ts`:
  - Remover `available_dates` de test data

**Qué NO hacer:**
- NO modificar la lógica de los tests, solo los datos
- NO eliminar tests de booking/purchase flow
- NO skip tests

**Perfil de Agente Recomendado:**
- **Categoría**: `unspecified-high`
  - Razón: Tests E2E complejos, múltiples archivos
- **Skills**: `building-with-medusa`

**Paralelización:**
- **Puede ejecutarse en paralelo**: NO (después de Task 8 y migración)
- **Grupo paralelo**: Task 9
- **Bloquea**: Task 10
- **Bloqueado por**: Tasks 2 (migración), 8

**Referencias:**
- `integration-tests/http/tour-workflow.spec.ts`
- `integration-tests/http/package-workflow.spec.ts`
- `integration-tests/http/tour-purchase-flow.spec.ts`
- `integration-tests/http/package-purchase-flow.spec.ts`
- `integration-tests/http/workflow-steps.spec.ts`
- `integration-tests/http/tour-booking-locking.spec.ts`

**Criterios de Aceptación:**
- [ ] Tests E2E no referencian `available_dates`
- [ ] `bun test integration-tests/http/tour-workflow.spec.ts` → passing
- [ ] `bun test integration-tests/http/package-workflow.spec.ts` → passing
- [ ] Todos los tests E2E de tour y package pasan

**Escenarios de QA:**
```
Scenario: Tests E2E pasan
  Tool: Bash (bun test)
  Precondiciones: Servidor de test corriendo, migraciones aplicadas
  Pasos:
    1. bun test integration-tests/http/tour-workflow.spec.ts 2>&1 | tail -10
    2. bun test integration-tests/http/package-workflow.spec.ts 2>&1 | tail -10
  Resultado Esperado: 
    - "Test Files: X passed" o similar
    - Sin errores de available_dates
  Evidencia: Test output

Scenario: Tests de purchase flow pasan
  Tool: Bash (bun test)
  Pasos:
    1. bun test integration-tests/http/tour-purchase-flow.spec.ts
    2. bun test integration-tests/http/package-purchase-flow.spec.ts
  Resultado Esperado: Passing
  Evidencia: Test output
```

**Commit**: Agrupa con Task 8

---

### Task 10: Verificación Final y Cleanup

**Qué hacer:**
- [ ] Verificación global:
  - `grep -r "available_dates" src/ --include="*.ts" --include="*.tsx" | grep -v "migrations" | grep -v "__tests__" | wc -l` → debe ser 0
- [ ] Verificación de tests:
  - `bun test` → todos pasan
- [ ] Verificación de TypeScript:
  - `npx tsc --noEmit` → sin errores
- [ ] Verificación de migración:
  - `npx medusa db:migrate` → exito
- [ ] Opcional: Actualizar `TOUR_BOOKING_README.md` si documenta available_dates
- [ ] Opcional: Actualizar `req.py` si es un script de ejemplo

**Qué NO hacer:**
- NO modificar migraciones históricas (archivos Migration*.ts existentes)
- NO eliminar archivos de snapshot (.snapshot-*.json) - Medusa los maneja
- NO hacer cambios no relacionados

**Perfil de Agente Recomendado:**
- **Categoría**: `quick`
- **Skills**: `building-with-medusa`

**Paralelización:**
- **Puede ejecutarse en paralelo**: NO
- **Grupo paralelo**: Task 10 (final)
- **Bloquea**: Ninguno
- **Bloqueado por**: Tasks 1-9

**Referencias:**
- Todo el codebase
- `TOUR_BOOKING_README.md`
- `req.py`

**Criterios de Aceptación:**
- [ ] No quedan referencias a `available_dates` en código fuente
- [ ] Todos los tests pasan
- [ ] TypeScript compila sin errores
- [ ] Migraciones aplican correctamente

**Escenarios de QA:**
```
Scenario: Verificación global sin available_dates
  Tool: Bash (grep)
  Pasos:
    1. grep -r "available_dates" src/ --include="*.ts" --include="*.tsx" | grep -v "migrations" | grep -v ".spec.ts" | wc -l
  Resultado Esperado: 0
  Evidencia: Terminal output

Scenario: Todos los tests pasan
  Tool: Bash (bun test)
  Pasos:
    1. bun test 2>&1 | tail -20
  Resultado Esperado: 
    - Resumen muestra "passing" o sin fallos
  Evidencia: Test output completo

Scenario: TypeScript compila
  Tool: Bash (npx tsc)
  Pasos:
    1. npx tsc --noEmit 2>&1 | head -20
  Resultado Esperado: Sin errores (output vacío o solo warnings)
  Evidencia: tsc output
```

**Commit**: SÍ
- Mensaje: `chore: final cleanup and verification for available_dates removal`
- Archivos: Cualquier archivo residual encontrado
- Pre-commit: `bun test && npx tsc --noEmit`

---

## Commit Strategy

| Después de Task | Mensaje | Archivos | Verificación |
|-----------------|---------|----------|--------------|
| 1 | `refactor(tour,package): remove available_dates field from models` | tour.ts, package.ts | grep sin resultados |
| 2 | `chore(migrations): add migration to drop available_dates column` | Migration*.ts | migrate exitoso |
| 3-7 | `refactor(api,workflows,admin): remove available_dates from endpoints and UI` | src/api/*, src/workflows/*, src/admin/* | grep + tsc |
| 8-9 | `test: remove available_dates from all tests` | **tests/**/*.spec.ts | bun test passing |
| 10 | `chore: final verification and cleanup` | Archivos residuales | Full test suite |

---

## Success Criteria

### Comandos de Verificación Final
```bash
# 1. No references in source code (excluding migrations and tests)
grep -r "available_dates" src/ --include="*.ts" --include="*.tsx" | grep -v "migrations" | grep -v ".spec.ts"
# Expected: 0 results

# 2. All tests pass
bun test
# Expected: All passing

# 3. TypeScript compiles
npx tsc --noEmit
# Expected: No errors

# 4. Migrations apply
npx medusa db:migrate
# Expected: Success

# 5. APIs work (smoke test)
curl -s http://localhost:9000/admin/tours | grep -q "available_dates" && echo "FAIL" || echo "OK"
curl -s http://localhost:9000/store/tours | grep -q "available_dates" && echo "FAIL" || echo "OK"
# Expected: OK for both
```

### Checklist Final
- [ ] `available_dates` eliminado de modelos Tour y Package
- [ ] Migración creada para eliminar columna de DB
- [ ] APIs (admin y store) no aceptan ni retornan `available_dates`
- [ ] Workflows y steps actualizados
- [ ] Admin UI no muestra campo `available_dates`
- [ ] Types y middlewares actualizados
- [ ] Todos los tests unitarios pasan
- [ ] Todos los tests E2E pasan
- [ ] TypeScript compila sin errores
- [ ] Documentación actualizada (si aplica)

---

## Notas Importantes

### Datos Existentes
Si hay datos existentes en `available_dates` en producción, se debe:
1. Hacer backup antes de aplicar migración
2. Decidir si migrar datos a `blocked_dates` (complemento lógico) o descartar
3. Comunicar a stakeholders sobre el cambio

### Breaking Changes
Este es un **breaking change** para:
- API consumers que dependen de `available_dates` en responses
- Integraciones externas que envían `available_dates` en requests
- Scripts o reports que usan el campo

### Migración Recomendada
Para producción, considerar:
1. **Fase 1**: Deploy código que ignora `available_dates` pero no falla si viene
2. **Fase 2**: Migración de datos (si es necesario)
3. **Fase 3**: Eliminación física de la columna

### Rollback Plan
En caso de problemas:
1. Revertir commits
2. Restaurar backup de DB si se eliminó columna
3. Redeploy versión anterior
