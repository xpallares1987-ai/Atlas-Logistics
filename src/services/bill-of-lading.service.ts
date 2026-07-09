import { db } from "../db/client.js";
import { bill_of_ladings } from "../db/schema-documents.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export const createBillOfLadingVersion = async (
  shipmentId: number,
  shipper: string,
  consignee: string,
  cargoDetails: string,
  previousVersionId?: string,
) => {
  return await db.transaction(async (tx) => {
    const newVersionId = randomUUID();
    let versionNumber = 1;

    if (previousVersionId) {
      const prevDocQuery = await tx
        .select()
        .from(bill_of_ladings)
        .where(eq(bill_of_ladings.id, previousVersionId))
        .limit(1);

      if (prevDocQuery.length > 0) {
        versionNumber = prevDocQuery[0].version + 1;
      }

      await tx
        .update(bill_of_ladings)
        .set({ is_active: false })
        .where(eq(bill_of_ladings.id, previousVersionId));
    }

    await tx.insert(bill_of_ladings).values({
      id: newVersionId,
      shipment_id: shipmentId,
      version: versionNumber,
      shipper: shipper,
      consignee: consignee,
      cargo_details: cargoDetails,
      previous_version_id: previousVersionId || null,
      is_active: true,
    });

    return newVersionId;
  });
};
