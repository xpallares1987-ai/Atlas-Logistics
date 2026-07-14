ARG NODE_VERSION=22
ARG PNPM_VERSION=11.13.0

FROM node:${NODE_VERSION}-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN apk add --no-cache git \
    && npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json tsconfig.json ./
COPY src ./src
COPY packages ./packages
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm run build

FROM nginx:alpine AS production
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
RUN printf 'server {\n\
    listen 3000;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    include /etc/nginx/mime.types;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webmanifest|wasm)$ {\n\
        try_files $uri =404;\n\
        expires 1y;\n\
        access_log off;\n\
        add_header Cache-Control "public";\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]