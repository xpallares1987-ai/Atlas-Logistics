/**
 * @file logger.ts
 * @description Centralized Pino logger configured for Google Cloud Structured Logging, explicit secret redaction, and local development.
 * @module @atlas/api/config/logger
 * @see {@link docs/adr/0019-centralized-correlation-and-distributed-tracing.md}
 */

import pino from "pino";

// In production (Cloud Run / Container), stdout is captured and
// automatically parsed as Structured JSON logs by Cloud Logging.
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: undefined,
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "accessToken",
      "refreshToken",
      "apiKey",
      "*.apiKey",
      "secret",
      "*.secret",
      "authorization",
      "req.headers.authorization",
      "req.headers.cookie",
      "headers.authorization",
      "headers.cookie",
      "connectionString",
      "DATABASE_AUTH_TOKEN",
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    level(label, _number) {
      // Map Pino log levels to Google Cloud Logging severity levels
      const gcpSeverity =
        label === "trace" || label === "debug"
          ? "DEBUG"
          : label === "info"
            ? "INFO"
            : label === "warn"
              ? "WARNING"
              : label === "error" || label === "fatal"
                ? "ERROR"
                : "DEFAULT";
      return { severity: gcpSeverity };
    },
  },
});
