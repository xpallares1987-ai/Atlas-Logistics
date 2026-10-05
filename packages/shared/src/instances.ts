import { SharedDatabase } from "./db.js";
import { SyncManager } from "./syncManager.js";

// Global instances for Frontend usage
export const db = new SharedDatabase();

// Determine API URL for SyncManager
let envApiUrl: string | undefined;
try {
  if (typeof process !== "undefined" && process?.env?.VITE_API_URL) {
    envApiUrl = process.env.VITE_API_URL;
  }
} catch {
  // ignore
}

const apiUrl =
  envApiUrl ||
  (typeof window !== "undefined"
    ? `${window.location.origin}/api`
    : "http://localhost:3001/api");

export const syncManager = new SyncManager(db, apiUrl);
