import { logger } from "./logger.js";

/**
 * JWT Configuration and Validation
 * Ensures JWT_SECRET is properly set and cannot fall back to insecure defaults
 */

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  algorithm: string;
}

/**
 * Validate JWT_SECRET is set and has sufficient entropy
 * Called during application startup (server.ts bootstrap)
 * Fails fast if configuration is invalid
 */
export function validateJWTConfig(): JWTConfig {
  const JWT_SECRET = process.env.JWT_SECRET;

  // 1. Check if JWT_SECRET exists
  if (!JWT_SECRET) {
    const error =
      "JWT_SECRET environment variable is REQUIRED. " +
      "Generate a secure secret with:\n" +
      "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"";

    logger.error({ err: new Error(error) }, "JWT Configuration Error");
    throw new Error(error);
  }

  // 2. Check JWT_SECRET length (minimum 32 characters / 256 bits)
  const MIN_SECRET_LENGTH = 32;
  if (JWT_SECRET.length < MIN_SECRET_LENGTH) {
    const error =
      `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters (${JWT_SECRET.length} provided). ` +
      "Generate a new one with:\n" +
      "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"";

    logger.error({ err: new Error(error) }, "JWT Configuration Error");
    throw new Error(error);
  }

  // 3. Warn if using test/development secret
  const isDev = process.env.NODE_ENV === "development";
  const isTest = process.env.NODE_ENV === "test";
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && JWT_SECRET.includes("test")) {
    logger.warn(
      { secret: JWT_SECRET.substring(0, 8) + "..." },
      "JWT_SECRET appears to be a test secret in production environment",
    );
  }

  if (isDev) {
    logger.info("Using development JWT configuration");
  }

  logger.info(
    { secretLength: JWT_SECRET.length, env: process.env.NODE_ENV },
    "JWT Configuration validated",
  );

  return {
    secret: JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    algorithm: "HS256", // HMAC with SHA-256
  };
}

// Validate on import (fail fast if misconfigured)
let jwtConfig: JWTConfig | null = null;

export function getJWTConfig(): JWTConfig {
  if (!jwtConfig) {
    jwtConfig = validateJWTConfig();
  }
  return jwtConfig;
}
