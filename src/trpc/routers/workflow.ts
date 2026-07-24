import { z } from "zod";
import { router, publicProcedure } from "../trpc.js";
import { db } from "../../db/db.config.js";
import { workflowDefinitions } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const workflowRouter = router({
  saveDefinition: publicProcedure
    .input(
      z.object({
        name: z.string(),
        xmlData: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Check if it exists
      const existing = await db
        .select()
        .from(workflowDefinitions)
        .where(eq(workflowDefinitions.name, input.name))
        .limit(1);

      if (existing.length > 0) {
        // Update
        const updated = await db
          .update(workflowDefinitions)
          .set({
            xmlData: input.xmlData,
            version: existing[0].version + 1,
            updatedAt: new Date(),
          })
          .where(eq(workflowDefinitions.id, existing[0].id))
          .returning();
        return updated[0];
      } else {
        // Insert
        const inserted = await db
          .insert(workflowDefinitions)
          .values({
            name: input.name,
            xmlData: input.xmlData,
          })
          .returning();
        return inserted[0];
      }
    }),

  getDefinition: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const existing = await db
        .select()
        .from(workflowDefinitions)
        .where(eq(workflowDefinitions.name, input.name))
        .limit(1);
      return existing[0] || null;
    }),
});
