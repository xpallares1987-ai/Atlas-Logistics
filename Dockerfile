# ============================================================================
# ATLAS LOGISTICS — FRONTEND DOCKERFILE
# Multi-stage: Build (Node) → Production (Nginx Alpine)
# Optimized for: CI/CD, container registries, production deployments
# ============================================================================
ARG NODE_VERSION=22
ARG PNPM_VERSION=11.5.1
ARG NGINX_IMAGE=nginx:alpine

# ============================================================================
# STAGE 1: BUILDER — Monorepo build with Turbo caching
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV HUSKY=0
ENV CI=true

RUN apk add --no-cache git python3 make g++ && \
    corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Copy monorepo config + dependencies lock
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY tsconfig*.json ./

# Install dependencies with cache mounts (BuildKit optimization)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy shared packages for build context
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY packages/frontend ./packages/frontend

# Build frontend assets with Turbo caching
RUN pnpm run build --filter @atlas/frontend

# ============================================================================
# STAGE 2: PRODUCTION — Nginx reverse proxy for SPA + API gateway
# ============================================================================
FROM ${NGINX_IMAGE} AS production

# Non-root user already exists in nginx:alpine (uid 101)
RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates

# Nginx configuration (API reverse proxy, SPA routing, security headers)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend SPA from builder
COPY --from=builder --chown=nginx:nginx /app/packages/frontend/dist /usr/share/nginx/html

# Create required nginx directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/run && \
    chown -R nginx:nginx /var/cache/nginx /var/run /etc/nginx/conf.d

USER nginx

EXPOSE 8080

# Healthcheck: Validate Nginx is responsive
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
    CMD ["wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/healthz"]

CMD ["nginx", "-g", "daemon off;"]
