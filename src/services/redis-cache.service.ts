import { Redis } from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL as string);

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