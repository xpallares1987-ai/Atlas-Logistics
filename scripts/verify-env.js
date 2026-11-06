#!/usr/bin/env node
/**
 * Environment Variable Validator for Atlas Logistics
 * Usage: node scripts/verify-env.js
 *
 * Checks: Required vars, minimum lengths, format validity
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const ENV_FILE =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(color, ...args) {
  console.log(`${colors[color]}${args.join(" ")}${colors.reset}`);
}

function loadEnv(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const env = {};

    content.split("\n").forEach((line) => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;

      const [key, ...valueParts] = line.split("=");
      if (key) {
        env[key.trim()] = valueParts.join("=").trim();
      }
    });

    return env;
  } catch (error) {
    return null;
  }
}

function validateEnv() {
  const envPath = path.resolve(PROJECT_ROOT, ENV_FILE);

  log("blue", `\n📋 Environment Validation (${ENV_FILE})\n`);

  // Check if file exists
  if (!fs.existsSync(envPath)) {
    log("yellow", `⚠️  ${ENV_FILE} not found`);
    log("blue", `   Create from template: cp .env.local.example ${ENV_FILE}\n`);
    return false;
  }

  const env = loadEnv(envPath);
  if (!env) {
    log("red", `✗ Failed to parse ${ENV_FILE}\n`);
    return false;
  }

  const isDev = process.env.NODE_ENV !== "production";

  // Define validation rules
  const rules = {
    NODE_ENV: {
      required: true,
      validate: (val) => ["development", "production", "test"].includes(val),
      message: "Must be one of: development, production, test",
    },

    // Database
    DATABASE_URL: {
      required: true,
      validate: (val) => val.startsWith("file:") || val.startsWith("libsql://"),
      message: "Must start with 'file:' or 'libsql://'",
    },

    // Redis
    REDIS_URL: {
      required: !isDev, // Optional in dev (can use mock)
      validate: (val) =>
        val.startsWith("redis://") || val.startsWith("rediss://"),
      message: "Must start with 'redis://' or 'rediss://' (TLS)",
    },

    // Secrets (require minimum 32 chars)
    JWT_SECRET: {
      required: !isDev,
      validate: (val) =>
        val.length >= 32 &&
        val !== "CHANGE_ME_TO_SECURE_RANDOM_VALUE_32_CHARS_MIN",
      message: "Must be at least 32 characters (use: openssl rand -base64 32)",
    },

    COOKIE_SECRET: {
      required: !isDev,
      validate: (val) =>
        val.length >= 32 &&
        val !== "CHANGE_ME_TO_SECURE_RANDOM_VALUE_32_CHARS_MIN",
      message: "Must be at least 32 characters",
    },

    // Grafana (only if observability enabled)
    GRAFANA_ADMIN_PASSWORD: {
      required: false,
      validate: (val) => val && val.length >= 8,
      message: "Must be at least 8 characters",
    },

    // API URL
    VITE_API_URL: {
      required: false,
      validate: (val) =>
        val.startsWith("http://") || val.startsWith("https://"),
      message: "Must start with http:// or https://",
    },

    // Log level
    LOG_LEVEL: {
      required: false,
      validate: (val) =>
        ["debug", "info", "warn", "error", "fatal"].includes(val),
      message: "Must be one of: debug, info, warn, error, fatal",
    },
  };

  let passed = 0;
  let failed = 0;

  Object.entries(rules).forEach(([key, rule]) => {
    const value = env[key];

    if (!value && rule.required) {
      log("red", `✗ ${key}`);
      log("red", `  Missing required variable`);
      failed++;
      return;
    }

    if (!value && !rule.required) {
      log("yellow", `⊘ ${key}`);
      log("yellow", `  Optional (not set)`);
      return;
    }

    if (value && rule.validate && !rule.validate(value)) {
      log("red", `✗ ${key}`);
      log("red", `  ${rule.message}`);
      log("red", `  Current value: ${value.substring(0, 30)}...`);
      failed++;
      return;
    }

    log("green", `✓ ${key}`);
    passed++;
  });

  // Additional checks
  log("blue", `\nℹ️  Additional Checks:`);

  // Check if .env.production has required secrets for prod
  if (process.env.NODE_ENV === "production") {
    const secrets = ["JWT_SECRET", "COOKIE_SECRET", "GRAFANA_ADMIN_PASSWORD"];
    const hasAllSecrets = secrets.every((s) => env[s] && env[s].length >= 32);

    if (hasAllSecrets) {
      log("green", `✓ Production-grade secrets configured`);
    } else {
      log("red", `✗ Production requires strong secrets (32+ chars)`);
      failed++;
    }
  }

  // Check for common mistakes
  if (
    env.JWT_SECRET?.includes("change") ||
    env.JWT_SECRET?.includes("CHANGE")
  ) {
    log("red", `✗ JWT_SECRET appears to be placeholder, not actual secret`);
    failed++;
  }

  // Summary
  log("blue", `\n─────────────────────────────────`);
  log("green", `✓ Passed: ${passed}`);
  if (failed > 0) {
    log("red", `✗ Failed: ${failed}`);
  }

  if (failed === 0) {
    log("green", `\n✅ Environment is valid!\n`);
    return true;
  } else {
    log("red", `\n❌ Fix errors above before deploying\n`);
    return false;
  }
}

// Run validation
const isValid = validateEnv();
process.exit(isValid ? 0 : 1);
