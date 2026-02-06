# Draft: Separación Tours vs Packages

## Requerimiento Original
Separar claramente los módulos de tours y packages, manteniendo estructuras independientes para permitir divergencia futura.

## Análisis del Código Actual

### Estructura Existente
```
src/modules/
├── tour-booking/
│   ├── models/
│   │   ├── tour.ts
│   │   ├── tour-variant.ts
│   │   ├── tour-booking.ts
│   │   └── tour-service-variant.ts
│   ├── service.ts
│   ├── index.ts
│   └── admin/widgets/
│
└── package/
    ├── models/
    │   ├── package.ts
    │   ├── package-variant.ts
    │   ├── package-booking.ts
    │   └── package-service-variant.ts
    ├── service.ts
    ├── index.ts
    └── admin/widgets/
```

### Componentes Relacionados
- **Workflows**: create-tour.ts, create-package.ts, create-tour-booking.ts, create-package-booking.ts
- **Links**: tour-product.ts, package-product.ts, tour-booking-order.ts, package-booking-order.ts
- **API Routes**: Admin y Store routes para tours y packages
- **Steps**: Validaciones y pasos de creación en workflows/steps/

## Preguntas Pendientes

### 1. Alcance de la Separación
- ¿Los modelos actuales ya están bien definidos o necesitan ajustes?
- ¿Hay código compartido entre los módulos que debe duplicarse para hacerlos independientes?
- ¿Se deben renombrar archivos o estructuras? (ej: `tour-booking` → `tour`)

### 2. Shared Code
- ¿Hay lógica en service.ts que sea idéntica y deba mantenerse separada?
- ¿Los workflows/steps comparten código que debe duplicarse?
- ¿Hay helpers o utilidades compartidas?

### 3. Testing
- ¿Existe infraestructura de testing actual?
- ¿Debe este refactor incluir tests para verificar la separación?

## Notas de Decisión (CONFIRMADAS)

### Decisiones del Usuario
1. **Opción A**: Renombrar `tour-booking` → `tour` ✓
2. **Opción A**: Duplicar TODA la lógica para 100% independencia ✓
3. **Opción B**: Organizar workflows/steps dentro de cada módulo ✓
4. **Modelos**: Mantener exactamente como están ✓
5. **Estructura deseada**: La mostrada en el ejemplo ✓

### Estructura Final Planeada
```
src/modules/
├── tour/                           # Nuevo (antes tour-booking)
│   ├── models/
│   │   ├── tour.ts
│   │   ├── tour-variant.ts
│   │   ├── tour-booking.ts
│   │   └── tour-service-variant.ts
│   ├── service.ts                  # Lógica duplicada 100%
│   ├── workflows/
│   │   ├── create-tour.ts          # Workflow propio
│   │   └── create-tour-booking.ts
│   ├── steps/
│   │   ├── create-tour-create.ts   # Steps propios
│   │   ├── create-tour-variant.ts
│   │   └── create-tour-validate.ts
│   ├── admin/widgets/              # Widgets propios
│   │   └── tour-calendar-widget/
│   └── index.ts
│
└── package/                        # Existente (a reorganizar)
    ├── models/
    │   ├── package.ts
    │   ├── package-variant.ts
    │   ├── package-booking.ts
    │   └── package-service-variant.ts
    ├── service.ts                  # Lógica duplicada 100%
    ├── workflows/
    │   ├── create-package.ts       # Workflow propio
    │   └── create-package-booking.ts
    ├── steps/
    │   ├── create-package-create.ts # Steps propios
    │   ├── create-package-variant.ts
    │   └── create-package-validate.ts
    ├── admin/widgets/              # Widgets propios
    │   └── package-calendar-widget/
    └── index.ts

src/workflows/                      # Workflows raíz (solo imports/re-exports)
├── create-tour.ts                  → import desde modules/tour/workflows/
├── create-package.ts               → import desde modules/package/workflows/
├── create-tour-booking.ts          → import desde modules/tour/workflows/
├── create-package-booking.ts       → import desde modules/package/workflows/
└── steps/                          # Compatibilidad backward (opcional)
    ├── create-tour-create.ts
    ├── create-tour-variant.ts
    ├── create-tour-validate.ts
    └── (package steps...)

src/links/
├── tour-product.ts
├── package-product.ts
├── tour-booking-order.ts
└── package-booking-order.ts

src/api/
├── admin/
│   ├── tours/                      # Usa tour module
│   ├── packages/                   # Usa package module
│   └── bookings/
└── store/
    ├── tours/                      # Usa tour module
    └── packages/                   # Usa package module
```

### Archivos a Actualizar (según análisis de Metis)
- **61+ referencias** en 37 archivos que usan `tour-booking`
- **medusa-config.ts**: Actualizar resolve path
- **Todos los imports**: Cambiar de `tour-booking` a `tour`
- **Links**: Actualizar referencias a módulos
- **API Routes**: Actualizar imports
- **Workflows**: Mover a estructura dentro de módulos

### Riesgos Aceptados (Decisión del Usuario)
- **Duplicación de código**: Servicios idénticos en ambos módulos
- **Mantenimiento futuro**: Cambios deben hacerse en ambos lados
- **Divergencia**: Permitir que evolucionen independientemente

