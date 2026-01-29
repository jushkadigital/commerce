ARG NODE_VERSION=22.14
FROM node:${NODE_VERSION}-bookworm-slim

ENV NODE_ENV=production
WORKDIR /opt/medusa

# Utilidades necesarias
RUN apt-get update \
  && apt-get install --no-install-recommends -y \
  tini \
  curl \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copiamos manifests para instalar deps
COPY package*.json yarn.lock* pnpm-lock.yaml* ./

# Instalamos SOLO dependencias de producción
RUN \
  if [ -f yarn.lock ]; then \
  corepack enable yarn && yarn install --production --frozen-lockfile || yarn install --production; \
  elif [ -f package-lock.json ]; then \
  npm ci --legacy-peer-deps; \
  elif [ -f pnpm-lock.yaml ]; then \
  corepack enable pnpm && pnpm install --prod; \
  else \
  echo "Lockfile not found." && exit 1; \
  fi

# Copiamos el build de Medusa ya generado
COPY .medusa ./.medusa

COPY . .

# Copiamos scripts/runtime
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

RUN chown -R node:node /opt/medusa
# Seguridad
USER node

ARG PORT=9000
ENV PORT=$PORT
EXPOSE $PORT

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./start.sh"]

