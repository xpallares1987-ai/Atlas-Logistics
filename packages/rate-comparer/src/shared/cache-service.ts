// @ts-nocheck
import { SharedDatabase } from "./db";
import { decryptToken } from "./crypto";
import { publishEvent } from "./broadcast-service";

let dbInstance: SharedDatabase | null = null;

function getDb(): SharedDatabase {
  if (!dbInstance) {
    dbInstance = new SharedDatabase("ControlTowerDB");
  }
  return dbInstance;
}

export async function getCachedXml(key: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const db = getDb();
    const cached = await db.xmlCache.get(key);
    return cached ? cached.content : null;
  } catch (error) {
    console.warn("Failed to retrieve cached XML from IndexedDB:", error);
    return null;
  }
}

export async function setCachedXml(
  key: string,
  content: string,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = getDb();
    await db.xmlCache.put({
      key,
      content,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.warn("Failed to save cached XML to IndexedDB:", error);
  }
}

export async function invalidateCachedXml(key: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = getDb();
    await db.xmlCache.delete(key);
  } catch (error) {
    console.warn("Failed to delete cached XML from IndexedDB:", error);
  }
}

export interface SWRConfig<T> {
  key: string;
  filePaths: string[];
  pin?: string;
  parser: (content: string) => Promise<T>;
  onCacheUpdated?: (data: T) => void;
}

export async function swrFetch<T>(config: SWRConfig<T>): Promise<T | null> {
  const {
    key,
    filePaths,
    pin = "ControlTowerSecretPIN",
    parser,
    onCacheUpdated,
  } = config;

  if (typeof window === "undefined") {
    return null; // Server action or SSR fallback
  }

  // 1. Get cached XML from IndexedDB
  let cached: string | null = null;
  try {
    cached = await getCachedXml(key);
  } catch (err) {
    console.warn("SWR cache lookup failed:", err);
  }

  // 2. Define background revalidator
  const runBackgroundRevalidation = async () => {
    for (const path of filePaths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const rawText = await response.text();
          let decryptedText = rawText;
          if (rawText && !rawText.trim().startsWith("<")) {
            try {
              decryptedText = await decryptToken(rawText, pin);
            } catch (decError) {
              console.warn("SWR revalidation decryption failed:", decError);
            }
          }
          if (decryptedText && decryptedText !== cached) {
            await setCachedXml(key, decryptedText);
            const parsed = await parser(decryptedText);
            if (onCacheUpdated) {
              onCacheUpdated(parsed);
            }
            // Also notify globally using BroadcastChannel
            publishEvent({
              type: "XML_CACHE_UPDATED",
              payload: { key, isNew: !cached },
            });
          }
          return decryptedText;
        }
      } catch {
        // Skip path
      }
    }
    return null;
  };

  // 3. Return cached data immediately if present and kick off revalidation in background
  if (cached) {
    runBackgroundRevalidation().catch(() => {});
    return await parser(cached);
  }

  // 4. Block on network fetch if cache is empty
  const freshRaw = await runBackgroundRevalidation();
  return freshRaw ? await parser(freshRaw) : null;
}

