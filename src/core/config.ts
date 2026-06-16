import { z } from 'zod';

/**
 * Environment variable schema for Atlas Logistics.
 * Ensures all required configurations are present and valid at startup.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Database connection string
  DATABASE_URL: z.string().url().default('postgres://postgres:postgres@localhost:5432/atlas'),
  
  // Redis connection string
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  // 32-character key for AES-GCM encryption
  ENCRYPTION_KEY: z.string().length(32).default('12345678901234567890123456789012'),
  
  // Zeebe (Camunda 8) configurations (Optional, SDK handles defaults)
  ZEEBE_ADDRESS: z.string().optional(),
  ZEEBE_CLIENT_ID: z.string().optional(),
  ZEEBE_CLIENT_SECRET: z.string().optional(),
});

// Parse and export validated environment variables
export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
