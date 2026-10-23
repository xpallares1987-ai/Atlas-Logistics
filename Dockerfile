ARG NODE_VERSION=22
ARG PNPM_VERSION=10.0.0

# ============================================================================
# STAGE 1: DEPENDENCIES — Minimal base with pnpm setup
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apk add --no-cache git python3 make g++ && \
    corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Copy manifests only for dependency installation
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages

# ============================================================================
# STAGE 2: BUILDER — Build frontend assets
# ============================================================================
FROM deps AS builder

ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install dependencies with BuildKit cache mount - run scripts for esbuild, etc.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copy remaining source files
COPY tsconfig.base.json tsconfig.json ./
COPY src ./src

# Build frontend with environment variable
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm run build && \
    rm -rf .turbo && \
    find /app/packages/frontend/dist -type f \( -name '*.map' -o -name '*.snap' \) -delete

# ============================================================================
# STAGE 3: PRODUCTION — Chainguard nginx (production-ready, no dev tools)
# ============================================================================
FROM cgr.dev/chainguard/nginx:latest AS production

# Copy nginx configuration first
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend from builder
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

EXPOSE 8080

# Healthcheck with built-in wget
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
    CMD ["/usr/bin/wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/healthz"]
