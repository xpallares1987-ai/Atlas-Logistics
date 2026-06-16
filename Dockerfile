# Industrialization Phase 4: Multi-stage Docker Build for Atlas Logistics

# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
RUN npm install -g pnpm@10.0.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: Runtime
FROM node:20-slim
WORKDIR /app
RUN npm install -g pnpm@10.0.0
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
