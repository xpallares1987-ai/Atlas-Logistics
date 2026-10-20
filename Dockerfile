ARG NODE_VERSION=22
ARG PNPM_VERSION=10.0.0

# ============================================================================
# STAGE 1: BUILDER — Full environment with dev dependencies
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN apk add --no-cache git && \
    corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Copy manifests first for optimal layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages

# Install dependencies with cache mount to reuse pnpm store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install

# Copy remaining source and build
COPY src ./src
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm run build && rm -rf .turbo

# ============================================================================
# STAGE 2: PRODUCTION — Chainguard nginx hardened image
# ============================================================================
FROM cgr.dev/chainguard/nginx:latest-dev AS production

# Copy built frontend from builder
COPY --from=builder --chown=root:root /app/packages/frontend/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

# Healthcheck with built-in wget
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
    CMD ["/usr/bin/wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/healthz"]
