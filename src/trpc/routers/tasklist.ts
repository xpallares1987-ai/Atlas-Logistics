/* eslint-disable */
// @ts-nocheck
import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { db } from "../../db/db.config.js";
import { workflowTasks, workflows } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { completeUserTask } from "../../bpm/workflow-engine.service.js";

export const tasklistRouter = router({
  getPendingTasks: publicProcedure.query(async () => {
    // Fetch all pending tasks
    const tasks = await db
      .select({
        id: workflowTasks.id,
        workflowId: workflowTasks.workflowId,
        taskType: workflowTasks.taskType,
        status: workflowTasks.status,
        createdAt: workflowTasks.createdAt,
        workflowName: workflows.name,
        context: workflows.context,
      })
      .from(workflowTasks)
      .leftJoin(workflows, eq(workflowTasks.workflowId, workflows.id))
      .where(eq(workflowTasks.status, "PENDING"))
      .orderBy(desc(workflowTasks.createdAt));

    return tasks;
  }),

  completeTask: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        variables: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await completeUserTask(input.taskId, input.variables || {});
      return { success: true };
    }),
});
