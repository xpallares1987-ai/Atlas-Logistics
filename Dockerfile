# ============================================================================
# ATLAS LOGISTICS — FRONTEND DOCKERFILE (Optimized for CI/CD)
# Multi-stage: Build (Node) → Production (Nginx Alpine)
# Optimized for: CI/CD, container registries, production deployments
# ============================================================================

ARG NODE_VERSION=22
ARG PNPM_VERSION=11.5.1
ARG NGINX_IMAGE=nginx:alpine
ARG BUILDKIT_INLINE_CACHE=1

# ============================================================================
# STAGE 1: DEPENDENCIES — Install and cache pnpm dependencies
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS dependencies

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV HUSKY=0
ENV CI=true
# Network timeouts for large monorepo
ENV npm_config_fetch_timeout=120000
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=120000
ENV npm_config_network_timeout=120000

RUN apk add --no-cache git python3 make g++ && \
    corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Copy only dependency files (lockfile + package.json)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY tsconfig*.json ./

# Install dependencies with extended timeouts and retries
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts || \
    pnpm install --frozen-lockfile --ignore-scripts || \
    pnpm install --frozen-lockfile --ignore-scripts

# ============================================================================
# STAGE 2: BUILDER — Monorepo build with Turbo caching
# ============================================================================
FROM dependencies AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV HUSKY=0
ENV CI=true

WORKDIR /app

# All dependencies are already installed
# Copy source code and frontend packages
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY packages/frontend ./packages/frontend

# Build frontend assets with Turbo caching
RUN --mount=type=cache,id=turbo-cache,target=/app/.turbo \
    pnpm run build --filter @atlas/frontend

# ============================================================================
# STAGE 3: PRODUCTION — Nginx reverse proxy for SPA + API gateway
# ============================================================================
FROM ${NGINX_IMAGE} AS production

LABEL maintainer="xpallares1987-ai"
LABEL version="1.0.0"
LABEL description="Atlas Logistics Frontend - Production Nginx SPA"

# Non-root user already exists in nginx:alpine (uid 101)
RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates curl && \
    rm -rf /var/cache/apk/*

# Copy Nginx configuration (API reverse proxy, SPA routing, security headers)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend SPA from builder
COPY --from=builder --chown=nginx:nginx /app/packages/frontend/dist /usr/share/nginx/html

# Create required nginx directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/run && \
    chown -R nginx:nginx /var/cache/nginx /var/run /etc/nginx/conf.d /usr/share/nginx/html

# Security context
USER nginx
WORKDIR /usr/share/nginx/html

EXPOSE 8080

# Healthcheck: Validate Nginx is responsive
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
    CMD curl -f http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
