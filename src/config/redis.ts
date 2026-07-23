// @ts-ignore
import { Redis } from "ioredis";
import { logger } from "./logger.js";

// Si no hay variables de entorno (ej. entorno local), usamos localhost
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;

export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  lazyConnect: true,
  // Retry strategy básico para soportar caídas temporales de red en Cloud Run
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on("error", (error: any) => {
  logger.error(error, "Redis Connection Error:");
});

export const connectRedis = async () => {
  try {
    await redis.connect();
    logger.info(`Conectado a Redis en ${REDIS_HOST}:${REDIS_PORT}`);
  } catch (error) {
    logger.warn("No se pudo conectar a Redis. El sistema funcionará degradado (sin caché).");
  }
};
