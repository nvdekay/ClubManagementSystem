# syntax=docker/dockerfile:1
# One container: the Express API also serves the built React client (CLIENT_DIST_DIR).
# Build: docker build -t ucms .   Run: see docker-compose.prod.yml and README.md (Triển khai).

ARG NODE_VERSION=22

# --- build: install every workspace dependency and build server + client -----------------------
# Debian (glibc) for the build: Vite, Tailwind and Rollup ship native binaries per platform.
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --no-audit --no-fund
COPY server server
COPY client client
RUN npm run build --workspaces

# --- deps: production dependencies of the server only (no client, no dev tooling) --------------
# `npm ci --workspace=server` still installs the client's tree (vite, rollup…), so the client is
# dropped from the workspace list instead; the lockfile still pins every server package version.
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN node -e "const fs = require('node:fs'); const p = JSON.parse(fs.readFileSync('package.json', 'utf8')); p.workspaces = ['server']; fs.writeFileSync('package.json', JSON.stringify(p, null, 2))" \
 && npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force

# --- runtime -------------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    CLIENT_DIST_DIR=/app/client/dist
WORKDIR /app
# Files stay root-owned and read-only for the app user; the server writes nothing to disk.
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/package.json ./
# Packages whose version differs from the hoisted one (zod 4) live under server/node_modules.
COPY --from=deps /app/server/node_modules server/node_modules
COPY server/package.json server/
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
# Read at runtime by infra/files/event-proposal-files.ts (default event proposal template).
COPY ["docs/template-de-an-su-kien.docx", "docs/"]
USER node
WORKDIR /app/server
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
# node directly (not npm) so SIGTERM reaches the server's graceful shutdown.
CMD ["node", "dist/main.js"]
