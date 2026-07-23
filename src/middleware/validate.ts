import { FastifyRequest, FastifyReply } from "fastify";
import { z, AnyZodObject } from "zod";

export const validate = (schema: AnyZodObject) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await schema.strict().parseAsync({
        body: request.body,
        query: request.query,
        params: request.params,
      });
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
