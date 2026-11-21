/**
 * @file env.ts
 * @description Centralized, strongly-typed environment configuration contract and metadata catalog (P2.1).
 * Enforces strict separation across 3 buckets: frontend-public (VITE_*), backend-config, and backend-secret.
 * @module @atlas/api/config/env
 * @see {@link docs/adr/0013-gemini-free-tier-on-demand-gateway-and-env-unification.md}
 */

import { z } from "zod";

// ============================================================================
// 1. ENVIRONMENT VARIABLE METADATA CATALOG (P2.1)
// ============================================================================

export type EnvVarScope =
  "frontend-public" | "backend-config" | "backend-secret";

export interface EnvVarDescriptor {
  description: string;
  type: "string" | "number" | "boolean" | "url";
  scope: EnvVarScope;
  requiredInProduction: boolean;
  defaultValue?: string;
  environments: Array<"development" | "test" | "production">;
  secret: boolean;
}

export const ENV_CONTRACT_CATALOG: Record<string, EnvVarDescriptor> = {
  // --- 1. PUBLIC FRONTEND (VITE_* — Plaintext in browser, Vercel SPA) ---
  VITE_API_URL: {
    description: "Public backend API base URL consumed by the frontend SPA",
    type: "url",
    scope: "frontend-public",
    requiredInProduction: false,
    defaultValue: "http://localhost:3001",
    environments: ["development", "test", "production"],
    secret: false,
  },

  // --- 2. BACKEND CONFIGURATION (Non-Secret — .env.local / Cloud Run) ---
  NODE_ENV: {
    description: "Application runtime execution mode",
    type: "string",
    scope: "backend-config",
    requiredInProduction: true,
    defaultValue: "development",
    environments: ["development", "test", "production"],
    secret: false,
  },
  LOG_LEVEL: {
    description: "Pino structured logger verbosity level",
    type: "string",
    scope: "backend-config",
    requiredInProduction: false,
    defaultValue: "info",
    environments: ["development", "test", "production"],
    secret: false,
  },
  DATABASE_URL: {
    description:
      "SQLite WAL file URI (file:...) or libSQL connection URI (libsql://...)",
    type: "string",
    scope: "backend-config",
    requiredInProduction: true,
    defaultValue: "file:./data/dev.db",
    environments: ["development", "test", "production"],
    secret: false,
  },
  BACKEND_PORT: {
    description: "Fastify HTTP server listening port",
    type: "number",
    scope: "backend-config",
    requiredInProduction: false,
    defaultValue: "3001",
    environments: ["development", "test", "production"],
    secret: false,
  },
  FRONTEND_PORT: {
    description: "Local Vite frontend dev server listening port (dev only)",
    type: "number",
    scope: "backend-config",
    requiredInProduction: false,
    defaultValue: "5173",
    environments: ["development"],
    secret: false,
  },
  GEMINI_MODEL: {
    description: "Default Gemini model identifier for AI workflows",
    type: "string",
    scope: "backend-config",
    requiredInProduction: false,
    defaultValue: "gemini-2.5-flash",
    environments: ["development", "test", "production"],
    secret: false,
  },

  // --- 3. BACKEND SECRETS (Sensitive — Encrypt in Secret Manager; NEVER Vercel) ---
  DATABASE_AUTH_TOKEN: {
    description:
      "Optional authentication token for remote libSQL/Turso instances",
    type: "string",
    scope: "backend-secret",
    requiredInProduction: false,
    environments: ["production"],
    secret: true,
  },
  JWT_SECRET: {
    description:
      "Cryptographic signing secret for JWT authentication tokens (minimum 32 chars)",
    type: "string",
    scope: "backend-secret",
    requiredInProduction: true,
    environments: ["development", "test", "production"],
    secret: true,
  },
  COOKIE_SECRET: {
    description:
      "Cryptographic signing secret for HTTP-only session cookies (minimum 32 chars)",
    type: "string",
    scope: "backend-secret",
    requiredInProduction: false,
    environments: ["development", "test", "production"],
    secret: true,
  },
  GEMINI_API_KEY: {
    description: "Google AI Studio API key for on-demand Gemini inference",
    type: "string",
    scope: "backend-secret",
    requiredInProduction: false,
    environments: ["development", "production"],
    secret: true,
  },
  REDIS_URL: {
    description:
      "Optional Redis connection URI for BullMQ queues and distributed cache",
    type: "string",
    scope: "backend-secret",
    requiredInProduction: false,
    environments: ["development", "production"],
    secret: true,
  },
  TEAMS_WEBHOOK_ALLOWLIST: {
    description:
      "Comma-separated list of pre-registered Microsoft Teams / Logic Apps HTTPS webhook URLs permitted for outbound anomaly dispatch (SSRF guard)",
    type: "string",
    scope: "backend-secret",
    requiredInProduction: false,
    environments: ["development", "production"],
    secret: true,
  },
};

// ============================================================================
// 2. ZOD RUNTIME SCHEMA & VALIDATOR
// ============================================================================

const INSECURE_PLACEHOLDERS = new Set([
  "your-jwt-secret-minimum-32-characters-change-me",
  "dev-secret-change-in-production",
  "changeme",
  "secret",
]);

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal"])
      .default("info"),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL cannot be empty")
      .default("file:./data/dev.db")
      .refine(
        (val) =>
          val.startsWith("file:") ||
          val.startsWith("libsql://") ||
          val === ":memory:",
        {
          message:
            "DATABASE_URL must use SQLite/libSQL protocol (file:, libsql://, or :memory:). PostgreSQL is prohibited.",
        },
      ),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    FRONTEND_PORT: z.coerce.number().int().min(1).max(65535).default(5173),
    VITE_API_URL: z.string().url().default("http://localhost:3001"),
    JWT_SECRET: z
      .string()
      .min(32, "JWT_SECRET must be at least 32 characters long")
      .default("dev-only-jwt-secret-fallback-minimum-32-chars"),
    COOKIE_SECRET: z
      .string()
      .min(32, "COOKIE_SECRET must be at least 32 characters long")
      .optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
    REDIS_URL: z.string().optional(),
    TEAMS_WEBHOOK_ALLOWLIST: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (
        INSECURE_PLACEHOLDERS.has(data.JWT_SECRET) ||
        data.JWT_SECRET === "dev-only-jwt-secret-fallback-minimum-32-chars"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message:
            "Production environment requires a strong, non-default JWT_SECRET (>= 32 chars).",
        });
      }
    }
  });

export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validates an environment object against the centralized Atlas Logistics contract.
 * Throws a descriptive Error if any required variable or security invariant fails.
 */
export function validateEnv(
  rawEnv: Record<string, string | undefined> = process.env,
): ValidatedEnv {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(
      `[EnvValidationError] Invalid environment configuration: ${details}`,
    );
  }
  return parsed.data;
}
