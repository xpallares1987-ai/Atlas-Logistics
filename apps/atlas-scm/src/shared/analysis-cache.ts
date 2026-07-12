import { openDB, IDBPDatabase } from "idb";
import LZString from "lz-string";
import { encryptToken, decryptToken } from "./crypto";

const DB_NAME = "ControlTowerAnalysisCache";
const STORE_NAME = "analysis_results";
const DB_VERSION = 1;
const DEFAULT_SECRET = "ct-industrial-v1";

/**
 * High-performance compressed and encrypted cache for heavy analysis results.
 * Uses idb for IndexedDB, lz-string for compression, and AES-GCM for security.
 */
export class AnalysisCache {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private secret: string;

  constructor(secret = DEFAULT_SECRET) {
    this.secret = secret;
  }

  private getDB(): Promise<IDBPDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof indexedDB === "undefined") {
      return Promise.reject(new Error("IndexedDB is not available"));
    }

    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
    return this.dbPromise;
  }

  /**
   * Compresses and stores an encrypted result for a given key.
   */
  async set(key: string, value: any): Promise<void> {
    if (typeof window === "undefined" || typeof indexedDB === "undefined")
      return;
    try {
      const db = await this.getDB();
      const jsonStr = JSON.stringify(value);
      const compressed = LZString.compressToUTF16(jsonStr);
      const encrypted = await encryptToken(compressed, this.secret);
      await db.put(STORE_NAME, encrypted, key);
    } catch (error) {
      console.warn("[AnalysisCache] Failed to store result:", error);
    }
  }

  /**
   * Retrieves, decrypts and decompresses a result for a given key.
   */
  async get<T>(key: string): Promise<T | null> {
    if (typeof window === "undefined" || typeof indexedDB === "undefined")
      return null;
    try {
      const db = await this.getDB();
      const encrypted = await db.get(STORE_NAME, key);
      if (!encrypted) return null;

      const compressed = await decryptToken(encrypted, this.secret);
      const decompressed = LZString.decompressFromUTF16(compressed);
      if (!decompressed) return null;
      return JSON.parse(decompressed) as T;
    } catch (error) {
      console.warn("[AnalysisCache] Failed to retrieve result:", error);
      return null;
    }
  }

  /**
   * Clears a specific key from the cache.
   */
  async delete(key: string): Promise<void> {
    if (typeof window === "undefined" || typeof indexedDB === "undefined")
      return;
    try {
      const db = await this.getDB();
      await db.delete(STORE_NAME, key);
    } catch (error) {
      console.warn("[AnalysisCache] Failed to delete result:", error);
    }
  }

  /**
   * Generates a simple hash for a value to use as a key.
   */
  static generateKey(value: any): string {
    const str = JSON.stringify(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `analysis_${hash}`;
  }
}

export const analysisCache = new AnalysisCache();
