ARG NODE_VERSION=22.14
FROM node:${NODE_VERSION}-bookworm-slim AS base

# ==============================================================================
# ETAPA DEPS: Instala dependencias (incluyendo nativas)
# ==============================================================================
FROM base AS deps
WORKDIR /opt/medusa/deps
ARG NODE_ENV=development
ENV NODE_ENV=$NODE_ENV

# FIX 1: Instalamos herramientas de compilación para Sharp/Python
# Medusa lo necesita casi obligatoriamente para instalarse bien.
RUN apt-get update && apt-get install -y \
  python3 \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json yarn.lock* pnpm-lock.yaml* .yarn* ./
RUN \
  if [ -f yarn.lock ]; then corepack enable yarn && yarn install --immutable; \
  elif [ -f package-lock.json ]; then npm ci --legacy-peer-deps; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install ; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ==============================================================================
# ETAPA BUILDER: Compila el código (Con el truco IS_BUILD)
# ==============================================================================
FROM base AS builder
WORKDIR /opt/medusa/build
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Build the application
COPY --from=deps /opt/medusa/deps .
COPY . .

# FIX 2: EL ENGAÑO (MOCKING)
# Definimos las variables para que medusa-config.ts use "in-memory"
# y no intente conectarse a Redis/DB reales durante el build.
ENV IS_BUILD=true
ENV DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy
ENV REDIS_URL=redis://localhost:6379
ENV CACHE_REDIS_URL=redis://localhost:6379
ENV EVENTS_REDIS_URL=redis://localhost:6379
ENV WE_REDIS_URL=redis://localhost:6379
ENV LOCKING_REDIS_URL=redis://localhost:6379
ENV JWT_SECRET=dummy
ENV COOKIE_SECRET=dummy
ENV SESSION_SECRET=dummy

# Ahora el build correrá sin errores de conexión
RUN \
  if [ -f yarn.lock ]; then corepack enable yarn && yarn run build; \
  elif [ -f package-lock.json ]; then npm run build --legacy-peer-deps; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  fi

# ==============================================================================
# ETAPA RUNNER: Imagen final limpia
# ==============================================================================
FROM base AS runner
RUN apt-get update \
  && apt-get install --no-install-recommends -y tini=0.19.0-1+b3 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

USER node
WORKDIR /opt/medusa

# Copiamos todo el directorio compilado (incluye node_modules, .medusa, y config)
COPY --from=builder --chown=node:node /opt/medusa/build .

ARG PORT=9000
ARG NODE_ENV=production
ENV PORT=$PORT
ENV NODE_ENV=$NODE_ENV

EXPOSE $PORT

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./start.sh"]
