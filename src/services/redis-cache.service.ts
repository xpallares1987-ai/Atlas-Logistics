import { Redis } from 'ioredis';
import { env } from '../core/config.js';

export const redis = new Redis(env.REDIS_URL);

redis.on('error', (err) => {
  console.error('[Redis Error]', err);
});

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) as T : null;
};

export const setCachedData = async <T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> => {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
};

export const invalidateCache = async (pattern: string): Promise<void> => {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};