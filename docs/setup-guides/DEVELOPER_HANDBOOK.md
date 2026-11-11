# Atlas Logistics Developer Handbook

**Purpose:** Complete guide for developers working on Atlas Logistics codebase.

**Audience:** Backend engineers, full-stack developers, DevOps engineers  
**Last Updated:** 2024-01-15  
**Version:** 1.0

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Development Workflow](#development-workflow)
3. [Code Conventions](#code-conventions)
4. [Backend Development](#backend-development)
5. [Frontend Development](#frontend-development)
6. [Database Development](#database-development)
7. [Testing Strategy](#testing-strategy)
8. [Security Best Practices](#security-best-practices)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)
11. [Git Workflow](#git-workflow)
12. [Deployment Procedures](#deployment-procedures)

---

## Environment Setup

### Prerequisites

- **Node.js** >= 20.0 (tested with 22.x)
- **pnpm** >= 10.0 (faster than npm, workspace support)
- **Git** >= 2.30
- **Docker** >= 20.0 (optional, for Redis and databases)

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/xpallares1987-ai/Atlas-Logistics.git
cd Atlas-Logistics

# Install dependencies via pnpm
pnpm install

# Verify installation
pnpm --version  # Should be 10.0+
node --version  # Should be 20.0+
```

### 2. Environment Variables

```bash
# Copy template to local config (NOT committed)
cp .env.example .env.local

# Edit .env.local with your values
# Required keys:
#   - JWT_SECRET (minimum 32 characters)
#   - COOKIE_SECRET (minimum 32 characters)
#   - DATABASE_URL (default: file:./data/dev.db)
#   - REDIS_URL (optional, defaults to mock)
#   - GEMINI_API_KEY (optional, for AI features)
```

### 3. Database Setup

```bash
# Run migrations (creates tables)
pnpm db:migrate

# Seed sample data
pnpm db:seed

# Open Drizzle Studio to inspect DB
pnpm db:inspect  # Opens browser at localhost:3456
```

### 4. Start Development

```bash
# Start all services (backend + frontend + MFE)
pnpm dev

# OR minimal setup (just backend + frontend)
pnpm dev:minimal

# OR with observability (adds Prometheus/Grafana)
pnpm dev:observability

# OR start individual services
pnpm run start:backend          # Terminal 1
cd packages/frontend && pnpm dev # Terminal 2
```

**Access Points:**
- Frontend: http://localhost:5173 (Vite dev server) or http://localhost:3000
- Backend: http://localhost:3001
- Swagger API Docs: http://localhost:3001/docs
- Metrics: http://localhost:3001/metrics

---

## Development Workflow

### 1. Create Feature Branch

```bash
# Create branch from main
git checkout -b feature/ocean-booking-enhancements

# Push to origin
git push -u origin feature/ocean-booking-enhancements
```

### 2. Make Changes

```bash
# Edit files
vim src/modules/ocean-booking/services/booking.service.ts

# Run type check
pnpm type-check

# Format code
pnpm format

# Lint and fix issues
pnpm lint --fix
```

### 3. Test Your Changes

```bash
# Run specific test file
pnpm test -- src/modules/ocean-booking/__tests__/booking.service.test.ts

# Run all tests with coverage
pnpm test:coverage

# Run E2E tests
npx playwright test -- ocean-booking.spec.ts
```

### 4. Commit & Push

```bash
# Stage changes
git add .

# Commit with meaningful message (follows commitlint rules)
git commit -m "feat(ocean-booking): add booking cancellation workflow"

# Push changes
git push origin feature/ocean-booking-enhancements
```

### 5. Create Pull Request

- Push branch to GitHub
- Create PR with description of changes
- Link to issue (e.g., "Fixes #123")
- Request code review

### 6. Code Review & Merge

- Address reviewer comments
- Make corrections and push updates
- Once approved, squash and merge

---

## Code Conventions

### 1. TypeScript Style Guide

```typescript
// ✅ GOOD: Explicit types
interface ShipmentRequest {
  originPortCode: string;
  destinationPortCode: string;
  containerType: ContainerType;
  weight: number;
  incoterm: IncotermCode;
}

async function createShipment(req: ShipmentRequest): Promise<Shipment> {
  // implementation
}

// ❌ BAD: Implicit any, loose typing
async function createShipment(req: any): Promise<any> {
  // impossible to track types
}
```

### 2. File Organization

```typescript
// 1. Imports (sorted: external, internal, types)
import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "@/db/index.js";
import type { Shipment } from "@/types/index.js";

// 2. Constants
const MAX_CONTAINERS = 100;
const ALLOWED_INCOTERMS = ["FOB", "CIF", "CIP"] as const;

// 3. Types/Interfaces
interface ShipmentFilter {
  status?: ShipmentStatus;
  limit?: number;
  offset?: number;
}

// 4. Main implementation
export async function getShipments(
  filters: ShipmentFilter,
): Promise<Shipment[]> {
  // implementation
}

// 5. Helper functions
function validateIncoterm(code: string): boolean {
  return ALLOWED_INCOTERMS.includes(code as any);
}
```

### 3. Naming Conventions

```typescript
// Constants: UPPER_SNAKE_CASE
const JWT_EXPIRY_HOURS = 24;
const DEFAULT_PAGE_SIZE = 20;

// Variables & Functions: camelCase
let currentUserId = "user_123";
function calculateTariff(hsCode: string, origin: string): number {}

// Classes & Types: PascalCase
class ShipmentService {}
interface CustomsDeclaration {}
type ShipmentStatus = "PENDING" | "CONFIRMED" | "DELIVERED";

// Private properties: _underscore prefix
class Repository {
  private _connection: Connection;
}

// Booleans: is/has/can prefix
const isValidEmail = true;
const hasCustomsDeclaration = false;
const canModifyShipment = true;
```

### 4. Error Handling

```typescript
// ✅ GOOD: Specific error types
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

try {
  await validateCustomsData(data);
} catch (err) {
  if (err instanceof ValidationError) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Validation Error",
      message: err.message,
    });
  }
  throw err;
}

// ❌ BAD: Silently failing
try {
  await validateCustomsData(data);
} catch (err) {
  console.log("error"); // Don't do this
}
```

### 5. Comments & Documentation

```typescript
/**
 * Calculate tariff duties for a given HS code and origin country.
 *
 * @param hsCode - Harmonized System code (e.g., "847130")
 * @param origin - ISO 3166-1 alpha-2 country code (e.g., "CN")
 * @param quantity - Quantity in base unit
 * @returns Tariff calculation with duty, VAT, and total
 * @throws {ValidationError} If HS code or origin is invalid
 *
 * @example
 * const tariff = await calculateTariff("847130", "CN", 100);
 * console.log(tariff.totalDuty); // 1250
 */
export async function calculateTariff(
  hsCode: string,
  origin: string,
  quantity: number,
): Promise<TariffCalculation> {
  // Use comments for WHY, not WHAT
  // GOOD comment:
  // We add 10% margin to cover tariff fluctuations during transit
  const marginFactor = 1.1;

  // BAD comment:
  // Add 1.1 factor (obvious from code)
}
```

---

## Backend Development

### 1. Adding a New Route

```typescript
// src/routes/new-feature.routes.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "@/db/index.js";
import { NewFeatureService } from "@/modules/new-feature/index.js";

export async function registerNewFeatureRoutes(app: FastifyInstance) {
  const service = new NewFeatureService(db);

  // GET: List items
  app.get(
    "/api/new-feature",
    {
      preHandler: app.authenticate,
      schema: {
        description: "Get all items",
        tags: ["New Feature"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const items = await service.listItems();
      return reply.send(items);
    },
  );

  // POST: Create item
  app.post(
    "/api/new-feature",
    {
      preHandler: app.authenticate,
      schema: {
        description: "Create new item",
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const item = await service.createItem(request.body);
      return reply.status(201).send(item);
    },
  );
}

// src/routes/index.ts - Add to registration:
export async function registerAllRoutes(app: FastifyInstance) {
  await app.register(registerNewFeatureRoutes);
  // ... other routes
}
```

### 2. Creating a Service

```typescript
// src/modules/new-feature/services/item.service.ts
import { Database } from "drizzle-orm";
import { items } from "@/db/schema/index.js";

export class ItemService {
  constructor(private db: Database) {}

  async listItems(): Promise<Item[]> {
    return this.db.query.items.findMany();
  }

  async createItem(data: CreateItemInput): Promise<Item> {
    const [item] = await this.db
      .insert(items)
      .values(data)
      .returning();
    return item;
  }

  async updateItem(id: string, data: UpdateItemInput): Promise<Item> {
    const [updated] = await this.db
      .update(items)
      .set(data)
      .where(eq(items.id, id))
      .returning();
    return updated;
  }

  async deleteItem(id: string): Promise<boolean> {
    const result = await this.db
      .delete(items)
      .where(eq(items.id, id));
    return result.rowsAffected > 0;
  }
}
```

### 3. Adding Database Schema

```typescript
// src/db/schema/new-feature.schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const items = sqliteTable("items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  description: text("description"),
  amount: real("amount").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$onUpdate(() => new Date()),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

// Export type for TypeScript
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
```

Then generate migration:

```bash
pnpm db:generate
```

---

## Frontend Development

### 1. Creating a Component

```typescript
// packages/ui/src/components/ShipmentCard.tsx
import { ReactNode } from "react";

interface ShipmentCardProps {
  shipmentId: string;
  origin: string;
  destination: string;
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED";
  estimatedDelivery: Date;
  onClick?: () => void;
}

export function ShipmentCard({
  shipmentId,
  origin,
  destination,
  status,
  estimatedDelivery,
  onClick,
}: ShipmentCardProps) {
  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    IN_TRANSIT: "bg-blue-100 text-blue-800",
    DELIVERED: "bg-green-100 text-green-800",
  };

  return (
    <div
      className="rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-900">{shipmentId}</h3>
          <p className="text-sm text-gray-600">
            {origin} → {destination}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
          {status}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        ETA: {estimatedDelivery.toLocaleDateString()}
      </p>
    </div>
  );
}
```

### 2. Using API Client

```typescript
// packages/frontend/src/services/shipmentApi.ts
import axios from "axios";
import type { Shipment } from "@atlas/shared";

const api = axios.create({
  baseURL: process.env.VITE_API_URL || "http://localhost:3001",
});

export const shipmentApi = {
  async getShipments(page = 1, limit = 20) {
    const { data } = await api.get("/api/shipments", {
      params: { page, limit },
    });
    return data;
  },

  async getShipment(id: string) {
    const { data } = await api.get(`/api/shipments/${id}`);
    return data;
  },

  async createShipment(shipment: Omit<Shipment, "id" | "createdAt">) {
    const { data } = await api.post("/api/shipments", shipment);
    return data;
  },
};
```

### 3. Using Hooks

```typescript
// packages/frontend/src/hooks/useShipments.ts
import { useState, useEffect } from "react";
import { shipmentApi } from "@/services/shipmentApi";
import type { Shipment } from "@atlas/shared";

export function useShipments(page = 1) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const result = await shipmentApi.getShipments(page);
        setShipments(result.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  return { shipments, loading, error };
}
```

---

## Database Development

### 1. Creating a Migration

```typescript
// Step 1: Modify schema in src/db/schema/
// (See Backend Development section)

// Step 2: Generate migration
pnpm db:generate

// Step 3: Review generated SQL in drizzle/
cat drizzle/0001_new_migration.sql

// Step 4: Run migration
pnpm db:migrate

// Step 5: Test in Drizzle Studio
pnpm db:inspect
```

### 2. Querying Data

```typescript
// Use Drizzle ORM for type-safe queries
import { eq, and, gt, desc } from "drizzle-orm";
import { shipments } from "@/db/schema/index.js";

// SELECT
const allShipments = await db.query.shipments.findMany();

const specificShipment = await db.query.shipments.findFirst({
  where: eq(shipments.id, "shipment_123"),
});

// WHERE clause
const pendingShipments = await db.query.shipments.findMany({
  where: eq(shipments.status, "PENDING"),
});

// Complex queries
const recentPending = await db
  .select()
  .from(shipments)
  .where(
    and(
      eq(shipments.status, "PENDING"),
      gt(shipments.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    ),
  )
  .orderBy(desc(shipments.createdAt))
  .limit(10);
```

### 3. Seeding Data

```typescript
// src/db/seeds/shipments.seed.ts
import { faker } from "@faker-js/faker";
import { shipments } from "@/db/schema/index.js";

export async function seedShipments(db: Database, count = 100) {
  const shipmentData = Array.from({ length: count }, () => ({
    id: `shipment_${faker.string.alphanumeric(10)}`,
    origin: faker.location.city(),
    destination: faker.location.city(),
    status: faker.helpers.arrayElement(["PENDING", "IN_TRANSIT", "DELIVERED"]),
    createdAt: faker.date.past(),
  }));

  await db.insert(shipments).values(shipmentData);
}

// src/db/seed.ts - Add:
import { seedShipments } from "./seeds/shipments.seed.js";

export async function runSeeds(db: Database) {
  await seedShipments(db, 100);
  // ... other seeds
}
```

---

## Testing Strategy

### 1. Unit Tests

```typescript
// src/modules/air-cargo/services/__tests__/tariff.service.test.ts
import { describe, it, expect } from "vitest";
import { TariffService } from "../tariff.service";

describe("TariffService", () => {
  const service = new TariffService();

  it("should calculate tariff correctly for valid HS code", async () => {
    const result = await service.calculateTariff("847130", "CN", 100);

    expect(result).toHaveProperty("duty");
    expect(result).toHaveProperty("vat");
    expect(result).toHaveProperty("total");
    expect(result.total).toBeGreaterThan(0);
  });

  it("should throw error for invalid HS code", async () => {
    await expect(service.calculateTariff("INVALID", "CN", 100)).rejects.toThrow(
      "Invalid HS code",
    );
  });
});
```

### 2. Integration Tests

```typescript
// tests/e2e/ocean-booking.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Ocean Booking Flow", () => {
  test("should create booking and generate B/L", async ({ page }) => {
    // Navigate to booking page
    await page.goto("http://localhost:3000/bookings");

    // Fill form
    await page.fill('input[name="origin"]', "DEHAM");
    await page.fill('input[name="destination"]', "USLA");
    await page.fill('input[name="weight"]', "28000");

    // Submit
    await page.click('button[type="submit"]');

    // Verify booking created
    await expect(page).toHaveURL(/\/bookings\/\w+/);
    await expect(page.locator("text=CONFIRMED")).toBeVisible();
  });
});
```

### 3. Running Tests

```bash
# Run all unit tests
pnpm test

# Run specific file
pnpm test -- src/modules/customs/__tests__/dua.service.test.ts

# Run with coverage
pnpm test:coverage

# Run E2E tests
npx playwright test

# Run E2E with UI
npx playwright test --ui

# Debug E2E test
npx playwright test --debug
```

---

## Security Best Practices

### 1. Input Validation

```typescript
// ✅ GOOD: Always validate user input
import { z } from "zod";

const shipmentSchema = z.object({
  origin: z.string().min(3).max(20),
  destination: z.string().min(3).max(20),
  weight: z.number().positive(),
  incoterm: z.enum(["FOB", "CIF", "CIP"]),
});

app.post("/api/shipments", async (request, reply) => {
  const validated = shipmentSchema.parse(request.body);
  // safe to use validated
});
```

### 2. SQL Injection Prevention

```typescript
// ✅ GOOD: Use parameterized queries (Drizzle handles this)
const shipment = await db.query.shipments.findFirst({
  where: eq(shipments.id, userId), // userId is safely bound
});

// ❌ BAD: String concatenation (NEVER do this)
// const result = await db.raw(`SELECT * FROM shipments WHERE id = '${userId}'`);
```

### 3. Authentication & Authorization

```typescript
// Middleware ensures JWT is validated
app.addHook("onRequest", async (request, reply) => {
  if (!request.url.startsWith("/api/")) return;

  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized" });
  }
});

// Role-based access control
async function requireAdmin(request: FastifyRequest) {
  if (request.user.role !== "ADMIN") {
    throw new Error("Admin access required");
  }
}
```

### 4. Secrets Management

```bash
# ✅ GOOD: Load from environment
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

# ❌ BAD: Hardcoded secrets (NEVER)
# const jwtSecret = "my-secret-key"; // EXPOSED!
```

### 5. Sensitive Data Logging

```typescript
// ✅ GOOD: Mask sensitive fields
function sanitizeUser(user: User) {
  return {
    ...user,
    password: "***",
    apiKey: user.apiKey.slice(-4).padStart(user.apiKey.length, "*"),
  };
}

logger.info({ user: sanitizeUser(userData) });
```

---

## Performance Optimization

### 1. Database Indexing

```typescript
// Indexes are pre-created in schema
// Key indexes for common queries:
// - users(email) - for login
// - shipments(status, createdAt) - for filtering
// - customs(hsCode) - for tariff lookup

// Check index usage in Drizzle Studio or SQLite:
// EXPLAIN QUERY PLAN SELECT * FROM shipments WHERE status = 'PENDING';
```

### 2. Pagination

```typescript
// Always paginate large result sets
export async function getShipments(
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResult<Shipment>> {
  const offset = (page - 1) * limit;
  const total = await db.query.shipments.count();
  const data = await db.query.shipments
    .findMany({
      limit,
      offset,
      orderBy: (shipments, { desc }) => [desc(shipments.createdAt)],
    });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### 3. Caching

```typescript
// Cache expensive operations
const cache = new Map<string, CachedResult>();

async function getCachedTariff(hsCode: string) {
  const cacheKey = `tariff:${hsCode}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 3600000) {
    return cached.data;
  }

  const data = await calculateTariff(hsCode);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

### 4. Connection Pooling

```typescript
// Configured automatically in Fastify + Drizzle
// Pool size optimized for concurrent requests
// No manual configuration needed in most cases
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# OR use different port
PORT=3002 pnpm dev
```

#### Database Lock (SQLite)

```bash
# SQLite uses WAL mode - safe for concurrent access
# If you get "database is locked":
pnpm db:reset  # Recreates database

# Check WAL files
ls -la data/*.db*
```

#### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules .turbo
pnpm install
pnpm db:migrate
```

#### Redis Connection Errors

```bash
# If Redis not available, in-memory mock is used
# To disable mock and require real Redis:
USE_MOCK=false pnpm dev

# Start Docker Redis:
docker compose up redis
```

---

## Git Workflow

### 1. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

body (optional)

footer (optional)
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `test` - Tests
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `style` - Code style (formatting)
- `chore` - Build, dependencies

**Examples:**
```bash
git commit -m "feat(ocean-booking): add booking cancellation"
git commit -m "fix(customs): correct TARIC calculation for EU import"
git commit -m "docs: update API reference"
git commit -m "test(warehouse): add task assignment tests"
```

### 2. Branch Naming

```
feature/description
bugfix/description
docs/description
refactor/description

# Examples
feature/ocean-booking-cancellation
bugfix/customs-tariff-calculation
docs/api-reference-updates
```

### 3. Pull Request Template

```markdown
## Description
Brief description of changes

## Related Issues
Fixes #123

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No breaking changes
```

---

## Deployment Procedures

### Development Deployment

```bash
# Build all packages
pnpm build

# Run migrations
pnpm db:migrate

# Start server
pnpm start:prod
```

### Production Deployment

```bash
# 1. Create production env file
cp .env.example .env.production
# Edit with production values

# 2. Build Docker images
docker build -t atlas-backend:latest -f Dockerfile.backend .
docker build -t atlas-frontend:latest -f Dockerfile .

# 3. Tag for registry
docker tag atlas-backend:latest registry.example.com/atlas-backend:v1.0.0
docker tag atlas-frontend:latest registry.example.com/atlas-frontend:v1.0.0

# 4. Push to registry
docker push registry.example.com/atlas-backend:v1.0.0
docker push registry.example.com/atlas-frontend:v1.0.0

# 5. Deploy (e.g., Kubernetes)
kubectl apply -f k8s/deployment.yaml

# 6. Verify
curl https://api.atlas-logistics.com/health
```

---

## Useful Resources

- [Fastify Documentation](https://www.fastify.io/)
- [Drizzle ORM Guide](https://orm.drizzle.team/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React Best Practices](https://react.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)

---

**Last Updated:** 2024-01-15  
**Maintained By:** Development Team  
**Version:** 1.0
