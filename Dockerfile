# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

# ==============================================================================
# ETAPA DEPS: Instala dependencias con cache persistente del store
# ==============================================================================
FROM base AS deps
WORKDIR /opt/medusa

RUN rm -f /etc/apt/apt.conf.d/docker-clean \
    && echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY patches/ ./patches/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ==============================================================================
# ETAPA BUILDER: Hereda deps (sin COPY de 722MB), compila + prune
# ==============================================================================
FROM deps AS builder

COPY . .

ARG VITE_MEDUSA_BACKEND_URL=https://commerce.patarutera.pe
ENV VITE_MEDUSA_BACKEND_URL=$VITE_MEDUSA_BACKEND_URL
ENV IS_BUILD=true
ENV CI=true
ENV NODE_ENV=production
ENV DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy
ENV REDIS_URL=redis://localhost:6379
ENV CACHE_REDIS_URL=redis://localhost:6379
ENV EVENTS_REDIS_URL=redis://localhost:6379
ENV WE_REDIS_URL=redis://localhost:6379
ENV LOCKING_REDIS_URL=redis://localhost:6379
ENV JWT_SECRET=dummy
ENV COOKIE_SECRET=dummy
ENV SESSION_SECRET=dummy
ENV MEDUSA_BACKEND_URL=https://commerce.patarutera.pe
ENV BACKEND_URL=https://commerce.patarutera.pe

RUN pnpm run build

# Prune en builder (tiene RAM), no en runner
RUN pnpm prune --prod

# ==============================================================================
# ETAPA RUNNER: Imagen final mínima — solo copia lo necesario
# ==============================================================================
FROM node:${NODE_VERSION}-bookworm-slim AS runner

RUN apt-get update \
    && apt-get install --no-install-recommends -y \
    tini \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ARG PORT=9000
ENV PORT=$PORT
ENV NODE_ENV=production

USER node
WORKDIR /opt/medusa

# Copia selectiva: node_modules ya pruned (~150MB vs 722MB),
# .medusa/server (build output), y start.sh
COPY --from=builder --chown=node:node /opt/medusa/node_modules node_modules
COPY --from=builder --chown=node:node /opt/medusa/.medusa/server .medusa/server
COPY --from=builder --chown=node:node /opt/medusa/start.sh start.sh
COPY --from=builder --chown=node:node /opt/medusa/instrumentation.ts instrumentation.ts

EXPOSE $PORT

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./start.sh"]
