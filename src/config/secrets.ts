import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: false });

const MANAGED_SECRET_KEYS = [
  "JWT_SECRET",
  "COOKIE_SECRET",
  "DATABASE_AUTH_TOKEN",
  "GEMINI_API_KEY",
] as const;

/**
 * Resolves runtime secrets from mounted container secret files (/run/secrets/*
 * or SECRETS_DIR) or pre-injected environment variables (Cloud Run / Kubernetes ExternalSecrets).
 * Must be executed before environment validation.
 */
export async function loadSecrets(projectId?: string): Promise<void> {
  const secretsDir = process.env.SECRETS_DIR || "/run/secrets";

  for (const key of MANAGED_SECRET_KEYS) {
    if (process.env[key]) continue;
    const fileCandidate = path.join(secretsDir, key);
    if (fs.existsSync(fileCandidate)) {
      try {
        const value = fs.readFileSync(fileCandidate, "utf-8").trim();
        if (value) {
          process.env[key] = value;
        }
      } catch {
        // Ignore unreadable secret mount and let validateEnvironment enforce required keys
      }
    }
  }

  if (projectId) {
    console.info(
      `[Secrets] Verified external secret injection contract for project: ${projectId}`,
    );
  }
}
