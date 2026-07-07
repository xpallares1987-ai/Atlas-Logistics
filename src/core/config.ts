import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgres://postgres:postgres@localhost:5432/atlas"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  ENCRYPTION_KEY: z
    .string()
    .length(32)
    .default("12345678901234567890123456789012"),
  ZEEBE_ADDRESS: z.string().optional(),
  ZEEBE_CLIENT_ID: z.string().optional(),
  ZEEBE_CLIENT_SECRET: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  PORT: z.string().default("3000"),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
