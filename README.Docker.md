# Atlas Logistics — Docker Environment (Local & Production Deployment)

This document describes the container architecture, services, and operational steps to run the Atlas Logistics platform using Docker and Docker Compose.

---

## 🐳 Services Architecture

The local environment orchestrates the following lightweight, secure containers based on **Alpine Linux**:

- **`app` (Frontend)**: Served via **Nginx** (`nginx:alpine`). Serves the compiled Vite/React 19 Super-App with client-side routing support and proxying to the API backend. Listens on port `3000` (or `3002` in dev).
- **`api` (Backend Fastify)**: Node.js 22 (`node:22-alpine`) Fastify 5 API server. Manages JWT authentication, REST endpoints, WebSocket connections (`ws://`), PDF generation (`pdfkit`), and SQLite/libSQL database access (`atlas.db`). Listens on port `3001`.
- **`redis` (Redis Caching & Queue)**: High-performance in-memory cache and queue broker for BullMQ background jobs (`redis:7.2-alpine`).

---

## 📋 Prerequisites

1. [Docker Engine](https://docs.docker.com/get-docker/) (v24+) and [Docker Compose](https://docs.docker.com/compose/install/) (v2+).
2. A configured `.env.local` file in the project root based on `.env.example`.

---

## 🚀 Usage Instructions

### 1. Build and Start All Services
```bash
docker compose up --build -d
```
*The application will be accessible at [http://localhost:3000](http://localhost:3000) (or configured port).*

### 2. Check Service Logs and Status
```bash
# Check running containers
docker compose ps

# View live logs
docker compose logs -f api
```

### 3. Database Initialization & Seeding Inside Containers
When initializing a fresh Docker volume, run Drizzle migrations and populate seed data:
```bash
# Execute migration inside backend container
docker compose exec api pnpm run db:migrate

# Populate realistic seed data (customs, air cargo, incoterms, claims, road freight)
docker compose exec api pnpm run db:seed
```

### 4. Stop Services
```bash
# Gracefully stop containers without data loss
docker compose stop

# Tear down containers and networks (data volumes persist)
docker compose down

# Complete teardown including physical volumes
docker compose down -v
```
