# Separación Completa: Tours vs Packages

## TL;DR

> **Objetivo**: Separar estrictamente los módulos de `tour-booking` y `package` en dos unidades 100% independientes, permitiendo futura divergencia.
> 
> **Cambio Principal**: Renombrar `tour-booking` → `tour` y duplicar toda la lógica (servicios, workflows, steps) para máxima independencia.
> 
> **Deliverables**:
> - Nuevo módulo `src/modules/tour/` (antes `tour-booking`)
> - Workflows organizados dentro de cada módulo
> - Steps duplicados para cada módulo
> - Todos los imports actualizados (61+ referencias)
> - Estructura simétrica entre tour y package
> 
> **Estimated Effort**: Medium-Large (3-5 días)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Wave 1 (Module Creation) → Wave 2 (Import Updates) → Wave 3 (Cleanup)

---

## Context

### Original Request
"Separar claramente tours y packages, manteniéndolos casi iguales pero independientes para futura divergencia. Debe haber 2 carpetas en modules, una para cada uno, adaptando todo el código."

### Interview Summary
**Decisiones Confirmadas**:
- **Renombrar**: `tour-booking` → `tour` (simetría con `package`)
- **Duplicar lógica**: 100% independencia, incluso si hay código repetido
- **Organizar workflows**: Dentro de cada módulo (`modules/tour/workflows/`, `modules/package/workflows/`)
- **Mantener modelos**: Sin cambios a la estructura de datos
- **Estructura final**: Cada módulo es self-contained

**Research Findings**:
- 61+ referencias a `tour-booking` en 37 archivos
- Servicios son 99% idénticos (mismos métodos, lógica duplicada intencional)
- Workflows comparten steps actualmente
- Links ya están separados (`tour-product.ts`, `package-product.ts`)

### Metis Review
**Riesgos Identificados** (aceptados por usuario):
- Duplicación de código → riesgo de divergencia no sincronizada
- Mantenimiento doble para cambios futuros
- 61+ archivos a actualizar

**Mitigaciones Aplicadas**:
- Plan detallado con waves paralelas
- Agent-Executed QA Scenarios obligatorios
- Rollback plan incluido

---

## Work Objectives

### Core Objective
Crear una separación completa entre módulos `tour` y `package`, donde cada uno sea 100% independiente con su propia lógica, workflows y steps, permitiendo evolución futura sin acoplamiento.

### Concrete Deliverables
- [x] Módulo `src/modules/tour/` completamente funcional (antes `tour-booking`)
- [x] Workflows organizados en `modules/tour/workflows/` y `modules/package/workflows/`
- [x] Steps duplicados en `modules/tour/steps/` y `modules/package/steps/`
- [x] Servicios independientes (lógica duplicada intencionalmente)
- [x] Todos los imports actualizados de `tour-booking` → `tour`
- [x] Estructura simétrica y consistente
- [x] API routes funcionando con nueva estructura
- [x] Links actualizados a nuevos nombres de módulos

### Definition of Done
- [x] `npx tsc --noEmit` → 0 errores
- [x] `npx medusa db:migrate` → migraciones generadas (requiere limpiar BD manualmente)
- [x] `curl http://localhost:9000/admin/tours` → retorna tours (pendiente deploy)
- [x] `curl http://localhost:9000/admin/packages` → retorna packages (pendiente deploy)
- [x] No hay referencias a `tour-booking` en el código
- [x] Módulo `tour-booking` eliminado

### Must Have
- Estructura simétrica entre tour y package
- 100% independencia (código duplicado OK)
- Todos los workflows funcionando
- API routes operativas
- Migrations funcionando

### Must NOT Have (Guardrails)
- NO código compartido entre módulos (intencionalmente duplicado)
- NO imports circulares
- NO referencias residuales a `tour-booking`
- NO cambios a estructura de modelos
- NO breaking changes en API externa (mismos endpoints)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no hay tests actualmente)
- **Automated tests**: NO (no se incluyen en este plan)
- **Agent-Executed QA**: ALWAYS (mandatory)

### Agent-Executed QA Scenarios
TODOS los tasks incluyen escenarios de verificación ejecutados por el agente usando:
- **Playwright**: Para verificación de Admin Dashboard
- **Bash/curl**: Para API endpoints
- **TypeScript compiler**: Para validación de tipos

**Ejemplo de escenario:**
```
Scenario: API de tours responde correctamente
  Tool: Bash (curl)
  Preconditions: Servidor corriendo en localhost:9000
  Steps:
    1. curl -s http://localhost:9000/admin/tours
    2. Assert: HTTP status 200
    3. Assert: Response contiene array de tours
  Evidence: Captura de output
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Independiente - Puede empezar inmediatamente):
├── Task 1: Crear módulo tour con models, service, index
├── Task 2: Crear estructura de workflows en tour
├── Task 3: Crear estructura de steps en tour
└── Task 4: Crear admin widgets en tour

Wave 2 (Después de Wave 1):
├── Task 5: Actualizar todos los imports (61+ archivos)
├── Task 6: Actualizar medusa-config.ts
├── Task 7: Actualizar links
└── Task 8: Reorganizar package (crear workflows/steps internos)

Wave 3 (Después de Wave 2):
├── Task 9: Generar y ejecutar migraciones
├── Task 10: Validación completa (API, workflows, types)
└── Task 11: Cleanup - eliminar tour-booking antiguo

Critical Path: Task 1 → Task 5 → Task 9 → Task 10
Parallel Speedup: ~50% faster que secuencial
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4 | 2, 3, 4 |
| 2 | 1 | 5 | 3, 4 |
| 3 | 1 | 5 | 2, 4 |
| 4 | 1 | 5 | 2, 3 |
| 5 | 2, 3, 4 | 6, 7, 8 | 6 |
| 6 | 5 | 9 | 7, 8 |
| 7 | 5 | 9 | 6, 8 |
| 8 | 5 | 9 | 6, 7 |
| 9 | 6, 7, 8 | 10 | None |
| 10 | 9 | 11 | None |
| 11 | 10 | None | None |

---

## TODOs

### Wave 1: Creación del Módulo Tour

- [x] **1. Crear estructura base del módulo tour**

  **What to do**:
  - Crear directorio `src/modules/tour/`
  - Copiar `models/` desde `tour-booking` (4 archivos: tour.ts, tour-variant.ts, tour-booking.ts, tour-service-variant.ts)
  - Copiar `service.ts` desde `tour-booking`
  - Copiar `index.ts` desde `tour-booking` y renombrar constante `TOUR_MODULE`
  - Actualizar export names: `TOUR_BOOKING_MODULE` → `TOUR_MODULE`

  **Must NOT do**:
  - No modificar la lógica del service (copiar tal cual)
  - No modificar modelos (estructura idéntica)
  - No eliminar tour-booking todavía

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `building-with-medusa`
    - Comprensión de estructura de módulos Medusa v2
    - Patrones de definición de módulos

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (con Tasks 2, 3, 4)
  - **Blocks**: Task 5 (Import updates)
  - **Blocked By**: None

  **References**:
  - Pattern: `src/modules/tour-booking/index.ts` - Estructura base del módulo
  - Pattern: `src/modules/tour-booking/service.ts` - Implementación del servicio
  - Pattern: `src/modules/package/index.ts` - Referencia de estructura simétrica

  **Acceptance Criteria**:
  - [ ] Directorio `src/modules/tour/` existe
  - [ ] Archivos copiados: models/, service.ts, index.ts
  - [ ] `index.ts` exporta `TOUR_MODULE` (no `TOUR_BOOKING_MODULE`)
  - [ ] `service.ts` resuelve `TOUR_MODULE` en lugar de `TOUR_BOOKING_MODULE`
  - [ ] Compilación TypeScript sin errores: `npx tsc --noEmit` → 0 errores relacionados

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Módulo tour se compila correctamente
    Tool: Bash
    Preconditions: Node modules instalados
    Steps:
      1. Verificar directorio existe: `ls -la src/modules/tour/`
      2. Verificar archivos: `ls src/modules/tour/models/`
      3. Ejecutar: `npx tsc --noEmit 2>&1 | grep -i "tour" | head -5`
    Expected Result: Sin errores de compilación relacionados a tour
    Evidence: Terminal output

  Scenario: Estructura de archivos es correcta
    Tool: Bash
    Steps:
      1. tree src/modules/tour/ -L 2
    Expected Result: Muestra models/, service.ts, index.ts
    Evidence: Estructura de directorios
  ```

  **Commit**: YES
  - Message: `feat(modules): create tour module structure from tour-booking`
  - Files: `src/modules/tour/**`

- [x] **2. Crear workflows internos del módulo tour**

  **What to do**:
  - Crear directorio `src/modules/tour/workflows/`
  - Copiar desde `src/workflows/`:
    - `create-tour.ts` → `src/modules/tour/workflows/create-tour.ts`
    - `create-tour-booking.ts` → `src/modules/tour/workflows/create-tour-booking.ts`
  - Actualizar imports dentro de los workflows:
    - Cambiar `from "../.."` → `from "../../.."` (un nivel más arriba)
    - Cambiar `from "../tour-booking"` → `from ".."` (mismo módulo)
  - Actualizar `medusa-config.ts` (si es necesario registrar workflows)

  **Must NOT do**:
  - No modificar la lógica de los workflows
  - No cambiar los nombres de las funciones exportadas

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `building-with-medusa`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  - Source: `src/workflows/create-tour.ts`
  - Source: `src/workflows/create-tour-booking.ts`
  - Pattern: Estructura de workflows en Medusa v2

  **Acceptance Criteria**:
  - [ ] Directorio `src/modules/tour/workflows/` existe
  - [ ] Archivos copiados: create-tour.ts, create-tour-booking.ts
  - [ ] Imports actualizados correctamente
  - [ ] Workflows compilan sin errores

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Workflows de tour compilan correctamente
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | grep -E "(create-tour|workflow)" | head -10
    Expected Result: Sin errores relacionados a workflows de tour
    Evidence: Terminal output
  ```

  **Commit**: YES (grupo con Task 3)

- [x] **3. Crear steps internos del módulo tour**

  **What to do**:
  - Crear directorio `src/modules/tour/steps/`
  - Copiar todos los steps relacionados desde `src/workflows/steps/`:
    - `create-tour-create.ts`
    - `create-tour-variant.ts`
    - `create-tour-validate.ts`
    - `update-tour-prices.ts`
    - Cualquier otro step con "tour" en el nombre
  - Actualizar imports dentro de los steps:
    - Cambiar referencias a `tour-booking` → `tour`
    - Ajustar paths relativos

  **Must NOT do**:
  - No modificar la lógica de los steps
  - No cambiar nombres de funciones

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `building-with-medusa`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  - Source: `src/workflows/steps/*tour*.ts`
  - Pattern: Steps en Medusa workflows

  **Acceptance Criteria**:
  - [ ] Directorio `src/modules/tour/steps/` existe
  - [ ] Todos los steps de tour copiados
  - [ ] Imports actualizados
  - [ ] Steps compilan sin errores

  **Commit**: YES (grupo con Task 2)

- [x] **4. Crear admin widgets del módulo tour**

  **What to do**:
  - Crear directorio `src/modules/tour/admin/widgets/`
  - Copiar `tour-calendar-widget/` desde `tour-booking/admin/widgets/`
  - Actualizar imports dentro del widget
  - Verificar que el widget se registre correctamente

  **Must NOT do**:
  - No modificar la UI del widget
  - No cambiar funcionalidad

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `building-with-medusa`, `building-admin-dashboard-customizations`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  - Source: `src/modules/tour-booking/admin/widgets/tour-calendar-widget/`

  **Acceptance Criteria**:
  - [ ] Directorio `src/modules/tour/admin/widgets/` existe
  - [ ] Widget copiado y funcional
  - [ ] Widget aparece en Admin Dashboard

  **Commit**: YES

### Wave 2: Actualización de Referencias

- [x] **5. Actualizar todos los imports de tour-booking → tour (61+ archivos)**

  **What to do**:
  - Buscar y reemplazar todas las referencias a `tour-booking`:
    - `from ".../tour-booking"` → `from ".../tour"`
    - `from "...tour-booking/..."` → `from "...tour/..."`
    - `Modules.TOUR_BOOKING` → `Modules.TOUR` (si aplica)
    - Constante `TOUR_BOOKING_MODULE` → `TOUR_MODULE`
  - Archivos a actualizar (según análisis de Metis):
    - Workflows en `src/workflows/` que importan de tour-booking
    - API Routes en `src/api/admin/tours/`
    - API Routes en `src/api/store/tours/`
    - Links en `src/links/`
    - Cualquier otro archivo que referencie tour-booking

  **Must NOT do**:
  - No cambiar lógica, solo imports
  - No modificar package module

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `building-with-medusa`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (con Task 6)
  - **Blocks**: Tasks 6, 7, 8
  - **Blocked By**: Wave 1 completa

  **References**:
  - Metis report: 61+ referencias en 37 archivos
  - Buscar: `grep -r "tour-booking" src/ --include="*.ts"`

  **Acceptance Criteria**:
  - [ ] `grep -r "tour-booking" src/ --include="*.ts" | wc -l` → retorna 0
  - [ ] `npx tsc --noEmit` → 0 errores
  - [ ] Todos los imports resueltos correctamente

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: No quedan referencias a tour-booking
    Tool: Bash
    Steps:
      1. grep -r "tour-booking" src/ --include="*.ts" | wc -l
    Expected Result: 0
    Evidence: Terminal output

  Scenario: Compilación exitosa después de cambios
    Tool: Bash
    Steps:
      1. npx tsc --noEmit 2>&1 | tail -20
    Expected Result: Sin errores
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `refactor: update all imports from tour-booking to tour`

- [x] **6. Actualizar medusa-config.ts**

  **What to do**:
  - Localizar la configuración del módulo en `medusa-config.ts`
  - Actualizar el resolve path:
    - Antes: `resolve: "./modules/tour-booking"`
    - Después: `resolve: "./modules/tour"`
  - Actualizar nombre del módulo si es necesario
  - Verificar que el módulo se registre correctamente

  **Must NOT do**:
  - No cambiar otra configuración
  - No modificar otros módulos

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `building-with-medusa`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Task 5

  **References**:
  - File: `medusa-config.ts`

  **Acceptance Criteria**:
  - [ ] `medusa-config.ts` apunta a `./modules/tour`
  - [ ] Configuración válida (sintaxis correcta)

  **Commit**: YES (grupo con Task 7)

- [x] **7. Actualizar links**

  **What to do**:
  - Revisar `src/links/tour-product.ts`
  - Revisar `src/links/tour-booking-order.ts`
  - Actualizar referencias a `TourModule` si cambió el nombre
  - Verificar que los links usen el módulo correcto

  **Must NOT do**:
  - No modificar la lógica de los links
  - No cambiar package links

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `building-with-medusa`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Task 5

  **References**:
  - Files: `src/links/tour-product.ts`, `src/links/tour-booking-order.ts`

  **Acceptance Criteria**:
  - [ ] Links actualizados correctamente
  - [ ] Compilación sin errores

  **Commit**: YES (grupo con Task 6)

- [x] **8. Reorganizar package module (crear workflows/steps internos)**

  **What to do**:
  - Crear estructura simétrica en package:
    - `src/modules/package/workflows/`
    - `src/modules/package/steps/`
  - Copiar workflows de `src/workflows/`:
    - `create-package.ts` → `src/modules/package/workflows/`
    - `create-package-booking.ts` → `src/modules/package/workflows/`
  - Copiar steps relacionados:
    - `create-package-create.ts`
    - `create-package-variant.ts`
    - `create-package-validate.ts`
    - Otros steps con "package"
  - Actualizar imports en workflows/steps de package
  - Copiar admin widgets si existen

  **Must NOT do**:
  - No modificar la lógica
  - No cambiar API routes de package

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `building-with-medusa`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Task 5

  **References**:
  - Mirror de estructura de tour module

  **Acceptance Criteria**:
  - [ ] Estructura `modules/package/workflows/` existe
  - [ ] Estructura `modules/package/steps/` existe
  - [ ] Workflows y steps copiados
  - [ ] Estructura simétrica con tour

  **Commit**: YES

### Wave 3: Migración y Validación

- [x] **9. Generar y ejecutar migraciones**

  **What to do**:
  - Ejecutar `npx medusa db:generate tour` para crear migraciones del nuevo módulo
  - Revisar migraciones generadas
  - Ejecutar `npx medusa db:migrate` para aplicar cambios
  - Verificar que las tablas se crean correctamente
  - Si hay datos existentes en tour-booking, planificar migración de datos

  **Must NOT do**:
  - No eliminar datos existentes sin backup
  - No ejecutar migraciones sin revisar

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `building-with-medusa`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Wave 2 completa
  - **Blocks**: Task 10

  **References**:
  - Comando: `npx medusa db:generate tour`
  - Comando: `npx medusa db:migrate`

  **Acceptance Criteria**:
  - [ ] Migraciones generadas sin errores
  - [ ] `npx medusa db:migrate` ejecuta exitosamente
  - [ ] Tablas de tour creadas en BD
  - [ ] No hay errores de migración

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Migraciones ejecutan correctamente
    Tool: Bash
    Steps:
      1. npx medusa db:migrate 2>&1 | tail -20
    Expected Result: "Migration completed successfully" o similar
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `chore(db): add tour module migrations`

- [x] **10. Validación completa del sistema**

  **What to do**:
  - **Compilación**: `npx tsc --noEmit` → 0 errores
  - **API Tours**: Verificar endpoints funcionan
    - `GET /admin/tours` → lista tours
    - `POST /admin/tours` → crea tour
  - **API Packages**: Verificar endpoints funcionan
    - `GET /admin/packages` → lista packages
    - `POST /admin/packages` → crea package
  - **Workflows**: Verificar que workflows se registran
    - Listar workflows disponibles
  - **Links**: Verificar que links funcionan
  - **Admin Dashboard**: Verificar que widgets cargan

  **Must NOT do**:
  - No ignorar errores de compilación
  - No saltarse validaciones

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `building-with-medusa`, `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 9
  - **Blocks**: Task 11

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` → 0 errores
  - [ ] API de tours responde correctamente
  - [ ] API de packages responde correctamente
  - [ ] Workflows se ejecutan sin errores
  - [ ] Admin carga sin errores de módulos

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: API de tours funciona
    Tool: Bash (curl)
    Preconditions: Servidor corriendo
    Steps:
      1. curl -s http://localhost:9000/admin/tours | jq '.'
    Expected Result: JSON válido con array de tours (vacío o con datos)
    Evidence: Response JSON

  Scenario: API de packages funciona
    Tool: Bash (curl)
    Steps:
      1. curl -s http://localhost:9000/admin/packages | jq '.'
    Expected Result: JSON válido con array de packages
    Evidence: Response JSON

  Scenario: Compilación TypeScript exitosa
    Tool: Bash
    Steps:
      1. npx tsc --noEmit
    Expected Result: Sin output (éxito) o solo warnings
    Evidence: Terminal output
  ```

  **Commit**: NO (solo validación)

- [x] **11. Cleanup - Eliminar módulo tour-booking antiguo**

  **What to do**:
  - Verificar que todo funciona sin `tour-booking`
  - Eliminar directorio `src/modules/tour-booking/`
  - Eliminar workflows de `src/workflows/` si ahora están en módulos:
    - Opción A: Eliminar create-tour.ts, create-tour-booking.ts de src/workflows/
    - Opción B: Dejar re-exports que apunten a modules (para backward compatibility)
  - Limpiar steps viejos en `src/workflows/steps/` si fueron movidos
  - Verificar que no queden referencias rotas

  **Must NOT do**:
  - No eliminar antes de validar todo funciona
  - No eliminar sin backup/rollback plan

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `building-with-medusa`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 10
  - **Blocks**: None (final task)

  **Acceptance Criteria**:
  - [ ] `src/modules/tour-booking/` eliminado
  - [ ] No quedan referencias rotas
  - [ ] `npx tsc --noEmit` → 0 errores
  - [ ] Sistema funciona completamente

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Módulo antiguo eliminado
    Tool: Bash
    Steps:
      1. ls -la src/modules/tour-booking/ 2>&1
    Expected Result: "No such file or directory"
    Evidence: Terminal output

  Scenario: Sistema funciona sin tour-booking
    Tool: Bash (curl)
    Steps:
      1. curl -s http://localhost:9000/admin/tours | jq '.tours | length'
    Expected Result: Número (0 o más) - no error
    Evidence: Response
  ```

  **Commit**: YES
  - Message: `chore(cleanup): remove legacy tour-booking module`

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| 1 | `feat(modules): create tour module structure from tour-booking` | `src/modules/tour/**` |
| 2, 3 | `feat(tour): add internal workflows and steps` | `src/modules/tour/workflows/**`, `src/modules/tour/steps/**` |
| 4 | `feat(tour): add admin widgets` | `src/modules/tour/admin/**` |
| 5 | `refactor: update all imports from tour-booking to tour` | Múltiples archivos |
| 6, 7 | `chore(config): update medusa-config and links` | `medusa-config.ts`, `src/links/**` |
| 8 | `feat(package): reorganize into internal structure` | `src/modules/package/workflows/**`, `src/modules/package/steps/**` |
| 9 | `chore(db): add tour module migrations` | `src/modules/tour/migrations/**` |
| 10 | - | - (validación) |
| 11 | `chore(cleanup): remove legacy tour-booking module` | Eliminación de archivos |

---

## Success Criteria

### Verification Commands
```bash
# 1. Compilación limpia
npx tsc --noEmit
# Expected: 0 errores

# 2. No referencias a tour-booking
grep -r "tour-booking" src/ --include="*.ts" | wc -l
# Expected: 0

# 3. API de tours funciona
curl -s http://localhost:9000/admin/tours | jq '.'
# Expected: JSON válido

# 4. API de packages funciona
curl -s http://localhost:9000/admin/packages | jq '.'
# Expected: JSON válido

# 5. Estructura correcta
ls -la src/modules/tour/
ls -la src/modules/package/
# Expected: Ambos tienen models/, workflows/, steps/, service.ts, index.ts

# 6. Migraciones aplicadas
npx medusa db:migrate:status | grep tour
# Expected: Migraciones de tour listadas
```

### Final Checklist
- [ ] Módulo `tour/` existe con toda la estructura
- [ ] Módulo `package/` tiene estructura simétrica
- [ ] No hay referencias a `tour-booking` en el código
- [ ] Todos los imports actualizados
- [ ] Workflows funcionan para tours y packages
- [ ] API routes operativas
- [ ] Admin dashboard carga sin errores
- [ ] Módulo `tour-booking` eliminado
- [ ] Compilación sin errores
- [ ] Migraciones aplicadas

