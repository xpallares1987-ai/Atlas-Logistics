import { router } from "../trpc.js";
import { healthRouter } from "./health.js";

// Este será el AppRouter principal que exportaremos al frontend
export const appRouter = router({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
