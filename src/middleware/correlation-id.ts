import { FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";

/**
 * Add request correlation ID to each request for distributed tracing.
 * Ensures all logs from a single request can be correlated.
 */
export const correlationIdPlugin = async (fastify: any) => {
  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Use existing X-Request-ID header if present, otherwise generate a new one
      const requestId =
        (request.headers["x-request-id"] as string) ||
        (request.headers["x-correlation-id"] as string) ||
        uuidv4();

      // Attach to request for use in handlers
      (request as any).id = requestId;

      // Add to response headers for client tracking
      reply.header("X-Request-ID", requestId);
      reply.header("X-Correlation-ID", requestId);

      // Store in request context for logging
      request.log = request.log.child({ requestId });
    },
  );
};

export default correlationIdPlugin;
