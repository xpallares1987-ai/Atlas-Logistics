FROM node:22-alpine AS dev
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache git \
    && npm install -g pnpm@10.0.0 \
    && pnpm --version
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY src ./src
COPY packages ./packages

RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=true pnpm install --no-frozen-lockfile

FROM dev AS builder
RUN pnpm run build

# --- Servidor Nginx (Produccion Ultraligera) ---
FROM nginx:alpine

# Limpiar directorio default de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar build estatico del Frontend Súper-App
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Configurar Nginx para SPA (React Router) en el puerto 3000
RUN printf 'server {\n    listen 3000;\n    server_name localhost;\n    location / {\n        root   /usr/share/nginx/html;\n        index  index.html index.htm;\n        try_files $uri $uri/ /index.html;\n    }\n}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
