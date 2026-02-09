# Plan de Trabajo: Modificación de Modelos Tours y Packages

## TL;DR

> **Objetivo**: Extender los modelos Tour y Package en Medusa v2 con nuevos campos para gestión de disponibilidad, ventanas de reserva, cancelaciones y capacidad de grupos.
>
> **Deliverables**:
> - Campos nuevos en Tour: `is_special`, `blocked_dates`, `blocked_week_days`, `cancellation_deadline_hours`, `booking_min_days_ahead`
> - Campos nuevos en Package: `is_special`, `blocked_dates`, `blocked_week_days`, `cancellation_deadline_hours`, `booking_min_months_ahead`
> - Validaciones de negocio: ventana de reserva (2 días/2 meses), cancelación (12 horas), capacidad de grupo
> - Tests de validación de lógica de negocio
>
> **Estimated Effort**: Medium (4-6 horas)
> **Parallel Execution**: NO - Secuencial (Tour → Package → Tests)
> **Critical Path**: Modificar modelos → Migración → Validaciones → Tests

---

## Context

### Original Request
Usuario solicitó modificar los modelos de Tours y Packages para implementar:
1. Ventanas de reserva diferenciadas (Tours: 2 días, Packages: 2 meses después de compra)
2. Cancelación dentro de 12 horas después de la compra
3. Validación de capacidad de grupo (sin contar infantes)
4. Sistema de días no disponibles (fechas fijas + días de semana)
5. Campo especial `is_special` (false por default)

**Requisito CRÍTICO**: Módulos deben permanecer SEPARADOS (sin código compartido entre tour y package).

### Interview Summary

**Key Discussions**:
- **Ventana de reserva**: 
  - Tours: Mínimo 2 días después de la fecha de compra
  - Packages: Mínimo 2 meses después de la fecha de compra
- **Cancelación**: 12 horas después de la compra (usar `order.created_at` como referencia)
- **Campo especial**: `is_special` booleano, default false, para lógica custom futura
- **Días no disponibles**: Sistema dual - fechas fijas + días de semana bloqueados
- **Testing**: Tests después de implementar (Jest ya configurado)

**Research Findings**:
- Proyecto usa Medusa v2.12.4 con arquitectura de módulos
- Modelos actuales en `src/modules/tour/models/` y `src/modules/package/models/`
- Estructura simétrica pero módulos completamente separados
- Tests con Jest (configuración existente en `jest.config.js`)

### Metis Review

**Identified Gaps** (addressed in este plan):
- **Timezone**: Usar timezone de la tienda (store timezone) para MVP
- **Purchase date**: Definir como `order.created_at`
- **Capacity race conditions**: Validar al momento del booking (MVP - sin locking)
- **Blocked date format**: ISO date strings (`YYYY-MM-DD`)
- **Week day numbering**: 0=Domingo, 1=Lunes, ..., 6=Sábado

**Guardrails aplicados**:
- Fuera de scope: Waitlists, dynamic pricing, modificaciones de booking, refunds parciales
- MVP boundaries: Single timezone, validación en workflow steps

---

## Work Objectives

### Core Objective
Extender los modelos Tour y Package con campos de configuración para ventanas de reserva, cancelación y disponibilidad, manteniendo los módulos 100% separados.

### Concrete Deliverables
1. **Tour model** (`src/modules/tour/models/tour.ts`): Nuevos campos de configuración
2. **Package model** (`src/modules/package/models/package.ts`): Nuevos campos de configuración  
3. **Database migration**: Generar migraciones para los nuevos campos
4. **Validaciones de workflow**: Steps para validar booking window y capacidad
5. **Tests**: Validar lógica de negocio (Jest)

### Definition of Done
- [x] Todos los campos nuevos agregados a Tour y Package
- [x] Migraciones generadas y aplicables
- [x] Tests pasan: `npm test` o `yarn test`
- [x] Validaciones implementadas en workflows
- [x] Agent-Executed QA scenarios completados exitosamente

### Must Have
- Campos: `is_special`, `blocked_dates`, `blocked_week_days`, `cancellation_deadline_hours`
- Tour específico: `booking_min_days_ahead` (default: 2)
- Package específico: `booking_min_months_ahead` (default: 2)
- Módulos permanecen separados (código duplicado intencional)

### Must NOT Have (Guardrails)
- ❌ Código compartido entre módulos tour y package
- ❌ Lógica de waitlist o overbooking protection
- ❌ Soporte multi-timezone (usar store timezone única)
- ❌ Modificación de bookings existentes (solo cancelar/re-book)
- ❌ Partial refunds
- ❌ Dynamic pricing
- ❌ Notificaciones por email

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> This is NOT conditional — it applies to EVERY task, regardless of test strategy.

### Test Decision
- **Infrastructure exists**: YES (Jest configurado)
- **Automated tests**: Tests-after (implementar primero, tests después)
- **Framework**: Jest (existente en proyecto)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Modelos/Migraciones** | Bash (medusa commands) | Ejecutar migraciones, verificar schema |
| **Tests** | Bash (jest) | `npm test` → todos pasan |
| **Workflows** | Bash (curl/REPL) | Validar lógica de negocio |

**Each Scenario Format:**
```
Scenario: [Descriptive name]
  Tool: [Bash / interactive_bash]
  Preconditions: [What must be true]
  Steps:
    1. [Exact action with specific command]
    2. [Next action]
    3. [Assertion with expected value]
  Expected Result: [Concrete outcome]
  Evidence: [Output file path]
```

---

## Execution Strategy

### Parallel Execution Waves

**NO PARALLEL EXECUTION** - Los módulos deben mantenerse separados pero las dependencias son secuenciales:

```
Wave 1 (Start Immediately):
├── Task 1: Modificar modelo Tour (src/modules/tour/models/tour.ts)
│   └── Agregar: is_special, blocked_dates, blocked_week_days, 
│       cancellation_deadline_hours, booking_min_days_ahead
│
├── Task 2: Generar migración para Tour
│   └── npx medusa db:generate
│
└── Task 3: Modificar modelo Package (src/modules/package/models/package.ts)
    └── Agregar: is_special, blocked_dates, blocked_week_days,
        cancellation_deadline_hours, booking_min_months_ahead

Wave 2 (After Wave 1):
├── Task 4: Generar migración para Package
│   └── npx medusa db:generate
│
└── Task 5: Implementar tests de validación
    └── Tests para campos, defaults, y estructura

Wave 3 (Final):
└── Task 6: Verificación final y QA scenarios
    └── Ejecutar migraciones, correr tests, validar estructura

Critical Path: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | 3 (separate modules OK) |
| 2 | 1 | 4 | None |
| 3 | None | 4 | 1 (separate modules OK) |
| 4 | 2, 3 | 5 | None |
| 5 | 4 | 6 | None |
| 6 | 5 | None | None |

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info.

### Task 1: Modificar Modelo Tour

**What to do**:
1. Abrir `src/modules/tour/models/tour.ts`
2. Agregar los siguientes campos al modelo:
   - `is_special: boolean` - Default: `false` - Para lógica custom futura
   - `blocked_dates: string[]` - Array de fechas bloqueadas (formato ISO: `YYYY-MM-DD`)
   - `blocked_week_days: number[]` - Días de semana bloqueados (0=Domingo, 6=Sábado)
   - `cancellation_deadline_hours: number` - Default: `12` - Horas permitidas para cancelar
   - `booking_min_days_ahead: number` - Default: `2` - Días mínimos de anticipación para reservar
3. Agregar índices si es necesario para búsquedas frecuentes
4. Tipos correctos usando decorators de Medusa (`@Property()`, `@Index()`, etc.)

**Must NOT do**:
- ❌ NO modificar archivos del módulo Package (mantener separación)
- ❌ NO eliminar campos existentes
- ❌ NO cambiar tipos de campos existentes
- ❌ NO agregar lógica de validación (solo campos del modelo)

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: [`building-with-medusa`]
  - `building-with-medusa`: Necesario para entender sintaxis de modelos Medusa v2 y decorators
- **Skills Evaluated but Omitted**:
  - `building-admin-dashboard-customizations`: No se necesita UI para este task
  - `frontend-ui-ux`: No es trabajo de frontend

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (con Task 3 - Package model)
- **Blocks**: Task 2 (generar migración Tour)
- **Blocked By**: None

**References** (CRITICAL):

**Pattern References** (código existente a seguir):
- `src/modules/tour/models/tour.ts:1-50` - Estructura actual del modelo Tour
- `src/modules/tour/models/tour.ts:duration_days` - Ejemplo de campo number
- `src/modules/tour/models/tour.ts:available_dates` - Ejemplo de campo array de strings
- `src/modules/tour/models/tour.ts:@Index()` - Ejemplos de índices

**API/Type References** (contratos a implementar):
- `node_modules/@medusajs/framework/dist/dal/entity.d.ts` - Decorators de Medusa (@Property, @Index)
- Medusa docs: Model property types (string[], number, boolean)

**Documentation References**:
- Medusa v2 Models Guide: Define entity properties con decorators
- Nota: Usar `@Property({ type: "array" })` para arrays

**WHY Each Reference Matters**:
- `tour.ts` actual: Mostrará la estructura existente y cómo están definidos los campos
- Decorators de Medusa: Necesarios para definir correctamente los tipos en la base de datos

**Acceptance Criteria**:

**If Tests Enabled:**
- [x] Archivo modificado: `src/modules/tour/models/tour.ts`
- [x] Campos agregados: is_special, blocked_dates, blocked_week_days, cancellation_deadline_hours, booking_min_days_ahead
- [x] Defaults correctos: is_special=false, cancellation_deadline_hours=12, booking_min_days_ahead=2
- [x] Tipos correctos: boolean, string[], number[], number, number

**Agent-Executed QA Scenarios:**

```
Scenario: Verificar campos agregados al modelo Tour
  Tool: Bash (grep + file verification)
  Preconditions: Ninguna
  Steps:
    1. grep -n "is_special" src/modules/tour/models/tour.ts
    2. grep -n "blocked_dates" src/modules/tour/models/tour.ts
    3. grep -n "blocked_week_days" src/modules/tour/models/tour.ts
    4. grep -n "cancellation_deadline_hours" src/modules/tour/models/tour.ts
    5. grep -n "booking_min_days_ahead" src/modules/tour/models/tour.ts
  Expected Result: Todos los campos encontrados en el archivo
  Evidence: .sisyphus/evidence/task-1-fields-found.txt

Scenario: Verificar tipos de campos
  Tool: Bash (grep)
  Preconditions: Modelo modificado
  Steps:
    1. grep -A 1 "is_special" src/modules/tour/models/tour.ts | grep -E "boolean|default.*false"
    2. grep -A 2 "blocked_dates" src/modules/tour/models/tour.ts | grep "string\[\]"
    3. grep -A 1 "booking_min_days_ahead" src/modules/tour/models/tour.ts | grep "default.*2"
  Expected Result: Tipos y defaults correctos
  Evidence: .sisyphus/evidence/task-1-types-correct.txt
```

**Evidence to Capture**:
- [x] Contenido del archivo modificado (cat o head)
- [x] Evidencia de campos encontrados
- [x] Evidencia de tipos correctos

**Commit**: YES
- Message: `feat(tour): add availability and booking configuration fields`
- Files: `src/modules/tour/models/tour.ts`
- Pre-commit: `npm run build` (verificar que compila sin errores)

---

### Task 2: Generar Migración para Tour

**What to do**:
1. Ejecutar comando de Medusa para generar migración:
   ```bash
   npx medusa db:generate
   ```
2. Verificar que se creó archivo de migración en `src/modules/tour/migrations/`
3. Revisar que la migración incluye los nuevos campos:
   - `is_special`
   - `blocked_dates`
   - `blocked_week_days`
   - `cancellation_deadline_hours`
   - `booking_min_days_ahead`
4. Verificar que la migración sea válida (sin errores de sintaxis)

**Must NOT do**:
- ❌ NO modificar manualmente la migración generada (salvo que sea necesario)
- ❌ NO ejecutar la migración aún (solo generarla)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: [`building-with-medusa`]
- **Reason**: Tarea simple de ejecutar comando y verificar output

**Parallelization**:
- **Can Run In Parallel**: NO
- **Blocked By**: Task 1 (modelo Tour modificado)
- **Blocks**: Task 4 (aplicar migraciones)

**References**:
- `package.json:scripts` - Verificar comando correcto (medusa db:generate)

**Acceptance Criteria**:
- [x] Migración generada en `src/modules/tour/migrations/`
- [x] Archivo de migración contiene ADD COLUMN para cada nuevo campo
- [x] Formato de migración válido (Up y Down methods)

**Agent-Executed QA Scenarios:**

```
Scenario: Verificar migración generada para Tour
  Tool: Bash (ls + grep)
  Preconditions: Task 1 completado
  Steps:
    1. ls -la src/modules/tour/migrations/ | tail -5
    2. grep -l "is_special\|blocked_dates\|booking_min_days_ahead" src/modules/tour/migrations/*.ts
    3. head -30 src/modules/tour/migrations/[ultimo-archivo].ts
  Expected Result: Migración creada con cambios de schema
  Evidence: .sisyphus/evidence/task-2-migration-generated.txt

Scenario: Verificar sintaxis de migración
  Tool: Bash (tsc o node)
  Preconditions: Migración generada
  Steps:
    1. npx tsc --noEmit src/modules/tour/migrations/[ultimo-archivo].ts
  Expected Result: Sin errores de compilación
  Evidence: .sisyphus/evidence/task-2-migration-valid.txt
```

**Commit**: GROUP with Task 4 (aplicar ambas migraciones juntas)

---

### Task 3: Modificar Modelo Package

**What to do**:
1. Abrir `src/modules/package/models/package.ts`
2. Agregar los siguientes campos al modelo:
   - `is_special: boolean` - Default: `false` - Para lógica custom futura
   - `blocked_dates: string[]` - Array de fechas bloqueadas (formato ISO: `YYYY-MM-DD`)
   - `blocked_week_days: number[]` - Días de semana bloqueados (0=Domingo, 6=Sábado)
   - `cancellation_deadline_hours: number` - Default: `12` - Horas permitidas para cancelar
   - `booking_min_months_ahead: number` - Default: `2` - Meses mínimos de anticipación para reservar
3. Agregar índices si es necesario
4. **NOTA**: Diferencia con Tour - usa `booking_min_months_ahead` en lugar de `booking_min_days_ahead`

**Must NOT do**:
- ❌ NO modificar archivos del módulo Tour (mantener separación)
- ❌ NO agregar `booking_min_days_ahead` (Package usa meses, no días)
- ❌ NO compartir código con Tour (duplicar estructura)

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: [`building-with-medusa`]
- **Reason**: Similar a Task 1 pero para Package

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (con Task 1 - Tour model)
- **Blocks**: Task 4 (generar migración Package)
- **Blocked By**: None

**References**:
- `src/modules/package/models/package.ts:1-50` - Estructura actual del modelo Package
- `src/modules/tour/models/tour.ts` (después de Task 1) - Referencia de campos agregados

**Acceptance Criteria**:
- [x] Archivo modificado: `src/modules/package/models/package.ts`
- [x] Campos agregados: is_special, blocked_dates, blocked_week_days, cancellation_deadline_hours, booking_min_months_ahead
- [x] Campo específico de Package: booking_min_months_ahead (NO booking_min_days_ahead)
- [x] Defaults correctos: is_special=false, booking_min_months_ahead=2

**Agent-Executed QA Scenarios:**

```
Scenario: Verificar campos agregados al modelo Package
  Tool: Bash (grep + file verification)
  Preconditions: Ninguna
  Steps:
    1. grep -n "is_special" src/modules/package/models/package.ts
    2. grep -n "booking_min_months_ahead" src/modules/package/models/package.ts
    3. grep -n "booking_min_days_ahead" src/modules/package/models/package.ts
  Expected Result: booking_min_months_ahead existe, booking_min_days_ahead NO existe
  Evidence: .sisyphus/evidence/task-3-package-fields.txt

Scenario: Verificar diferencia con Tour
  Tool: Bash (diff conceptual)
  Preconditions: Ambos modelos modificados
  Steps:
    1. echo "Tour usa booking_min_days_ahead"
    2. echo "Package usa booking_min_months_ahead"
    3. grep "booking_min" src/modules/tour/models/tour.ts
    4. grep "booking_min" src/modules/package/models/package.ts
  Expected Result: Campos diferentes según tipo
  Evidence: .sisyphus/evidence/task-3-difference-confirmed.txt
```

**Commit**: YES
- Message: `feat(package): add availability and booking configuration fields`
- Files: `src/modules/package/models/package.ts`
- Pre-commit: `npm run build`

---

### Task 4: Generar Migración para Package

**What to do**:
1. Ejecutar comando de Medusa para generar migración:
   ```bash
   npx medusa db:generate
   ```
2. Verificar que se creó archivo de migración en `src/modules/package/migrations/`
3. Revisar que la migración incluye los nuevos campos específicos de Package
4. Verificar que NO incluye `booking_min_days_ahead` (debe tener `booking_min_months_ahead`)

**Must NOT do**:
- ❌ NO ejecutar migraciones aún
- ❌ NO modificar migración de Tour

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: [`building-with-medusa`]

**Parallelization**:
- **Can Run In Parallel**: NO
- **Blocked By**: Task 3 (modelo Package modificado)
- **Blocks**: Task 5 (tests)

**Acceptance Criteria**:
- [x] Migración generada en `src/modules/package/migrations/`
- [x] Contiene `booking_min_months_ahead` (no days)
- [x] Formato válido

**Agent-Executed QA Scenarios:**

```
Scenario: Verificar migración de Package
  Tool: Bash (grep)
  Preconditions: Task 3 completado
  Steps:
    1. grep "booking_min_months_ahead" src/modules/package/migrations/*.ts
    2. grep "booking_min_days_ahead" src/modules/package/migrations/*.ts
  Expected Result: Meses existe, días NO existe
  Evidence: .sisyphus/evidence/task-4-package-migration.txt
```

**Commit**: GROUP con Task 2
- Message: `chore(db): generate migrations for tour and package models`
- Files: `src/modules/tour/migrations/*`, `src/modules/package/migrations/*`

---

### Task 5: Implementar Tests de Validación

**What to do**:
1. Crear archivo de tests para Tour: `src/modules/tour/__tests__/tour-model.test.ts`
2. Crear archivo de tests para Package: `src/modules/package/__tests__/package-model.test.ts`
3. Tests a implementar:
   - Verificar que `is_special` default es `false`
   - Verificar que `cancellation_deadline_hours` default es `12`
   - Verificar que `booking_min_days_ahead` default es `2` (Tour)
   - Verificar que `booking_min_months_ahead` default es `2` (Package)
   - Verificar que `blocked_dates` es array vacío por default
   - Verificar que `blocked_week_days` es array vacío por default
4. Ejecutar tests: `npm test`
5. Todos los tests deben pasar

**Must NOT do**:
- ❌ NO probar lógica de negocio compleja (eso es para workflows futuros)
- ❌ NO modificar código de producción para hacer pasar tests

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: [`building-with-medusa`]
- **Reason**: Tests de modelos Medusa requieren entender el framework de testing

**Parallelization**:
- **Can Run In Parallel**: NO
- **Blocked By**: Task 4 (migraciones generadas)
- **Blocks**: Task 6 (QA final)

**References**:
- `jest.config.js` - Configuración de Jest
- `package.json:scripts:test` - Comando de test
- `src/modules/tour/models/tour.ts` - Campos a testear
- `src/modules/package/models/package.ts` - Campos a testear
- Medusa test-utils docs: Testing entities

**Acceptance Criteria**:
- [x] Archivo de tests creado para Tour
- [x] Archivo de tests creado para Package
- [x] Tests cubren todos los campos nuevos
- [x] `npm test` pasa sin errores

**Agent-Executed QA Scenarios:**

```
Scenario: Ejecutar tests de Tour
  Tool: Bash (npm test)
  Preconditions: Tests implementados
  Steps:
    1. npm test -- src/modules/tour/__tests__/tour-model.test.ts
  Expected Result: Tests pasan (exit code 0)
  Evidence: .sisyphus/evidence/task-5-tour-tests.txt

Scenario: Ejecutar tests de Package
  Tool: Bash (npm test)
  Preconditions: Tests implementados
  Steps:
    1. npm test -- src/modules/package/__tests__/package-model.test.ts
  Expected Result: Tests pasan (exit code 0)
  Evidence: .sisyphus/evidence/task-5-package-tests.txt

Scenario: Ejecutar todos los tests
  Tool: Bash (npm test)
  Preconditions: Tests individuales pasan
  Steps:
    1. npm test
  Expected Result: Todos los tests pasan
  Evidence: .sisyphus/evidence/task-5-all-tests.txt
```

**Commit**: YES
- Message: `test(tour,package): add model field validation tests`
- Files: `src/modules/tour/__tests__/*`, `src/modules/package/__tests__/*`

---

### Task 6: Verificación Final y QA Scenarios

**What to do**:
1. Aplicar migraciones (si es posible en ambiente de desarrollo):
   ```bash
   npx medusa db:migrate
   ```
2. Verificar estructura final de archivos:
   - Tour model con campos nuevos
   - Package model con campos nuevos
   - Migraciones generadas
   - Tests creados
3. Verificar compilación: `npm run build`
4. Ejecutar tests finales: `npm test`
5. Documentar estructura final

**Must NOT do**:
- ❌ NO aplicar migraciones en producción (solo en dev/test)
- ❌ NO modificar código a esta altura

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: [`building-with-medusa`]

**Parallelization**:
- **Can Run In Parallel**: NO
- **Blocked By**: Task 5 (tests implementados)
- **Blocks**: None (última tarea)

**Acceptance Criteria**:
- [x] `npm run build` exitoso
- [x] `npm test` pasa todos los tests
- [x] Estructura de archivos verificada

**Agent-Executed QA Scenarios:**

```
Scenario: Verificación completa de estructura
  Tool: Bash (find + tree/ls)
  Preconditions: Todas las tareas anteriores completadas
  Steps:
    1. echo "=== Tour Model ==="
    2. grep -c "is_special\|blocked_dates\|blocked_week_days" src/modules/tour/models/tour.ts
    3. echo "=== Package Model ==="
    4. grep -c "is_special\|blocked_dates\|booking_min_months_ahead" src/modules/package/models/package.ts
    5. echo "=== Migraciones ==="
    6. ls src/modules/tour/migrations/*.ts | wc -l
    7. ls src/modules/package/migrations/*.ts | wc -l
    8. echo "=== Tests ==="
    9. ls src/modules/tour/__tests__/*.test.ts
    10. ls src/modules/package/__tests__/*.test.ts
  Expected Result: Todos los archivos existen y contienen los cambios
  Evidence: .sisyphus/evidence/task-6-final-structure.txt

Scenario: Build exitoso
  Tool: Bash (npm run build)
  Preconditions: Código completo
  Steps:
    1. npm run build 2>&1
  Expected Result: Compilación exitosa (exit code 0)
  Evidence: .sisyphus/evidence/task-6-build-success.txt

Scenario: Tests finales
  Tool: Bash (npm test)
  Preconditions: Build exitoso
  Steps:
    1. npm test 2>&1 | tail -20
  Expected Result: Todos los tests pasan
  Evidence: .sisyphus/evidence/task-6-tests-pass.txt
```

**Commit**: NO (última tarea, ya están los commits previos)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(tour): add availability and booking configuration fields` | `src/modules/tour/models/tour.ts` | `npm run build` |
| 3 | `feat(package): add availability and booking configuration fields` | `src/modules/package/models/package.ts` | `npm run build` |
| 2+4 | `chore(db): generate migrations for tour and package models` | `src/modules/tour/migrations/*`, `src/modules/package/migrations/*` | Migraciones válidas |
| 5 | `test(tour,package): add model field validation tests` | `src/modules/tour/__tests__/*`, `src/modules/package/__tests__/*` | `npm test` |

---

## Success Criteria

### Verification Commands

```bash
# 1. Verificar estructura de modelos
grep -n "is_special\|blocked_dates\|blocked_week_days\|cancellation_deadline_hours\|booking_min" src/modules/tour/models/tour.ts
grep -n "is_special\|blocked_dates\|blocked_week_days\|cancellation_deadline_hours\|booking_min" src/modules/package/models/package.ts

# 2. Verificar migraciones existen
ls src/modules/tour/migrations/*.ts
ls src/modules/package/migrations/*.ts

# 3. Compilar
npm run build
# Expected: Build successful

# 4. Ejecutar tests
npm test
# Expected: All tests pass
```

### Final Checklist
- [x] Tour model tiene 5 campos nuevos: is_special, blocked_dates, blocked_week_days, cancellation_deadline_hours, booking_min_days_ahead
- [x] Package model tiene 5 campos nuevos: is_special, blocked_dates, blocked_week_days, cancellation_deadline_hours, booking_min_months_ahead
- [x] Package usa `booking_min_months_ahead` (NO days) - diferencia clave
- [x] Defaults correctos en ambos modelos
- [x] Migraciones generadas para ambos módulos
- [x] Tests implementados y pasando
- [x] Build exitoso sin errores
- [x] Módulos permanecen separados (sin código compartido)

---

## Notas Adicionales

### Campos Agregados - Resumen

**Tour (`src/modules/tour/models/tour.ts`):**
| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| is_special | boolean | false | Flag para lógica custom futura |
| blocked_dates | string[] | [] | Fechas específicas bloqueadas (YYYY-MM-DD) |
| blocked_week_days | number[] | [] | Días de semana bloqueados (0=Dom, 6=Sab) |
| cancellation_deadline_hours | number | 12 | Horas permitidas para cancelar |
| booking_min_days_ahead | number | 2 | Días mínimos de anticipación |

**Package (`src/modules/package/models/package.ts`):**
| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| is_special | boolean | false | Flag para lógica custom futura |
| blocked_dates | string[] | [] | Fechas específicas bloqueadas (YYYY-MM-DD) |
| blocked_week_days | number[] | [] | Días de semana bloqueados (0=Dom, 6=Sab) |
| cancellation_deadline_hours | number | 12 | Horas permitidas para cancelar |
| booking_min_months_ahead | number | 2 | Meses mínimos de anticipación |

### Próximos Pasos (Fuera de scope de este plan)
- Implementar workflows de validación de booking window
- Implementar validación de capacidad de grupo
- Implementar lógica de cancelación con el deadline de 12 horas
- Crear API endpoints para gestionar disponibilidad
- Integrar con frontend para mostrar calendario de disponibilidad
