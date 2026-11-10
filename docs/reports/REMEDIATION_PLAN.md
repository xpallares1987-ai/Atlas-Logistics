# REMEDIATION ACTION PLAN - Atlas Logistics

**Priority Level:** CRITICAL + HIGH (Must Complete in 2 Weeks)

---

## WEEK 1: CRITICAL SECURITY FIXES

### Task 1.1: Implement Bcrypt Password Hashing [4 hours]

**File:** `src/routes/auth.routes.ts`

```bash
npm install bcrypt
npm install --save-dev @types/bcrypt
```

**Changes:**
```typescript
import bcrypt from "bcrypt";

// During user creation/password reset:
const hashedPassword = await bcrypt.hash(password, 12);
await db.insert(users).values({
  id: generateId(),
  email,
  hashedPassword, // Store hash, never plain text
  role: "USER",
});

// During login:
const isValid = await bcrypt.compare(password, user.hashedPassword);
if (!isValid) {
  return reply.code(401).send({ error: "Invalid credentials" });
}

// Remove hardcoded password checks:
// DELETE: if (password !== "password123" && password !== "admin")
```

**Testing:**
```typescript
// test/auth.integration.test.ts
import { describe, it, expect } from "vitest";

describe("POST /api/auth/login", () => {
  it("should hash passwords and validate correctly", async () => {
    const password = "MySecurePassword123!";
    const hashed = await bcrypt.hash(password, 12);
    
    const isValid = await bcrypt.compare(password, hashed);
    expect(isValid).toBe(true);
  });

  it("should reject invalid passwords", async () => {
    const hashed = await bcrypt.hash("correct", 12);
    const isValid = await bcrypt.compare("wrong", hashed);
    expect(isValid).toBe(false);
  });
});
```

**Verification:**
- [ ] Passwords never stored in plaintext
- [ ] Bcrypt cost factor ≥ 12
- [ ] Failed login attempts logged
- [ ] Rate limiting on login endpoint

---

### Task 1.2: Fix Path Traversal Vulnerability [3 hours]

**File:** `src/routes/documents.routes.ts`

**Replace lines 162-175:**
```typescript
fastify.get("/download/:filename", async (request, reply) => {
  try {
    const { filename } = request.params as { filename: string };
    
    // Use basename to strip all path components
    const safeFilename = path.basename(filename);
    
    // Reconstruct safe path
    const uploadsRoot = path.resolve(process.cwd(), "uploads");
    const filePath = path.join(uploadsRoot, safeFilename);
    
    // Verify file is within uploads directory
    if (!filePath.startsWith(uploadsRoot + path.sep)) {
      return reply.code(400).send({ 
        error: "Invalid file path" 
      });
    }

    // Use async file check
    const fileBuffer = await fs.promises.readFile(filePath);
    
    reply.header("Content-Disposition", `inline; filename="${safeFilename}"`);
    const ext = path.extname(safeFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    };
    reply.header("Content-Type", mimeTypes[ext] || "application/octet-stream");
    return reply.send(fileBuffer);
  } catch (error: any) {
    if ((error as any).code === "ENOENT") {
      return reply.code(404).send({ error: "File not found" });
    }
    logger.error({ err: error }, "File download error");
    return reply.code(500).send({ error: "Failed to download file" });
  }
});
```

**Security Tests:**
```typescript
describe("GET /api/documents/download/:filename", () => {
  it("should reject path traversal attempts", async () => {
    const payload = encodeURIComponent("../../../etc/passwd");
    const response = await fetch(`http://localhost:3001/api/documents/download/${payload}`);
    expect(response.status).toBe(400);
  });

  it("should reject encoded traversal", async () => {
    const payload = encodeURIComponent("..%2fconfig%2fapp");
    const response = await fetch(`http://localhost:3001/api/documents/download/${payload}`);
    expect(response.status).toBe(400);
  });

  it("should allow safe filenames", async () => {
    const response = await fetch(`http://localhost:3001/api/documents/download/safe-file.pdf`);
    // Should be 404 (file doesn't exist) not 400 (invalid path)
    expect(response.status).not.toBe(400);
  });
});
```

**Verification:**
- [ ] `path.basename()` used consistently
- [ ] Path verification before file access
- [ ] Async file operations only
- [ ] Security tests pass

---

### Task 1.3: Secure Admin Routes [2 hours]

**File:** `src/routes/admin.routes.ts`

**Add authentication middleware:**
```typescript
export default async function adminRoutes(app: FastifyInstance) {
  // Middleware to check admin role
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      logger.warn(
        { userId: user.id, url: request.url },
        "Unauthorized admin access attempt"
      );
      return reply.code(403).send({ error: "Forbidden: Admin access required" });
    }
  };

  // Register middleware before Bull Board
  app.addHook("onRequest", async (request, reply) => {
    if (request.url.startsWith("/admin/queues")) {
      await requireAdmin(request, reply);
    }
  });

  // ... rest of route setup
}
```

**Verification:**
- [ ] All admin routes behind authentication
- [ ] Admin access logged with user ID
- [ ] Role-based access enforced
- [ ] Non-admin users receive 403

---

### Task 1.4: Remove JWT_SECRET Hardcoded Default [1 hour]

**File:** `src/routes/auth.routes.ts` (line 9)

**Before:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";
```

**After:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is required. " +
    "Set it to a 64+ character random string (use: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
  );
}
```

**Verification:**
- [ ] No fallback to hardcoded secret
- [ ] Application fails fast if JWT_SECRET missing
- [ ] Error message helpful

---

### Task 1.5: Add HTTPS Enforcement & Security Headers [3 hours]

**File:** `src/app.ts`

**Add before registering routes:**
```typescript
import { createSecureServer } from "http2";

// 1. HTTP to HTTPS redirect (production only)
if (isProduction) {
  app.addHook("onRequest", async (request, reply) => {
    if (request.protocol !== "https" && process.env.ENFORCE_HTTPS !== "false") {
      const url = `https://${request.hostname}${request.url}`;
      return reply.redirect(301, url);
    }
  });
}

// 2. Enhance Helmet configuration
app.register(fastifyHelmet, {
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'nonce-%{nonce}'"],
          styleSrc: ["'self'", "'nonce-%{nonce}'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'none'"],
          childSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      }
    : {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
  hsts: {
    maxAge: 31536000,
    includeSubdomains: true,
    preload: true,
  },
  xContentTypeOptions: "nosniff",
  xFrameOptions: "DENY",
  xPoweredBy: false,
  referrerPolicy: { policy: "strict-no-referrer" },
});

// 3. Enforce secure cookies
app.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET!,
  parseOptions: {
    sameSite: isProduction ? "strict" : "lax",
    secure: isProduction,
    httpOnly: true,
    path: "/",
  },
});
```

**Environment Variables:**
```bash
# .env.production
ENFORCE_HTTPS=true
```

**Verification:**
- [ ] HTTP requests redirect to HTTPS in production
- [ ] HSTS header present (31536000 seconds)
- [ ] CSP header enforced
- [ ] Security headers validated

---

## WEEK 2: HIGH-PRIORITY FIXES

### Task 2.1: Add Pagination to All List Endpoints [5 hours]

**Files:** All route files with `.get("/", ...)` handlers

**Template:**
```typescript
import { z } from "zod";

const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

fastify.get(
  "/",
  {
    preHandler: [validate(PaginationSchema)],
  },
  async (request, reply) => {
    const { page, limit } = request.query as z.infer<typeof PaginationSchema>;
    const offset = (page - 1) * limit;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(shipments)
        .limit(limit)
        .offset(offset)
        .orderBy(shipments.createdAt),
      db
        .select({ count: sql`count(*)` })
        .from(shipments),
    ]);

    const total = countResult[0]?.count || 0;

    return reply.send({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  }
);
```

**List of endpoints to update:**
- [ ] GET /api/shipments
- [ ] GET /api/documents
- [ ] GET /api/bookings
- [ ] GET /api/quotes
- [ ] GET /api/addresses
- [ ] GET /api/operations/*

---

### Task 2.2: Add Database Indexes [4 hours]

**File:** `src/db/schema/core.ts`

**Add indexes to high-frequency queries:**
```typescript
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").references(() => companies.id),
    email: text("email").notNull().unique(),
    hashedPassword: text("hashed_password"),
    role: text("role").notNull(),
    ...commonAuditFields,
  },
  (t) => ({
    emailIdx: index("idx_users_email").on(t.email),
    companyIdIdx: index("idx_users_company_id").on(t.companyId),
    roleIdx: index("idx_users_role").on(t.role),
  })
);

export const shipments = sqliteTable(
  "shipments",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").references(() => companies.id),
    trackingNumber: text("tracking_number").unique(),
    status: text("status").notNull(),
    ...commonAuditFields,
  },
  (t) => ({
    companyIdIdx: index("idx_shipments_company_id").on(t.companyId),
    statusIdx: index("idx_shipments_status").on(t.status),
    trackingIdx: index("idx_shipments_tracking").on(t.trackingNumber),
  })
);

export const addresses = sqliteTable(
  "addresses",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").references(() => companies.id),
    country: text("country").notNull(),
    city: text("city").notNull(),
    // ... other fields
  },
  (t) => ({
    companyIdIdx: index("idx_addresses_company_id").on(t.companyId),
    countryIdx: index("idx_addresses_country").on(t.country),
    cityIdx: index("idx_addresses_city").on(t.city),
    geoIdx: index("idx_addresses_geo").on(t.lat, t.lon),
  })
);
```

**Generate and apply migrations:**
```bash
pnpm db:generate
pnpm db:migrate
```

**Verification:**
- [ ] `PRAGMA index_list()` shows all indexes
- [ ] Query performance improves

---

### Task 2.3: Consistent API Response Schema [4 hours]

**Create:** `src/types/api-response.ts`

```typescript
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  pagination?: PaginationMeta;
  timestamp: string;
  correlationId: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  correlationId: string;
  details?: Record<string, any>;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;
```

**Use in all handlers:**
```typescript
// Before returning
return reply.send({
  success: true,
  data: shipment,
  timestamp: new Date().toISOString(),
  correlationId: request.id,
} as ApiSuccessResponse<Shipment>);
```

---

### Task 2.4: Implement Error Handler Middleware [3 hours]

**Create:** `src/middleware/error-handler.ts`

```typescript
import { FastifyInstance, FastifyError } from "fastify";
import { logger } from "../config/logger.js";
import { ApiErrorResponse } from "../types/api-response.js";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler(async (error, request, reply) => {
    const correlationId = request.id || crypto.randomUUID();
    const statusCode = error.statusCode || 500;
    const isDev = process.env.NODE_ENV === "development";

    logger.error(
      {
        err: error,
        statusCode,
        url: request.url,
        method: request.method,
        correlationId,
      },
      "Request error"
    );

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: isDev ? error.message : "Internal Server Error",
      code: (error as FastifyError).code || "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
      correlationId,
      ...(isDev && error.cause && { details: { cause: error.cause } }),
    };

    reply.code(statusCode).send(errorResponse);
  });
}
```

**Register in app.ts:**
```typescript
import { registerErrorHandler } from "./middleware/error-handler.js";

// After app initialization
registerErrorHandler(app);
```

---

### Task 2.5: Audit Logging for Sensitive Operations [4 hours]

**Create:** `src/services/audit.service.ts`

```typescript
import { db } from "../db/index.js";
import { auditLogs } from "../db/schema/index.js";
import { logger } from "../config/logger.js";

export interface AuditEvent {
  tableName: string;
  recordId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ACCESS";
  userId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(event: AuditEvent) {
  try {
    await db.insert(auditLogs).values({
      tableName: event.tableName,
      recordId: event.recordId,
      action: event.action,
      userId: event.userId,
      oldData: event.oldData ? JSON.stringify(event.oldData) : null,
      newData: event.newData ? JSON.stringify(event.newData) : null,
      createdAt: new Date(),
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to log audit event");
  }
}

// Usage in routes:
fastify.post("/", async (request, reply) => {
  const newShipment = await db.insert(shipments).values(data).returning();
  
  await logAuditEvent({
    tableName: "shipments",
    recordId: newShipment[0].id,
    action: "CREATE",
    userId: (request as any).user?.id,
    newData: newShipment[0],
    ipAddress: request.ip,
  });
  
  return reply.send(newShipment[0]);
});
```

---

## VERIFICATION CHECKLIST

### Security Fixes
- [ ] Bcrypt implementation tested (passwords hash correctly)
- [ ] Path traversal vulnerability closed (all traversal attempts blocked)
- [ ] Admin routes require ADMIN role (tested with non-admin user)
- [ ] JWT_SECRET required (app crashes without it)
- [ ] HTTPS redirect works (HTTP → HTTPS)
- [ ] Security headers present (use https://securityheaders.com)

### Database & Performance
- [ ] Pagination working on all list endpoints
- [ ] Database indexes created (check with `.indices`)
- [ ] No N+1 queries (use query profiler)
- [ ] Response time < 500ms for typical queries

### API & Error Handling
- [ ] All endpoints return consistent response format
- [ ] Error responses include correlationId
- [ ] Errors don't leak sensitive information
- [ ] Validation errors include field names

### Logging & Audit
- [ ] Sensitive operations logged
- [ ] Failed login attempts logged
- [ ] Admin access logged
- [ ] No PII in logs (sanitize before logging)

---

## TESTING COMMANDS

```bash
# Run all tests
pnpm test

# Check security issues
pnpm audit
pnpm run audit:leaks

# Test endpoints
curl -X GET http://localhost:3001/api/health
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test123"}'

# Check headers
curl -I http://localhost:3001/

# Path traversal test
curl http://localhost:3001/api/documents/download/..%2f..%2fetc%2fpasswd
```

---

## DEPLOYMENT CHECKLIST

Before production deployment:
- [ ] All CRITICAL vulnerabilities fixed
- [ ] Security tests passing
- [ ] Load test completed (1000+ RPS)
- [ ] Database backup tested
- [ ] Rollback plan documented
- [ ] Security headers verified
- [ ] HTTPS certificate valid
- [ ] Rate limiting configured
- [ ] Monitoring/alerting enabled

---

**Target Completion:** 2 weeks from audit start  
**Review Interval:** Weekly sync to track progress
