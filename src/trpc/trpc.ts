import { initTRPC, TRPCError } from "@trpc/server";
import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { db } from "../db/db.config.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

// Creamos un contexto básico que extrae la request y reply de Fastify
export async function createContext({ req, res }: CreateFastifyContextOptions) {
  let user = null;
  const reqAny = req as any;
  if (reqAny.user && reqAny.user.email) {
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.email, reqAny.user.email))
      .limit(1);
    if (dbUser.length > 0) {
      user = dbUser[0];
    }
  }
  return { req, res, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
