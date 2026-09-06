import NodeCache from "node-cache";
import { redis, isRedisAvailable } from "../../config/redis.js";
import { logger } from "../../config/logger.js";

export interface CacheOptions {
  /** Time to live in seconds. Default: 300 (5 minutes) */
  ttlSeconds?: number;
  /** Cache tier to target. Default: "hybrid" (L1 + L2) */
  tier?: "l1-only" | "l2-only" | "hybrid";
  /** Invalidation tags attached to this cache key */
  tags?: string[];
}

export interface MultiTierCacheConfig {
  defaultTtlSeconds?: number;
  checkperiodSeconds?: number;
  keyPrefix?: string;
}

/**
 * Multi-Tier Hybrid Cache Manager
 * - L1: In-memory LRU (node-cache) for ultra-fast <1ms lookups of static/reference data
 * - L2: Redis Cache-Aside with tag-based invalidation for dynamic entities
 * - Resilient: Automatically degrades to L1 when Redis is unavailable
 */
export class MultiTierCache {
  private l1: NodeCache;
  private prefix: string;
  private defaultTtl: number;
  // Map of tag -> Set of L1 cache keys
  private l1Tags: Map<string, Set<string>> = new Map();

  constructor(config?: MultiTierCacheConfig) {
    this.defaultTtl = config?.defaultTtlSeconds ?? 300;
    this.prefix = config?.keyPrefix ?? "atlas:cache:";
    this.l1 = new NodeCache({
      stdTTL: this.defaultTtl,
      checkperiod: config?.checkperiodSeconds ?? 60,
      useClones: false,
    });

    // Cleanup expired keys from L1 tag index
    this.l1.on("expired", (key: string) => {
      this.removeKeyFromL1Tags(key);
    });
    this.l1.on("del", (key: string) => {
      this.removeKeyFromL1Tags(key);
    });
  }

  private prefixedKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private tagKey(tag: string): string {
    return `${this.prefix}tags:${tag}`;
  }

  private registerL1Tags(key: string, tags?: string[]) {
    if (!tags || tags.length === 0) return;
    for (const tag of tags) {
      let set = this.l1Tags.get(tag);
      if (!set) {
        set = new Set();
        this.l1Tags.set(tag, set);
      }
      set.add(key);
    }
  }

  private removeKeyFromL1Tags(key: string) {
    for (const [, set] of this.l1Tags.entries()) {
      set.delete(key);
    }
  }

  /**
   * Get an item from cache (checking L1 first, then L2)
   */
  async get<T>(
    key: string,
    tier: "l1-only" | "l2-only" | "hybrid" = "hybrid",
  ): Promise<T | null> {
    // 1. Try L1 Cache
    if (tier !== "l2-only") {
      const l1Val = this.l1.get<T>(key);
      if (l1Val !== undefined) {
        return l1Val;
      }
    }

    // 2. Try L2 Cache (Redis)
    if (tier !== "l1-only" && isRedisAvailable && redis) {
      try {
        const raw = await redis.get(this.prefixedKey(key));
        if (raw !== null) {
          const parsed = JSON.parse(raw) as T;
          // Populate L1 cache for subsequent fast reads
          if (tier === "hybrid") {
            this.l1.set(key, parsed, this.defaultTtl);
          }
          return parsed;
        }
      } catch (err) {
        logger.warn(
          { err, key },
          "MultiTierCache: Redis read failed, falling back to null",
        );
      }
    }

    return null;
  }

  /**
   * Set an item into cache (L1, L2, or both)
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttlSeconds ?? this.defaultTtl;
    const tier = options?.tier ?? "hybrid";
    const tags = options?.tags;

    // 1. Write to L1
    if (tier !== "l2-only") {
      this.l1.set(key, value, ttl);
      this.registerL1Tags(key, tags);
    }

    // 2. Write to L2
    if (tier !== "l1-only" && isRedisAvailable && redis) {
      try {
        const pKey = this.prefixedKey(key);
        const serialized = JSON.stringify(value);
        if (ttl > 0) {
          await redis.set(pKey, serialized, "EX", ttl);
        } else {
          await redis.set(pKey, serialized);
        }

        // Register tags in Redis Sets
        if (tags && tags.length > 0) {
          const pipeline = redis.pipeline();
          for (const tag of tags) {
            pipeline.sadd(this.tagKey(tag), pKey);
            if (ttl > 0) {
              pipeline.expire(this.tagKey(tag), Math.max(ttl * 2, 86400));
            }
          }
          await pipeline.exec();
        }
      } catch (err) {
        logger.warn(
          { err, key },
          "MultiTierCache: Redis write failed, continuing with L1",
        );
      }
    }
  }

  /**
   * Delete a key from L1 and L2
   */
  async delete(key: string): Promise<void> {
    this.l1.del(key);
    this.removeKeyFromL1Tags(key);

    if (isRedisAvailable && redis) {
      try {
        await redis.del(this.prefixedKey(key));
      } catch (err) {
        logger.warn({ err, key }, "MultiTierCache: Redis delete failed");
      }
    }
  }

  /**
   * Invalidate all keys associated with one or more tags
   */
  async invalidateTags(tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) return;

    for (const tag of tags) {
      // Invalidate in L1
      const keys = this.l1Tags.get(tag);
      if (keys) {
        for (const k of keys) {
          this.l1.del(k);
        }
        this.l1Tags.delete(tag);
      }

      // Invalidate in L2
      if (isRedisAvailable && redis) {
        try {
          const tKey = this.tagKey(tag);
          const taggedKeys: string[] = await redis.smembers(tKey);
          if (taggedKeys && taggedKeys.length > 0) {
            const pipeline = redis.pipeline();
            for (const k of taggedKeys) {
              pipeline.del(k);
            }
            pipeline.del(tKey);
            await pipeline.exec();
          }
        } catch (err) {
          logger.warn(
            { err, tag },
            "MultiTierCache: Redis tag invalidation failed",
          );
        }
      }
    }
  }

  /**
   * Cache-Aside helper: Returns cached item, or invokes fetcher, caches result, and returns it.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key, options?.tier);
    if (cached !== null) {
      return cached;
    }

    const freshValue = await fetcher();
    if (freshValue !== undefined && freshValue !== null) {
      await this.set<T>(key, freshValue, options);
    }
    return freshValue;
  }

  /**
   * Clear all L1 cache keys
   */
  clearL1(): void {
    this.l1.flushAll();
    this.l1Tags.clear();
  }
}

/** Global default cache instance */
export const multiTierCache = new MultiTierCache({
  defaultTtlSeconds: 300,
  keyPrefix: "atlas:cache:",
});
