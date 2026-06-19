# Dev image: Node toolchain only. Source and node_modules come from compose volumes.
FROM node:22-bookworm-slim AS dev

WORKDIR /app

ENV NODE_ENV=development \
    npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false

# Cached layer when lockfile changes; runtime install uses the node_modules volume.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "run", "dev"]
