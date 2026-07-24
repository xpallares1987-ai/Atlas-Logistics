import { router } from "../trpc.js";
import { healthRouter } from "./health.js";
import { workflowRouter } from "./workflow.js";
import { tasklistRouter } from "./tasklist.js";
import { shipmentsRouter } from "./shipments.js";

// Este será el AppRouter principal que exportaremos al frontend
export const appRouter = router({
  health: healthRouter,
  workflow: workflowRouter,
  tasklist: tasklistRouter,
  shipments: shipmentsRouter,
});

export type AppRouter = typeof appRouter;
