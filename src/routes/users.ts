import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
const userRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/api/users",
    {
      schema: {
        description: "Get all users",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.number(),
                username: z.string(),
                email: z.string(),
                role: z.string(),
                carrier_id: z.number().nullable(),
                created_at: z.string(),
              }),
            ),
          }),
        },
      },
      onRequest: [(server as any).authenticate],
    },
    async () => {
      const allUsers = await db.select().from(users);
      return {
        data: allUsers.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          carrier_id: u.carrier_id,
          created_at: u.created_at.toISOString(),
        })),
      };
    },
  );

  server.patch(
    "/api/users/:id/status",
    {
      schema: {
        description: "Toggle user status between ACTIVE and INACTIVE",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string() }),
        body: z.object({
          status: z.enum(["ACTIVE", "INACTIVE"]),
        }),
      },
      onRequest: [(server as any).authenticate],
    },
    async () => {
      // Note: users table doesn't yet have a status column; returns success stub.
      return { success: true };
    },
  );
};

export default userRoutes;
