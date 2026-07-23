# Docker buildx multi-arch build review

**Session ID:** ses_07385ffc5ffeQEZkyUUgWA4ElR
**Created:** 7/23/2026, 12:57:13 AM
**Updated:** 7/23/2026, 12:58:10 AM

---

## User

tengo esta idea para hacer build en docker para arm mas esta bien ?: docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t usuario/mi-app:latest \
  --push . 

---

## Assistant

El comando está bien sintácticamente y hace lo que esperas (build multi-arch + push de un manifiesto unificado), pero **solo funciona si cumples los requisitos previos**. Sino, falla.

## Requisitos previos (frecuentemente olvidados)

**1. Necesitas un builder buildx con driver `docker-container` o `kubernetes`** — el builder `docker` por defecto **no** soporta multi-platform en una sola build:

```bash
docker buildx create --use --name mybuilder --driver docker-container
docker buildx inspect --bootstrap
```

**2. Para compilar ARM64 desde un host AMD64, necesitas QEMU registrado** (una sola vez por host):

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

**3. Debes estar logueado en el registro** antes de `--push` (`docker login`).

## Flujo completo recomendado

```bash
# Una sola vez (setup del entorno)
docker run --privileged --rm tonistiigi/binfmt --install all
docker buildx create --use --name mybuilder --driver docker-container

# Build + push multi-arch
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t usuario/mi-app:latest \
  --push .
```

## Consideraciones a tener en cuenta

| Punto | Detalle |
|---|---|
| **Performance** | Compilar ARM64 vía QEMU en host AMD64 es **muy lento** (emulación). Para builds serios usa runners ARM nativos (GitHub Actions `arm64`, AWS Graviton) o cache. |
| **Cache** | Añade `--cache-from type=registry,ref=usuario/mi-app:buildcache --cache-to type=registry,ref=usuario/mi-app:buildcache,mode=max` para acelerar rebuilds. |
| **Tag `latest`** | Funciona, pero conviene etiquetar también con versión (`:1.0.0`) o digest de commit para trazabilidad. |
| **Verificación** | Tras push: `docker buildx imagetools inspect usuario/mi-app:latest` confirma que el manifiesto tiene ambos archs. |

## Validación rápida

```bash
# Sin push, solo para verificar que compila para ambas plataformas:
docker buildx build --platform linux/amd64,linux/arm64 --output type=local,dest=./out .
```

En resumen: **el comando está bien, lo que te falta es el setup del builder + QEMU**. Si ya tienes un builder `docker-container` activo y QEMU instalado, tu comando funciona tal cual.

---

## User

actualmnte solo hage docker build ...., que debo hacer para tener soporte arm

---

## Assistant

Es una pregunta directa sobre configuración de Docker — no hay código que escribir ni archivos que editar, te respondo directo.

## Pasos para habilitar ARM desde tu setup actual (`docker build`)

Actualmente usas el builder clásico que **no soporta multi-plataforma**. Tienes que migrar a `buildx`. Son 3 pasos (uno solo vez) + 1 cambio en tu comando.

### Paso 1 — Instalar emulación ARM (una sola vez por máquina)

Como estás en AMD64 y quieres compilar ARM64, necesitas registrar QEMU:

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

> Verifica: `docker run --privileged --rm tonistiigi/binfmt --install` debería listar `arm64` como disponible.

### Paso 2 — Crear un builder buildx (una sola vez)

El builder `docker` por defecto no compila multi-arch. Crea uno con driver `docker-container`:

```bash
docker buildx create --use --name multibuilder --driver docker-container
docker buildx inspect --bootstrap
```

> `--bootstrap` descarga la imagen del builder la primera vez (tarda unos segundos).

### Paso 3 — Verificar tu builder activo

```bash
docker buildx ls
```

Debes ver `multibuilder` marcado con `*` (el activo) y con driver `docker-container`. Si tu builder por defecto aparece como `docker`/`default`, el multi-arch fallará.

### Paso 4 — Cambiar tu comando

| Antes (solo amd64) | Ahora (amd64 + arm64) |
|---|---|
| `docker build -t usuario/mi-app:latest .` | `docker buildx build --platform linux/amd64,linux/arm64 -t usuario/mi-app:latest --push .` |

**Ojo:** con `buildx` multi-platform **no puedes** usar `-o` local ni cargar la imagen al daemon local con `--load` (solo una plataforma a la vez permite `--load`). Para publicar multi-arch **tienes que hacer `--push`** directo al registro.

## Setup mínimo verificado

```bash
# === Una sola vez ===
docker run --privileged --rm tonistiigi/binfmt --install all
docker buildx create --use --name multibuilder --driver docker-container
docker buildx inspect --bootstrap

# === Tu nuevo comando de build ===
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t usuario/mi-app:latest \
  --push .
```

## Comprobaciones rápidas

```bash
# Builder activo correcto
docker buildx ls

# Manifiesto publicado tiene ambos archs
docker buildx imagetools inspect usuario/mi-app:latest
# Busca "manifests" con platform: linux/amd64 y linux/arm64
```

## Si quieres probar ARM localmente (sin push)

Para **testear** la imagen ARM localmente sin subirla, usa `--load` pero **una sola plataforma**:

```bash
docker buildx build --platform linux/arm64 -t usuario/mi-app:arm-test --load .
docker run --rm usuario/mi-app:arm-test   # corre vía QEMU
```

No puedes combinar `--load` + 2 plataformas — es una limitación de buildx, no tuya.

## Resumen

| Qué | Estado |
|---|---|
| QEMU/ARM emulation | Paso 1 — una vez |
| Builder `docker-container` | Paso 2 — una vez |
| Cambio de `docker build` a `docker buildx build` | Paso 4 — cada build |
| `--push` obligatorio para multi-arch | Sí, no hay `--load` multi |

Con esos 2 setups (QEMU + builder) ya puedes compilar y publicar para ARM64. ¿Quieres que te ayude a configurar cache de build (`--cache-from/--cache-to`) para acelerar los builds que ahora serán lentos por la emulación?

---

