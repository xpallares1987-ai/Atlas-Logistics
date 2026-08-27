import { Redis } from "ioredis";
import RedisMock from "ioredis-mock";
import { logger } from "./logger.js";

// Forced mock in dev unless REDIS_HOST is explicitly provided and not localhost
const USE_MOCK =
  process.env.NODE_ENV !== "production" &&
  process.env.USE_REDIS_MOCK !== "false";

export let isRedisAvailable = false;

// Si no hay variables de entorno (ej. entorno local), usamos localhost
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = process.env.REDIS_PORT
  ? parseInt(process.env.REDIS_PORT, 10)
  : 6379;

export const redis = USE_MOCK
  ? new (RedisMock as any)()
  : new Redis({
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
    logger.warn(
      "No se pudo conectar a Redis. El sistema funcionará degradado (sin caché y simulando BullMQ en memoria local).",
    );
  }
};
