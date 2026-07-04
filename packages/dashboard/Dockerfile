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
RUN pnpm --filter shipment-dashboard build

FROM nginx:alpine
COPY Shipment-Dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/Shipment-Dashboard/out /usr/share/nginx/html/Shipment-Dashboard
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
