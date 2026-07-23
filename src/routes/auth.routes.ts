import { FastifyInstance } from "fastify";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/login", async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);
      
      // MOCK: Validación muy básica. En un entorno real se compara hash con la BD.
      if (password !== "password123") {
        return reply.code(401).send({ error: "Credenciales inválidas" });
      }

      // Generar JWT
      const token = fastify.jwt.sign({ 
        email, 
        sub: "usr_mock",
        role: "ADMIN"
      }, { expiresIn: '8h' });

      // Enviar como HttpOnly Cookie
      reply.setCookie("token", token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 8 * 60 * 60, // 8 hours
      });

      return { success: true, message: "Autenticado correctamente" };
    } catch (error) {
      return reply.code(400).send({ error: "Formato de petición inválido" });
    }
  });

  fastify.post("/logout", async (request, reply) => {
    reply.clearCookie("token", { path: "/" });
    return { success: true, message: "Sesión cerrada" };
  });
}
