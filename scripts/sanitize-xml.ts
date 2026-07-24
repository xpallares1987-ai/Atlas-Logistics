import { db } from "../src/db/db.config.js";
import { workflowDefinitions } from "../src/db/schema.js";
import { logger } from "../src/config/logger.js";
import { eq } from "drizzle-orm";

async function sanitizeXml() {
  logger.info("Starting XML sanitation process...");
  try {
    const definitions = await db.select().from(workflowDefinitions);
    let updatedCount = 0;

    for (const def of definitions) {
      if (def.xmlData) {
        // Strip out zeebe:taskDefinition and zeebe: namespaces
        let sanitizedXml = def.xmlData
          .replace(/<zeebe:taskDefinition[^>]*\/>/g, "")
          .replace(
            /<zeebe:taskDefinition[^>]*>.*?<\/zeebe:taskDefinition>/gs,
            "",
          )
          // Strip out zeebe namespaces from bpmn:definitions
          .replace(/\sxmlns:zeebe="[^"]*"/g, "");

        if (sanitizedXml !== def.xmlData) {
          logger.info(`Sanitizing definition ${def.id} (${def.name})...`);
          await db
            .update(workflowDefinitions)
            .set({ xmlData: sanitizedXml })
            .where(eq(workflowDefinitions.id, def.id));
          updatedCount++;
        }
      }
    }

    logger.info(
      `XML sanitation complete. Updated ${updatedCount} definitions.`,
    );
  } catch (error) {
    logger.error("Error during XML sanitation:", error);
  } finally {
    process.exit(0);
  }
}

sanitizeXml();
