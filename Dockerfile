FROM node:20-alpine AS dev
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY BPMN-Modeler ./BPMN-Modeler
COPY Freight-Comparer ./Freight-Comparer
COPY Shipment-Dashboard ./Shipment-Dashboard
COPY Atlas-Logistics ./Atlas-Logistics
COPY packages ./packages
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
EXPOSE 3000
CMD ["pnpm", "--filter", "atlas-logistics", "dev"]

FROM dev AS builder
RUN pnpm --filter atlas-logistics build

FROM node:20-alpine
RUN corepack enable
WORKDIR /app
# Use builder's workspace with dependencies to run the node server
COPY --from=builder /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "atlas-logistics", "start"]
