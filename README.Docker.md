# Atlas Logistics - Docker Environment (Local Development)

This document describes the architecture and steps to run the Atlas Logistics platform in a local environment using Docker Compose. The configuration is designed to provide a secure and efficient replica, utilizing **Alpine Linux** base images to minimize the attack surface.

## Services Architecture

The local environment orchestrates the following containers:
- **`app` (Frontend)**: Served via **Nginx** (image: `nginx:alpine`). The container compiles the Vite/Turborepo frontend using Node 22 (Alpine) and `pnpm v11`.
- **`api` (Backend)**: Express API backend (image: `node:22-alpine`). Built with `Dockerfile.backend`. Listens on port `3001` and connects to the Database.
- **`db` (PostgreSQL)**: Main Database Engine for the Backend/Drizzle (image: `postgres:16-alpine`).
- **`redis` (Redis)**: In-memory system for caching and queue management (image: `redis:7.2-alpine`).

## Prerequisites

1. [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/).
2. A configured `.env.local` file in the project root.
   > **⚠️ IMPORTANT!** Use the `.env.example` file as a template. NEVER expose real passwords or production API Keys (like Gemini, Firebase, or GitHub PATs) inside the repository or directly in `docker-compose.yml`.

## Usage Instructions

### 1. Start the Environment
To build and start all services in the background:
```bash
docker compose up --build -d
```
*Your application will be available at [http://localhost:3000](http://localhost:3000).*

### 2. Check Container Status
```bash
docker ps
```

### 3. Stop the Environment
To safely shut down the services without losing data:
```bash
docker compose stop
```
To destroy the containers and release the virtual network (data volumes will persist):
```bash
docker compose down
```

### 4. Clean Restart (Data Destruction)
If you need to restart the Database from scratch (delete the physical volume):
```bash
docker compose down -v
```

## Database Operations (Drizzle)
The application uses Drizzle ORM. If you start the Postgres container from scratch or update the schema (`schema.ts`), you must synchronize and populate it.
**Run these commands on your host machine** (ensuring you use the same URI configured in your `.env.local`: `postgresql://scm_user:changeme@localhost:5432/scm_db`):

1. **Push the schema (Automatic migrations):**
```bash
pnpm run db:push
```
2. **Seed with massive realistic data:**
```bash
npx tsx src/db/seed.ts
```