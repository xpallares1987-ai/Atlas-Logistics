import { Redis } from "ioredis";
import { logger } from "./logger.js";

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = process.env.REDIS_PORT
  ? parseInt(process.env.REDIS_PORT, 10)
  : 6379;

const isExplicitMock = process.env.USE_REDIS_MOCK === "true";
const isExplicitReal = process.env.USE_REDIS_MOCK === "false";
const isDockerOrRemote =
  (!!process.env.REDIS_HOST &&
    process.env.REDIS_HOST !== "localhost" &&
    process.env.REDIS_HOST !== "127.0.0.1") ||
  Boolean(process.env.REDIS_URL);

// Use in-memory Redis mock unless an explicit remote/Docker Redis endpoint is configured
// or USE_REDIS_MOCK is explicitly set to "false"
export const USE_MOCK =
  !isExplicitReal && (isExplicitMock || !isDockerOrRemote);

export let isRedisAvailable = false;

let redisClient: Redis;
let connectionPromise: Promise<void> | null = null;

if (USE_MOCK) {
  try {
    const mod = await import("ioredis-mock");
    const RedisMock = (mod as any).default || mod;
    redisClient = new (RedisMock as any)();
  } catch (error) {
    logger.warn(
      { err: error },
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
    // Retry strategy to support temporary network failures
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
  logger.error({ err: error }, "Redis Connection Error");
});

export const connectRedis = async () => {
  // Prevent concurrent connection attempts (race condition fix)
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      if (USE_MOCK) {
        isRedisAvailable = true;
        logger.info(
          "Using Redis Mock (ioredis-mock) in memory. Local environment without Redis.",
        );
        return;
      }

      if (redis.status === "ready") {
        isRedisAvailable = true;
        logger.info(`Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
        return;
      }

      if (redis.status === "connecting" || redis.status === "connect") {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Redis connection timeout"));
          }, 5000);
          const onReady = () => {
            cleanup();
            resolve();
          };
          const onError = (err: any) => {
            cleanup();
            reject(err);
          };
          const cleanup = () => {
            clearTimeout(timeout);
            redis.off("ready", onReady);
            redis.off("error", onError);
          };
          redis.once("ready", onReady);
          redis.once("error", onError);
        });
        isRedisAvailable = true;
        logger.info(`Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
        return;
      }

      await redis.connect();
      isRedisAvailable = true;
      logger.info(`Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
    } catch (error: any) {
      if (
        error?.message?.includes("already connecting") ||
        error?.message?.includes("already connected")
      ) {
        isRedisAvailable = true;
        return;
      }

      isRedisAvailable = false;

      // In production, require Redis to be available
      if (process.env.NODE_ENV === "production") {
        logger.error(
          { err: error },
          "FATAL: Redis connection failed in production. Cannot start without Redis.",
        );
        throw new Error(
          `Redis connection failed in production: ${error?.message || error}`,
        );
      }

      // In development, warn but continue with degraded functionality
      logger.warn(
        { err: error },
        "Redis is unavailable. System will function degraded (without caching and with in-memory job simulation).",
      );
    } finally {
      // Reset connection promise after first attempt completes
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};
