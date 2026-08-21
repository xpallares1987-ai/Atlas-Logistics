import { FastifyRequest, FastifyReply } from "fastify";
import { z, AnyZodObject } from "zod";

export const validate = (schema: AnyZodObject) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const shape = (schema as any).shape;
      if (shape && ("body" in shape || "query" in shape || "params" in shape)) {
        await schema.parseAsync({
          body: request.body,
          query: request.query,
          params: request.params,
        });
      } else {
        // Direct schema: validate params if matching, else validate body / query
        if (
          request.params &&
          Object.keys(request.params as object).length > 0
        ) {
          const paramsResult = schema.safeParse(request.params);
          if (paramsResult.success) {
            return;
          }
        }
        if (request.body !== undefined && request.body !== null) {
          await schema.parseAsync(request.body);
        } else if (
          request.query &&
          Object.keys(request.query as object).length > 0
        ) {
          await schema.parseAsync(request.query);
        } else if (request.params) {
          await schema.parseAsync(request.params);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: "Validation failed",
          issues: error.issues,
        });
        throw new Error("Validation failed");
      }
      reply.code(400).send({ success: false, error: "Bad Request" });
      throw new Error("Bad Request");
    }
  };
};
