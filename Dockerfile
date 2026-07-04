FROM node:22-alpine AS dev
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache git \
    && npm install -g pnpm@10.0.0 \
    && pnpm --version
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY BPMN-Modeler ./BPMN-Modeler
COPY Freight-Comparer ./Freight-Comparer
COPY Shipment-Dashboard ./Shipment-Dashboard
COPY Atlas-Logistics ./Atlas-Logistics
COPY Control-Tower-UI ./Control-Tower-UI
COPY packages ./packages

RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=true pnpm install --no-frozen-lockfile

FROM dev AS builder
RUN pnpm --filter atlas-logistics build
RUN test -f dist/server.js || (echo "ERROR: dist/server.js not found — build failed" && exit 1)

FROM node:22-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.0.0
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "atlas-logistics", "start"]
