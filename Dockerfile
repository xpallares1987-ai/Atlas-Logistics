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

# Generate Nginx config in builder (Chainguard has no shell)
RUN printf 'server {\n    listen 8080;\n    server_name localhost;\n    root /usr/share/nginx/html;\n    index index.html;\n    include /etc/nginx/mime.types;\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webmanifest|wasm)$ {\n        try_files $uri =404;\n        expires 1y;\n        access_log off;\n        add_header Cache-Control "public";\n    }\n}\n' > /app/default.conf

# 2. Production Stage (Chainguard Hardened)
FROM cgr.dev/chainguard/nginx:latest AS production
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
COPY --from=builder /app/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
