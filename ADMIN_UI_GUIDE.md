# Guía de la Interfaz de Administración de Tours

## 🚀 Inicio Rápido

1. **Iniciar el servidor:**
```bash
npm run dev
```

2. **Acceder al Admin Dashboard:**
   - Abre tu navegador en `http://localhost:9000/app`
   - Inicia sesión con tus credenciales de administrador
   - En el menú lateral izquierdo, busca **"Tours"** (ícono de edificio 🏢)

## 📋 Páginas Disponibles

### 1. Lista de Tours (`/tours`)

**Ruta:** `http://localhost:9000/app/tours`

Esta es la página principal donde puedes:
- Ver todos los tours en una tabla organizada
- Ver información resumida de cada tour:
  - Destino
  - Duración en días
  - Capacidad máxima
  - Número de fechas disponibles
- Acciones disponibles:
  - **Ver/Editar:** Abre la página de detalles del tour
  - **Eliminar:** Elimina el tour (con confirmación)
  - **Crear Tour:** Botón principal para crear un nuevo tour

**Estado Vacío:**
Si no hay tours creados, verás un mensaje con un botón para crear el primer tour.

---

### 2. Crear Nuevo Tour (`/tours/new`)

**Ruta:** `http://localhost:9000/app/tours/new`

Formulario completo para crear un tour con los siguientes campos:

#### Campos del Formulario

**Product ID** * (requerido)
- ID único que conecta el tour con un producto de Medusa
- Ejemplo: `tour_prod_001`
- Este producto debe existir o ser creado en Medusa
- Formato sugerido: `tour_prod_XXX`

**Destino** * (requerido)
- Nombre del destino del tour
- Ejemplo: `Machu Picchu, Peru`

**Descripción** (opcional)
- Descripción detallada del tour
- Campo de texto largo (textarea)
- Ejemplo: `Tour guiado de día completo a la ciudadela inca...`

**Duración (días)** * (requerido)
- Número de días que dura el tour
- Mínimo: 1 día
- Ejemplo: `1`, `3`, `7`

**Capacidad Máxima** * (requerido)
- Número máximo de pasajeros por tour
- Mínimo: 1 persona
- Ejemplo: `30`, `20`, `15`

**Fechas Disponibles** * (requerido)
- Lista dinámica de fechas en las que el tour está disponible
- Puedes agregar múltiples fechas
- Botones:
  - **+ Agregar Fecha:** Añade un nuevo campo de fecha
  - **Eliminar:** Elimina una fecha específica (no disponible si solo hay una)
- Formato: Selector de fecha visual
- Las fechas se guardan en formato ISO

#### Comportamiento del Formulario

- **Validación en tiempo real:** Los campos requeridos deben estar completos
- **Creación de variantes:** Automáticamente crea 3 variantes de pasajeros:
  - Adulto (adult)
  - Niño (child)
  - Infante (infant)
- **Redirección:** Después de crear exitosamente, redirige a la lista de tours
- **Manejo de errores:** Muestra alertas si algo falla

---

### 3. Detalle y Edición de Tour (`/tours/:id`)

**Ruta:** `http://localhost:9000/app/tours/[id-del-tour]`

Página completa que muestra y permite editar un tour existente.

#### Sección 1: Información del Tour

**Encabezado:**
- Destino del tour (título principal)
- ID del tour
- Product ID asociado
- Botón "Volver a Tours"

**Formulario de Edición:**
- Mismos campos que la página de creación
- Los valores están precargados con la información actual
- Botón "Guardar Cambios" actualiza el tour
- Confirmación visual cuando se guarda exitosamente

#### Sección 2: Variantes de Pasajeros

Tabla que muestra las variantes creadas automáticamente:
- **Tipo de Pasajero:** Badge con color distintivo
  - 🔵 Azul: Adulto
  - 🟢 Verde: Niño
  - 🟣 Púrpura: Infante
- **Variant ID:** ID del variant en Medusa

Esto te ayuda a identificar qué variant IDs usar al crear productos.

#### Sección 3: Reservas Recientes

Tabla con las últimas 10 reservas del tour:
- **Pasajero:** Nombre del pasajero
- **Fecha del Tour:** Cuándo realizará el tour
- **Estado:** Badge con color según estado
  - 🟢 Verde: confirmed
  - 🔵 Azul: completed
  - 🔴 Rojo: cancelled
  - 🟠 Naranja: pending
- **Order ID:** ID de la orden en Medusa

**Estado Vacío:**
Si no hay reservas, muestra un mensaje informativo.

---

## 🎨 Características de la Interfaz

### Diseño Consistente
- Usa componentes de **Medusa UI** (@medusajs/ui)
- Paleta de colores coherente con el Admin Dashboard
- Iconos de **Medusa Icons** (@medusajs/icons)

### Componentes Utilizados

**Navegación:**
- `Container`: Contenedor principal de páginas
- `Heading`: Títulos de secciones

**Formularios:**
- `Input`: Campos de texto y número
- `Textarea`: Campos de texto largo
- `Label`: Etiquetas de campos
- `Button`: Botones de acción

**Tablas:**
- `Table`: Componente de tabla
- `Table.Header`: Encabezado
- `Table.Body`: Cuerpo de la tabla
- `Table.Row`: Fila
- `Table.Cell`: Celda

**UI Elements:**
- `Badge`: Insignias de estado y categoría

### Interactividad

**Estados de carga:**
- Mensajes "Cargando..." mientras se obtienen datos
- Botones deshabilitados durante operaciones
- Feedback visual: "Creando...", "Guardando..."

**Validación:**
- Campos requeridos marcados con asterisco (*)
- Validación HTML5 en campos de formulario
- Validación de números mínimos

**Confirmaciones:**
- Diálogo de confirmación antes de eliminar un tour
- Alertas de éxito y error

---

## 🔗 Flujo de Trabajo Recomendado

### Crear un Tour Completo

1. **Crear el Tour en la UI**
   - Ve a `/tours/new`
   - Completa el formulario
   - Usa un `product_id` único (ejemplo: `tour_prod_patagonia`)
   - Agrega todas las fechas disponibles
   - Haz clic en "Crear Tour"

2. **Crear el Producto en Medusa**
   - Ve a Products en el menú lateral
   - Crea un nuevo producto
   - Usa el mismo `product_id` que especificaste en el tour
   - Título: Nombre comercial del tour
   - Añade imágenes y descripción marketing

3. **Crear las Variantes del Producto**
   - En el producto creado, añade 3 variantes:
     - **Adulto:** Precio para adultos
     - **Niño:** Precio reducido para niños
     - **Infante:** Precio para infantes (puede ser gratis)
   - Usa los `variant_id` que ves en la página de detalle del tour

4. **Configurar Precios**
   - Establece los precios para cada variante
   - Considera diferentes monedas si es necesario
   - Configura impuestos según tu región

5. **Gestionar Inventario** (Opcional)
   - Medusa gestiona el inventario automáticamente
   - El sistema de tours valida la capacidad internamente

6. **Publicar**
   - Marca el producto como publicado
   - Ahora los clientes pueden ver y reservar el tour

---

## 🛠️ Solución de Problemas

### El menú "Tours" no aparece
- Verifica que el servidor esté corriendo: `npm run dev`
- Limpia la caché del navegador
- Revisa los logs del servidor por errores

### Error al crear un tour
- Verifica que todos los campos requeridos estén completos
- El `product_id` debe ser único
- Las fechas deben estar en formato válido
- Revisa la consola del navegador (F12) para ver errores detallados

### No puedo eliminar un tour
- Verifica que no haya reservas activas
- Revisa los permisos de tu usuario
- Consulta los logs del servidor

### Las fechas no se guardan correctamente
- Asegúrate de usar el selector de fechas
- No dejes campos de fecha vacíos
- Si no necesitas una fecha, elimínala con el botón "Eliminar"

---

## 📱 Responsive Design

La interfaz está optimizada para:
- 💻 Desktop (1920x1080 y superiores)
- 💻 Laptop (1366x768)
- 📱 Tablet (768px y superiores)

**Nota:** Para la mejor experiencia, se recomienda usar la interfaz en desktop.

---

## 🎯 Próximas Mejoras Sugeridas

- [ ] Filtros y búsqueda en la lista de tours
- [ ] Paginación para muchos tours
- [ ] Calendario visual para las fechas
- [ ] Gráficos de ocupación por tour
- [ ] Exportación de reservas a CSV/Excel
- [ ] Dashboard con estadísticas de tours
- [ ] Notificaciones en tiempo real
- [ ] Gestión masiva de fechas
- [ ] Preview del tour antes de publicar
