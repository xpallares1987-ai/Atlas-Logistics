ARG NODE_VERSION=22
ARG PNPM_VERSION=10.0.0

# 1. Builder Stage
FROM node:${NODE_VERSION}-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN apk add --no-cache git && corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# Copy dependency manifests first (layer caches dependencies independently)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages

# Install dependencies with build cache mount
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install

# Copy remaining source code
COPY src ./src

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm run build

# Clean up turbo cache to reduce final layer
RUN rm -rf .turbo

# 2. Production Stage (Chainguard Hardened with healthcheck utilities)
FROM cgr.dev/chainguard/nginx:latest-dev AS production
COPY --from=builder --chown=root:root /app/packages/frontend/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s CMD ["/usr/bin/wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/healthz"]
