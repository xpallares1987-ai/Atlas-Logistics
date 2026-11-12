# Environment Variable Reference Guide

## Backend Server Port Configuration

The backend server listens on a port determined by the following precedence:

```
Priority: PORT > BACKEND_PORT > API_PORT > 3001 (default)
```

### Usage

**Local Development:**
```bash
BACKEND_PORT=3001 pnpm start:backend
```

**Docker Development:**
```yaml
# docker-compose.yml
backend:
  environment:
    BACKEND_PORT: 3001  # Primary variable
```

**Production:**
```bash
PORT=3000 NODE_ENV=production pnpm start:prod
```

### Environment Variables

| Variable | Default | Usage | Example |
|----------|---------|-------|---------|
| `PORT` | None | Highest priority, used when set explicitly | `PORT=8000` |
| `BACKEND_PORT` | 3001 | Recommended for Docker and compose files | `BACKEND_PORT=3001` |
| `API_PORT` | None | Legacy fallback, deprecated | `API_PORT=3001` |
| Hardcoded | 3001 | Final fallback if none above are set | Always available |

### Frontend Configuration

The frontend connects to the backend via:

```bash
VITE_API_URL=http://localhost:3001
```

This should match your backend port in development.

### Common Scenarios

**Scenario 1: Local Development**
```bash
# .env.local
BACKEND_PORT=3001
VITE_API_URL=http://localhost:3001
```

**Scenario 2: Docker Compose (Dev)**
```yaml
backend:
  environment:
    BACKEND_PORT: 3001
    
frontend:
  environment:
    VITE_API_URL: http://backend:3001
```

**Scenario 3: Production (Single Port)**
```bash
# .env.production
PORT=8080
```

**Scenario 4: Production (Custom Port)**
```bash
PORT=9000 NODE_ENV=production npm run start
```

### Notes

- In `src/server.ts`, the port resolution order is explicitly: `PORT || BACKEND_PORT || API_PORT || 3001`
- Always set `BACKEND_PORT` explicitly in docker-compose files for clarity
- The hardcoded default `3001` ensures the server always starts even if no env vars are set
- CI/CD systems should always set `PORT` or `BACKEND_PORT` to avoid surprises

