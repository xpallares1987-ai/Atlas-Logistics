import { SharedDatabase } from "./db.js";
import { SyncManager } from "./syncManager.js";

// Global instances for Frontend usage
export const db = new SharedDatabase();

// Determine API URL for SyncManager
const apiUrl =
  typeof process !== "undefined" && process.env.VITE_API_URL
    ? process.env.VITE_API_URL
    : typeof import.meta !== "undefined" &&
        (import.meta as any).env?.VITE_API_URL
      ? (import.meta as any).env.VITE_API_URL
      : "http://localhost:3001/api";

export const syncManager = new SyncManager(db, apiUrl);
