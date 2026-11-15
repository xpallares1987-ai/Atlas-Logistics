/**
 * @file env.ts
 * @description Centralized, strongly-typed environment configuration contract and metadata catalog (P2.1).
 * Validates runtime, SQLite/libSQL database, security secrets, AI gateway, and Grafana Cloud observability variables.
 * @module @atlas/api/config/env
 * @see {@link docs/adr/0013-gemini-free-tier-on-demand-gateway-and-env-unification.md}
 */

import { z } from "zod";

// ============================================================================
// 1. ENVIRONMENT VARIABLE METADATA CATALOG (P2.1)
// ============================================================================

export interface EnvVarDescriptor {
  description: string;
  type: "string" | "number" | "boolean" | "url";
  requiredInProduction: boolean;
  defaultValue?: string;
  environments: Array<"development" | "test" | "production">;
  secret: boolean;
}

export const ENV_CONTRACT_CATALOG: Record<string, EnvVarDescriptor> = {
  NODE_ENV: {
    description: "Application runtime execution mode",
    type: "string",
    requiredInProduction: true,
    defaultValue: "development",
    environments: ["development", "test", "production"],
    secret: false,
  },
  LOG_LEVEL: {
    description: "Pino structured logger verbosity level",
    type: "string",
    requiredInProduction: false,
    defaultValue: "info",
    environments: ["development", "test", "production"],
    secret: false,
  },
  DATABASE_URL: {
    description:
      "SQLite WAL file URI (file:...) or libSQL connection URI (libsql://...)",
    type: "string",
    requiredInProduction: true,
    defaultValue: "file:./data/dev.db",
    environments: ["development", "test", "production"],
    secret: false,
  },
  DATABASE_AUTH_TOKEN: {
    description:
      "Optional authentication token for remote libSQL/Turso instances",
    type: "string",
    requiredInProduction: false,
    environments: ["production"],
    secret: true,
  },
  BACKEND_PORT: {
    description: "Fastify HTTP server listening port",
    type: "number",
    requiredInProduction: false,
    defaultValue: "3001",
    environments: ["development", "test", "production"],
    secret: false,
  },
  VITE_PORT: {
    description: "Vite frontend dev server port",
    type: "number",
    requiredInProduction: false,
    defaultValue: "5173",
    environments: ["development"],
    secret: false,
  },
  VITE_API_URL: {
    description: "Public backend API base URL consumed by the frontend SPA",
    type: "url",
    requiredInProduction: false,
    defaultValue: "http://localhost:3001",
    environments: ["development", "test", "production"],
    secret: false,
  },
  JWT_SECRET: {
    description:
      "Cryptographic signing secret for JWT authentication tokens (minimum 32 chars)",
    type: "string",
    requiredInProduction: true,
    environments: ["development", "test", "production"],
    secret: true,
  },
  COOKIE_SECRET: {
    description:
      "Cryptographic signing secret for HTTP-only session cookies (minimum 32 chars)",
    type: "string",
    requiredInProduction: false,
    environments: ["development", "test", "production"],
    secret: true,
  },
  GEMINI_API_KEY: {
    description: "Google AI Studio API key for on-demand Gemini inference",
    type: "string",
    requiredInProduction: false,
    environments: ["development", "production"],
    secret: true,
  },
  GEMINI_MODEL: {
    description: "Default Gemini model identifier for AI workflows",
    type: "string",
    requiredInProduction: false,
    defaultValue: "gemini-2.5-flash",
    environments: ["development", "test", "production"],
    secret: false,
  },
  REDIS_URL: {
    description:
      "Optional Redis connection URI for BullMQ queues and distributed cache",
    type: "string",
    requiredInProduction: false,
    environments: ["development", "production"],
    secret: true,
  },
  GRAFANA_CLOUD_PROM_INSTANCE: {
    description: "Grafana Cloud hosted Prometheus instance name",
    type: "string",
    requiredInProduction: false,
    defaultValue: "cheerfulmole1135-prom",
    environments: ["development", "production"],
    secret: false,
  },
  GRAFANA_CLOUD_PROM_QUERY_URL: {
    description: "Grafana Cloud Prometheus query endpoint URL",
    type: "url",
    requiredInProduction: false,
    defaultValue:
      "https://prometheus-prod-72-prod-eu-west-4.grafana.net/api/prom",
    environments: ["development", "production"],
    secret: false,
  },
  GRAFANA_CLOUD_PROM_REMOTE_WRITE_URL: {
    description: "Grafana Cloud Prometheus Remote Write push endpoint URL",
    type: "url",
    requiredInProduction: false,
    defaultValue:
      "https://prometheus-prod-72-prod-eu-west-4.grafana.net/api/prom/push",
    environments: ["development", "production"],
    secret: false,
  },
  GRAFANA_CLOUD_PROM_USER: {
    description: "Grafana Cloud Prometheus numeric instance username",
    type: "string",
    requiredInProduction: false,
    defaultValue: "3759940",
    environments: ["development", "production"],
    secret: false,
  },
  GRAFANA_CLOUD_PROM_TOKEN: {
    description: "Grafana Cloud Prometheus API write/read token (glc_...)",
    type: "string",
    requiredInProduction: false,
    environments: ["development", "production"],
    secret: true,
  },
  GRAFANA_ASSISTANT_URL: {
    description:
      "Grafana Cloud Assistant service URL for on-prem plugin bridge",
    type: "url",
    requiredInProduction: false,
    defaultValue: "https://assistant-prod-eu-west-2.grafana.net/assistant",
    environments: ["development", "production"],
    secret: false,
  },
  GRAFANA_ASSISTANT_INSTANCE_ID: {
    description: "Grafana Cloud stack instance ID for Grafana Assistant",
    type: "string",
    requiredInProduction: false,
    defaultValue: "1917865",
    environments: ["development", "production"],
    secret: false,
  },
  GRAFANA_ASSISTANT_TOKEN: {
    description:
      "Grafana Cloud API token for Grafana Assistant plugin (glc_...)",
    type: "string",
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
    VITE_PORT: z.coerce.number().int().min(1).max(65535).default(5173),
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
    GRAFANA_CLOUD_PROM_INSTANCE: z.string().default("cheerfulmole1135-prom"),
    GRAFANA_CLOUD_PROM_QUERY_URL: z
      .string()
      .url()
      .default(
        "https://prometheus-prod-72-prod-eu-west-4.grafana.net/api/prom",
      ),
    GRAFANA_CLOUD_PROM_REMOTE_WRITE_URL: z
      .string()
      .url()
      .default(
        "https://prometheus-prod-72-prod-eu-west-4.grafana.net/api/prom/push",
      ),
    GRAFANA_CLOUD_PROM_USER: z.string().default("3759940"),
    GRAFANA_CLOUD_PROM_TOKEN: z.string().optional(),
    GRAFANA_ASSISTANT_URL: z
      .string()
      .url()
      .default("https://assistant-prod-eu-west-2.grafana.net/assistant"),
    GRAFANA_ASSISTANT_INSTANCE_ID: z.string().default("1917865"),
    GRAFANA_ASSISTANT_TOKEN: z.string().optional(),
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
