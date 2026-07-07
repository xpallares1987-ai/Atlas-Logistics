import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Initialize Redis only if we are in production or explicitly requested
// For local development without Redis, we can mock it or disable caching
let redis: Redis | null = null;

try {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redis.on("error", (err) => {
    console.warn("Redis Connection Error (Caching disabled):", err.message);
  });
} catch {
  console.warn("Failed to initialize Redis. Caching will be disabled.");
}

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!redis) return;
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // Ignore cache set errors
    }
  },

  async del(key: string): Promise<void> {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch {
      // Ignore cache del errors
    }
  },
};
