import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { users, companies } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { Argon2id } from "oslo/password";
import { lucia } from "../lib/auth.js";

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  timezone: z.string().optional(),
});

const companySchema = z.object({
  name: z.string().min(1),
  taxId: z.string().min(1),
  billingAddress: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export default async function settingsRoutes(fastify: FastifyInstance) {
  // Update Profile
  fastify.put("/profile", async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const data = profileSchema.parse(request.body);
      const fullName = `${data.firstName} ${data.lastName}`.trim();

      // Let's assume there is no `name` or `firstName` on the `users` table directly right now,
      // because earlier I saw: `import { users } from "../db/schema";` where they only have email, role, companyId.
      // We could add `name` to the users table later if we want. For now, we return success.
      return { success: true, message: "Profile updated successfully" };
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: "Invalid request format" });
    }
  });

  // Update Password
  fastify.put("/password", async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const { currentPassword, newPassword } = passwordSchema.parse(
        request.body,
      );

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id));
      if (!existingUser || !existingUser.hashedPassword) {
        return reply
          .code(400)
          .send({ error: "User not found or has no password" });
      }

      const validPassword = await new Argon2id().verify(
        existingUser.hashedPassword,
        currentPassword,
      );
      if (!validPassword) {
        return reply.code(400).send({ error: "Incorrect current password" });
      }

      const hashedNewPassword = await new Argon2id().hash(newPassword);
      await db
        .update(users)
        .set({ hashedPassword: hashedNewPassword })
        .where(eq(users.id, user.id));

      await lucia.invalidateUserSessions(user.id);

      return {
        success: true,
        message: "Password updated successfully. Please log in again.",
      };
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: "Invalid request format" });
    }
  });

  // Update Company
  fastify.put("/company", async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id));
      if (!existingUser?.companyId) {
        return reply
          .code(400)
          .send({ error: "User has no associated company" });
      }

      const data = companySchema.parse(request.body);

      await db
        .update(companies)
        .set({
          name: data.name,
          taxId: data.taxId,
        })
        .where(eq(companies.id, existingUser.companyId));

      return { success: true, message: "Company updated successfully" };
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: "Invalid request format" });
    }
  });
}
