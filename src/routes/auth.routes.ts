import { FastifyInstance } from "fastify";
import { z } from "zod";
import { lucia } from "../lib/auth.js";
import { db } from "../db/index.js";
import { users } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { Argon2id } from "oslo/password";
import { generateId } from "lucia";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/signup", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);
      const hashedPassword = await new Argon2id().hash(password);
      const userId = generateId(15);
      
      await db.insert(users).values({
        id: userId,
        email,
        hashedPassword,
        role: "CUSTOMER"
      });

      const session = await lucia.createSession(userId, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      
      reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
      return { success: true, message: "Usuario creado" };
    } catch (error) {
      console.error(error);
      return reply.code(400).send({ error: "Error creando usuario o email duplicado" });
    }
  });

  fastify.post("/login", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password } = z
        .object({
          email: z.string().email(),
          password: z.string().min(1),
        })
        .parse(request.body);
      
      const [existingUser] = await db.select().from(users).where(eq(users.email, email));
      if (!existingUser || !existingUser.hashedPassword) {
        return reply.code(401).send({ error: "Credenciales inválidas" });
      }

      const validPassword = await new Argon2id().verify(existingUser.hashedPassword, password);
      if (!validPassword) {
        return reply.code(401).send({ error: "Credenciales inválidas" });
      }

      const session = await lucia.createSession(existingUser.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      
      reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
      return { success: true, message: "Autenticado correctamente" };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: "Formato de petición inválido" });
      }
      request.log.error(error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });

  fastify.post("/logout", async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.code(401).send({ error: "No autorizado" });
    }
    
    await lucia.invalidateSession(sessionId);
    const sessionCookie = lucia.createBlankSessionCookie();
    reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    
    return { success: true, message: "Sesión cerrada" };
  });

  fastify.get("/me", async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
      return { user: null };
    }

    if (session && session.fresh) {
      const sessionCookie = lucia.createSessionCookie(session.id);
      reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    }

    return { user };
  });
}
