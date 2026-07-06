# Estrategia JIT para creación de usuario y login

**Session ID:** ses_0ea881013ffeBZLPo4ezhziybo
**Created:** 6/29/2026, 10:20:09 PM
**Updated:** 6/29/2026, 10:22:54 PM

---

## User

Podrias explicarme la estrategia que se manejo con jit para la creacion de un usuario ? ademas de el login ?

---

## Assistant (Sisyphus - Ultraworker · Big Pickle · 4.1s)

**Tool: read**

**Tool: grep**

---

## Assistant (Sisyphus - Ultraworker · Big Pickle · 3.8s)

**Tool: read**

**Tool: read**

**Tool: read**

---

## Assistant (Sisyphus - Ultraworker · Big Pickle · 18.4s)

Claro, te explico la estrategia **JIT (Just-In-Time)** que se implementó para la creación de usuario y login con Keycloak.

---

## Visión General

La estrategia JIT resuelve un problema clásico de SSO: **el usuario existe en Keycloak pero aún no tiene una cuenta en Medusa**. En vez de exigir que alguien cree la cuenta manualmente en Medusa antes del primer login, el sistema la crea **al vuelo** en el momento exacto en que el usuario se autentica por primera vez.

---

## Las Dos Rutas de Provisionamiento (Dual Path)

Hay **dos caminos independientes** que pueden crear el usuario en Medusa, y el JIT existe precisamente para manejar el *race condition* entre ellos:

### 1. Ruta Síncrona — API Route (`POST /store/auth/keycloak`)

```
Flujo: Frontend → Keycloak (login) → token → POST /store/auth/keycloak → JIT si no existe → cookie _medusa_jwt
```

- El frontend envía el token de Keycloak al endpoint.
- La ruta busca un `ProviderIdentity` existente con `provider: "keycloak-store"` y `entity_id: keycloakSub`.
- **Si NO existe** → ejecuta `provisionCustomerFromKeycloak()` inmediatamente → crea AuthIdentity + Customer → responde con cookie JWT de Medusa.
- **Si SÍ existe** → valida que `app_metadata.customer_id` esté presente; si falta, hace JIT fallback.

### 2. Ruta Asíncrona — Subscriber (`passenger.ts`)

```
Flujo: Keycloak → evento RabbitMQ "identity.user.created.v1" → subscriber → idempotency lock → provisionCustomerFromKeycloak()
```

- Escucha eventos `identity.user.created.v1` publicados cuando se crea un usuario en Keycloak.
- Usa un **idempotency store** (lock por `eventId`) para evitar procesamiento duplicado.
- Solo procesa usuarios de tipo `PASSENGER`.
- Marca el evento como `complete` cuando termina.

---

## El Corazón: `provisionCustomerFromKeycloak()` (Workflow Helper)

Es **idempotente** por diseño — se puede llamar desde ambos caminos sin duplicar registros:

```
┌─────────────────────────────────────────────┐
│   provisionCustomerFromKeycloak(input)       │
├─────────────────────────────────────────────┤
│                                              │
│  1. AuthIdentity + ProviderIdentity          │
│     └─ ¿Existe provider_identity?            │
│        SÍ → retrieve existente              │
│        NO → createAuthIdentities()           │
│             └─ ¿Error "already exists"?      │
│                → Race condition → recover    │
│                                              │
│  2. Customer                                 │
│     └─ ¿Existe customer con ese email?       │
│        SÍ → usar existente                   │
│              └─ ¿sin first_name? → update    │
│        NO → createCustomerAccountWorkflow()  │
│                                              │
│  3. Link (app_metadata)                      │
│     └─ app_metadata.customer_id == customer? │
│        NO → updateAuthIdentities() link      │
│                                              │
│  Returns: { customerId, authIdentityId,      │
│             wasCreated: boolean }            │
└─────────────────────────────────────────────┘
```

---

## ¿Por Qué JIT? El Problema que Resuelve

El comentario en la ruta lo dice exactamente:

> **"JIT Provisioning: create AuthIdentity + Customer on demand when the subscriber hasn't processed the RabbitMQ event yet, so the front gets a valid Medusa token on the first attempt."**

El problema es de **timing**:

| Escenario | Subscriber (async) | API Route (sync) | Resultado |
|---|---|---|---|
| Usuario creado hace horas en Keycloak | Ya procesó | JIT findea existente | ✅ Login normal |
| Usuario acaba de crearse en Keycloak | Aún no llegó el evento | **JIT crea al vuelo** | ✅ Login en primer intento |
| Ambos llegan al mismo tiempo | Crea AuthIdentity | Crea Customer, recupera AuthIdentity por race condition | ✅ Idempotente, no duplica |

---

## El Login en Detalle

El flujo completo de login:

```
1. Frontend redirige a Keycloak → usuario ingresa credenciales
2. Keycloak devuelve access_token al frontend
3. Frontend llama POST /store/auth/keycloak con el token
4. El endpoint:
   a. Extrae el token (body o Authorization header)
   b. Decodifica el JWT (o fallback a userinfo endpoint de Keycloak)
   c. Valida que tenga el claim "sub"
   d. Busca provider_identity existente
   e. Si no existe → JIT provisionCustomerFromKeycloak()
   f. Firma un nuevo JWT de Medusa con:
      { actor_id: customerId, actor_type: "customer", auth_identity_id }
   g. Establece cookie httpOnly "_medusa_jwt" (7 días)
   h. Responde { message: "Login exitoso", customer_id, token }
5. El frontend ahora tiene sesión de Medusa válida
```

La cookie `_medusa_jwt` es **httpOnly, secure en producción, sameSite: lax**, configurada con dominio `.patarutera.pe` en producción.

---

## Resumen

**JIT = crear la cuenta de Medusa en el momento exacto del primer login, no antes.** Esto elimina la dependencia de que el evento asíncrono de RabbitMQ se haya procesado antes de que el usuario intente loguearse, y asegura que el primer intento de login siempre funcione.

---

## User

podrias hacer un prompt indicando al frontend , ahora como debe reaccionar ?

---

## Assistant (Sisyphus - Ultraworker · Big Pickle · 9.1s)

**Tool: glob**

**Tool: glob**

**Tool: grep**

---

## Assistant (Sisyphus - Ultraworker · Big Pickle · 3.2s)

**Tool: read**

**Tool: read**

---

## Assistant (Sisyphus - Ultraworker · Big Pickle · 26.4s)

Aquí tienes el prompt para el frontend (storefront):

---

## Prompt: Integración de Login con Keycloak (Storefront)

### Contexto

El backend expone `POST /store/auth/keycloak` que recibe un token de Keycloak, lo canjea por una sesión de Medusa y, si el usuario no existe aún en Medusa, lo crea automáticamente (JIT provisioning). El frontend **no necesita llamar a ningún otro endpoint de auth**.

### Flujo Completo

```
┌──────────┐       ┌──────────┐       ┌───────────┐       ┌──────────┐
│ Usuario  │       │ Frontend │       │ Keycloak  │       │ Medusa   │
│          │       │ (React)  │       │           │       │ Backend  │
└────┬─────┘       └────┬─────┘       └─────┬─────┘       └────┬─────┘
     │                  │                   │                  │
     │  Click "Login"   │                   │                  │
     │─────────────────>│                   │                  │
     │                  │  Redirect Auth URL│                  │
     │                  │──────────────────>│                  │
     │                  │                   │                  │
     │  Login form      │                   │                  │
     │<────────────────────────────────────>│                  │
     │                  │                   │                  │
     │                  │  Callback con      │                  │
     │                  │  access_token      │                  │
     │                  │<──────────────────│                  │
     │                  │                   │                  │
     │                  │  POST /store/auth/ │                  │
     │                  │  keycloak          │                  │
     │                  │  (access_token)    │                  │
     │                  │─────────────────────────────────────>│
     │                  │                   │                  │
     │                  │  200 {customer_id,│                  │
     │                  │       token}      │                  │
     │                  │  + Set-Cookie:    │                  │
     │                  │    _medusa_jwt    │                  │
     │                  │<─────────────────────────────────────│
     │                  │                   │                  │
     │  ✅ Autenticado  │                   │                  │
     │<─────────────────│                   │                  │
```

### Implementación Paso a Paso

#### 1. Iniciar Login

Redirige al usuario al endpoint de autorización de Keycloak. Típicamente usas `keycloak-js`:

```typescript
import Keycloak from "keycloak-js"

const keycloak = new Keycloak({
  url: "https://auth.patarutera.pe",
  realm: "tu-realm",
  clientId: "tu-storefront-client",
})

async function login() {
  try {
    const authenticated = await keycloak.init({ onLoad: "login-required" })
    if (authenticated) {
      // keycloak.token contiene el access_token
      await exchangeToken(keycloak.token!)
    }
  } catch (error) {
    console.error("Keycloak auth failed", error)
  }
}
```

**Sin `keycloak-js`** (redirect puro): Configura Keycloak para que redirect URI apunte a tu frontend, y extrae el token de la URL o via code exchange.

#### 2. Canjear Token con Medusa

```typescript
const BACKEND_URL = import.meta.env.VITE_MEDUSA_BACKEND_URL || "https://commerce.patarutera.pe"

async function exchangeToken(accessToken: string) {
  const res = await fetch(`${BACKEND_URL}/store/auth/keycloak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accessToken,          // ← campo principal que el backend reconoce
    }),
    credentials: "include", // ← OBLIGATORIO para aceptar la cookie
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || "Error al iniciar sesión")
  }

  const data = await res.json()
  // data = { message, customer_id, token }
  
  // Opcional: guardar el token en memoria para requests con Authorization header
  // (la cookie httpOnly se envía automáticamente)
  sessionStorage.setItem("medusa_token", data.token)

  return data
}
```

**El backend acepta el token en múltiples formatos:**
- Body: `{ accessToken }`, `{ access_token }`, `{ token }`, `{ id_token }`, `{ keycloakToken }`
- Header: `Authorization: Bearer <token>`

Recomendación: usa `{ accessToken }` en el body.

#### 3. Estado de Autenticación

La cookie `_medusa_jwt` es **httpOnly** (no accesible desde JavaScript). Para saber si el usuario está logueado:

**Opción A — Endpoint de perfil (recomendada):**
```typescript
async function getCustomerProfile() {
  try {
    const res = await fetch(`${BACKEND_URL}/store/customers/me`, {
      credentials: "include",
    })
    if (res.ok) return await res.json()
    return null // 401 = no autenticado
  } catch {
    return null
  }
}
```

**Opción B — State global**: Guarda manualmente `customer_id` después del login:

```typescript
// En tu store de estado global
const [customer, setCustomer] = useState<{ id: string; email: string } | null>(null)

// Después de exchangeToken exitoso
setCustomer({ id: data.customer_id, email: /* del perfil */ })

// En app init, intentar recuperar sesión
useEffect(() => {
  getCustomerProfile().then(setCustomer)
}, [])
```

#### 4. Requests Autenticados

Usa `credentials: "include"` en todos los fetch para que la cookie se envíe automáticamente:

```typescript
// ✅ Así funciona — la cookie viaja sola
const res = await fetch(`${BACKEND_URL}/store/carts`, {
  credentials: "include",
})

// Alternativa (si prefieres header explícito):
const token = sessionStorage.getItem("medusa_token")
const res = await fetch(`${BACKEND_URL}/store/carts`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
```

#### 5. Manejo de 401 / Sesión Expirada

```typescript
const API = {
  async fetch(url: string, options?: RequestInit) {
    const res = await fetch(`${BACKEND_URL}${url}`, {
      credentials: "include",
      ...options,
    })
    if (res.status === 401) {
      // Sesión expirada → redirect a login
      sessionStorage.removeItem("medusa_token")
      window.location.href = "/login"
      return
    }
    return res
  },
}
```

#### 6. Logout

```typescript
async function logout() {
  // 1. Limpiar estado local
  sessionStorage.removeItem("medusa_token")
  setCustomer(null)

  // 2. Cerrar sesión en Keycloak
  await keycloak.logout({ redirectUri: window.location.origin })

  // Opcional: llamar a logout endpoint de Medusa para limpiar la cookie
  await fetch(`${BACKEND_URL}/auth/logout`, {
    method: "DELETE",
    credentials: "include",
  })
}
```

### Modo Passthrough (Token Existente)

Si el frontend ya tiene un JWT válido de Medusa (ej. sesión persistente en localStorage), puede enviarlo directamente al mismo endpoint:

```typescript
async function restoreSession(storedToken: string) {
  const res = await fetch(`${BACKEND_URL}/store/auth/keycloak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${storedToken}`, // ← se envía como bearer
    },
    credentials: "include",
  })
  // El backend lo reconoce como "medusa_passthrough" y renueva la cookie
}
```

### SDK de Medusa (si usan `@medusajs/js-sdk`)

Para el storefront pueden usar el SDK oficial configurado con auth type `session`:

```typescript
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  auth: { type: "session" },
})

// Llamadas autenticadas
const { customer } = await sdk.store.customer.retrieve()
```

### Resumen de Puntos Clave

| Aspecto | Qué hacer |
|---|---|
| Login | Iniciar en Keycloak → enviar token a `POST /store/auth/keycloak` |
| Sesión | Cookie httpOnly `_medusa_jwt` se maneja sola |
| Saber si hay sesión | Llamar `GET /store/customers/me` con `credentials: "include"` |
| Requests autenticados | Siempre con `credentials: "include"` |
| Token alternativo | Opcional: guardar `data.token` en memory y usar `Authorization: Bearer` |
| Logout | Cerrar Keycloak + cleanup local |
| Creación de usuario | **Automática (JIT)** — el frontend no hace nada extra |

### Checklist de Implementación

- [ ] Configurar Keycloak JavaScript adapter (o redirect flow)
- [ ] Implementar `POST /store/auth/keycloak` con `credentials: "include"`
- [ ] Guardar `customer_id` en estado global después del login exitoso
- [ ] Agregar `credentials: "include"` a todos los fetch del storefront
- [ ] Manejar 401 con redirect a login
- [ ] Implementar logout (Keycloak + cleanup)
- [ ] Probar flujo completo: registro nuevo → JIT crea el usuario → sesión activa

---

