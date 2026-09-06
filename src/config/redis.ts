import { Redis } from "ioredis";
import { logger } from "./logger.js";

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = process.env.REDIS_PORT
  ? parseInt(process.env.REDIS_PORT, 10)
  : 6379;

const isProduction = process.env.NODE_ENV === "production";
const isExplicitMock = process.env.USE_REDIS_MOCK === "true";
const isExplicitReal = process.env.USE_REDIS_MOCK === "false";
const isDockerOrRemote =
  !!process.env.REDIS_HOST &&
  process.env.REDIS_HOST !== "localhost" &&
  process.env.REDIS_HOST !== "127.0.0.1";

// Forced mock in dev/test unless REDIS_HOST is explicitly provided and not localhost,
// or unless running in production or USE_REDIS_MOCK is explicitly "false"
export const USE_MOCK =
  !isProduction &&
  !isExplicitReal &&
  (isExplicitMock || !isDockerOrRemote);

export let isRedisAvailable = false;

let redisClient: Redis;

if (USE_MOCK) {
  try {
    const mod = await import("ioredis-mock");
    const RedisMock = (mod as any).default || mod;
    redisClient = new (RedisMock as any)();
  } catch (error) {
    logger.warn(
      error,
      "ioredis-mock could not be loaded; falling back to standard Redis client.",
    );
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 50, 2000);
      },
    });
  }
} else {
  redisClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    lazyConnect: true,
    maxRetriesPerRequest: null,
    // Retry strategy básico para soportar caídas temporales de red en Cloud Run
    retryStrategy(times: number) {
      if (times > 3) {
        return null; // Stop retrying after 3 attempts
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
}

export const redis = redisClient;

redis.on("error", (error: any) => {
  logger.error(error, "Redis Connection Error:");
});

export const connectRedis = async () => {
  try {
    if (USE_MOCK) {
      isRedisAvailable = true;
      logger.info(
        "Conectado a Redis Mock (ioredis-mock) en memoria. Entorno sin Redis local.",
      );
      return;
    }
    await redis.connect();
    isRedisAvailable = true;
    logger.info(`Conectado a Redis en ${REDIS_HOST}:${REDIS_PORT}`);
  } catch (error) {
    isRedisAvailable = false;
    const message =
      "No se pudo conectar a Redis. El sistema funcionará degradado (sin caché y simulando BullMQ en memoria local).";
    logger.warn(message);

    // In production, require Redis to be available
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Redis connection failed in production. Redis is required.",
      );
    }
  }
};
